# DECISIONS.md — verse-profiteer

Ratified architecture decisions. An entry here is LOCKED — decided, justified, and safe to build on. Escalation-class changes (persistence, caching cadence, ranking math, ROI math, auth) get an entry here BEFORE implementation, so there is no drift between a decision made in chat and what ships.

Format per decision: what was decided, why, what class it falls in, status.

---

## D1 — Postgres persistence for operator data
**Decided:** 2026-06-03. **Class:** persistence / architecture. **Status:** RATIFIED, unbuilt.

Operator data — saved plans, flight history, derived stats — lives in Postgres. Justified by persistent history and user stats surviving sessions. NOT justified by rate limits (see D2 correction). Operator has already built and run this exact stack (FastAPI + Postgres + Railway) on a prior project, so infra cost and complexity are not a barrier. Stack is all-TypeScript: Vercel Cron → Next route handler → Postgres. GOATS patterns reused (pooling, JSONB blob storage, scheduled refresh, tenant_id identity column), reimplemented in TS — not its Python runtime. The CLAUDE.md deploy-model section stays valid; the Postgres/Cron persistence layer is added to it.

## D2 — UEX mirror refresh cadence
**Decided:** 2026-06-03. **Class:** caching-TTL (escalation-gated). **Status:** RATIFIED, unbuilt.

The UEX dataset is mirrored in Postgres and refreshed by a scheduled background job, not on user page-loads. Cadence matches UEX upstream caches: prices ~5min, terminals ~12h, routes ~30min. Routes use a BLIND ~30-min poll — the probe (2026-06-03) confirmed commodities_routes rows carry NO date_modified, so refresh-on-change is not possible; date_added is row-creation, not freshness. Routes are fetched by paced fan-out (one call per id_commodity, ~122 calls) throttled under the 120/min cap (~1 call/600ms, about 75s total). The shared cap gets SAFER, not riskier: user loads read Postgres and stop hitting UEX; only the one paced job touches UEX. Any change to this cadence is caching-TTL-class — escalate before prompting.

CORRECTION RECORDED: the belief that changing filters (systems / auto-load / ship size) triggers fresh UEX calls is FALSE. All three are applied in-memory after the cached fetch (verified in lib/routes.ts). Filter permutations cost zero new calls until TTL lapses. "Store UEX in DB to avoid rate limits" was therefore dropped as a reason for D1 — but it pointed at the real adjacent problem D3 fixes.

AMENDED 2026-06-07 (SUPERSEDED — see correction below) — cadence stays at 30 min, based on an 8-min snapshot since shown to be unrepresentative. Measurements 2026-06-07:
- (a) Price staleness: median commodities_prices_all date_modified age ~1.2 days (p25 ~12 hr, p75 ~3.1 days, p90 ~6.6 days, oldest ~450 days), stable across two pulls anchored to known pull times. Only ~4% of price rows are under 3 hr old.
- (b) UEX route recompute: two commodities_routes (Titanium, id 75) pulls 8 min apart returned identical date_added (15:46:41 UTC) and identical 161-row sets — UEX recompute interval is >8 min, consistent with ~30 min or event-driven; not sub-10-min.
- (c) In that same 8-min window, 0 of 2,576 price rows changed.

Conclusion: the 30-min cron samples at roughly UEX's own route-recompute rate; polling faster fetches near-identical data and spends shared rate-cap budget for negligible freshness gain against day-scale price staleness. A finer-resolution probe (5-min cron) is running to confirm. Revisit only if the probe shows UEX recompute is sub-30-min, or if multi-user load changes rate-cap economics. The real accuracy lever is per-row staleness display + in-game price override, not cadence.

CORRECTED 2026-06-07 (overnight probe, 11.4 hr / 138 samples / 26 recompute events) — cadence changed 30 min -> 15 min.
- UEX recomputes commodities_routes on a ~15-min base cadence (median gap 16 min, hard floor 15 min, occasional 29-75 min gaps during low-activity overnight hours). The earlier 8-min snapshot landed inside one 15-min cycle and wrongly suggested a >=30-min / event-driven interval.
- The newest-price clock and the route-recompute clock move in lockstep, with a ~10-15 min lag from a price being logged to its inclusion in a recompute. So routes track prices promptly; routes are NOT a slow 30-min ceiling.
- Simulated extra mirror lag (on top of UEX-available data) by cron cadence: 30-min avg 8.3 min / p99 75 min; 15-min avg 1.8 min / p99 16 min; 10-min avg 3.0 min (worse than 15 due to phase misalignment with the 15-min cycle); 5-min avg 0.8 min / p99 16 min.
- Decision: 15-min cron. It matches UEX's recompute floor (catch nearly every recompute one cycle later). Polling faster than 15 cannot lower the worst case (bounded by UEX's own ~15-min-to-75-min gaps) and triples API volume for ~1 min average gain on data whose underlying prices are ~1.2 days old. 10 min is explicitly rejected (phase-misaligned, worse than 15). Below 15 reconsidered only if a daytime/peak sample shows UEX recomputing faster under load.
- Unchanged: this reduces controllable mirror lag only. Underlying crowdsourced price age (~1.2-day median) is untouched by cadence; per-row staleness display + in-game price override remain the dominant accuracy levers.
- Action: Railway worker cron set to */15 (was */30). priceRowCount was also observed growing 2576 -> 2588 overnight (UEX catalog additions); informational only.

## D3 — Full mirror replaces the top-35 shortlist trim
**Decided:** 2026-06-03. **Class:** ranking-math (escalation-gated). **Status:** RATIFIED, unbuilt.

Ranking and filtering run against the WHOLE mirrored routes dataset, not a top-35 slice taken before filters apply. The current board shortlists the top 35 commodities by raw margin BEFORE filters run, so the best route for a given ship/systems combination can be silently missing (a commodity ranked about 40 on raw margin could be the best realizable route for a specific ship and never enter the pool). Mirroring the whole dataset and ranking against all of it guarantees the best route per situation. This is a ranking-math-class change: REVIEW + VERIFY at merge, Pending VERIFICATIONS.md entry, spot-check a mirror row against a live UEX query.

CONSEQUENCE: because nothing computed is stored (see Spine Rule), ranking computes realizable profit across the full mirror at request time, every request. Cheap today (top-35, in-memory); heavier against the full dataset. Handled via indexed columns on ranking INPUTS in the mirror schema. The ranking path is now the performance-sensitive surface.

## D4 — Persistence layer: Drizzle ORM + Railway Postgres
**Decided:** 2026-06-04. **Class:** persistence / architecture. **Status:** RATIFIED, unbuilt.

- **ORM:** Drizzle, chosen for schema-as-TypeScript as a single source of truth for both migrations and the future typed query accessor (avoids SQL/types drift).
- **Driver:** node-postgres (pg) with a shared Pool, selected over postgres-js for better-documented Vercel serverless pooling and parity with prior GOATS pg.Pool usage.
- **Migration workflow:** generate + migrate (drizzle-kit). Never push — push is dev-only and this DB holds real data.
- **Schema location:** lib/db/schema.ts. Generated SQL: ./drizzle (committed, never hand-edited).
- **Mirror tables** (routes_mirror, terminals_mirror) are GLOBAL — no tenant_id. One UEX truth shared across all users. tenant_id belongs on the spine (operator data) only.
- **Hybrid table shape:** typed/indexed columns on ranking/filter/join inputs + raw jsonb (verbatim UEX row, source of truth) + refreshed_at.
- **container_sizes** stored as integer[], normalized from the UEX comma-string at refresh-write time (raw jsonb retains the original); normalization includes a defensive fallback to NULL on any unexpected token, never a silent drop or crash.
- **prices_mirror deferred:** D3 dissolves the margin shortlist that commodities_prices_all fed, leaving no consumer. Future price overrides are operator observations and belong on the spine, not this mirror.
- **DB client/pool module** deliberately not built in this beat — it lands with its first caller (the refresh job).
- **Connection:** Railway PUBLIC url (autorack.proxy.rlwy.net:PORT) is required for both local .env and Vercel, because both run outside Railway's network. The .railway.internal host does NOT resolve from Vercel or local and is unused by this project.

## D5 — Mirror worker runtime & Railway Postgres connection
**Decided:** 2026-06-06. **Class:** persistence / caching-infra. **Status:** RATIFIED, shipped + verified.

- Refresh worker runs as a Railway cron service (every 30 min), separate from the Vercel app. Vercel Hobby cron (once-daily) and 60s function limit make Vercel unsuitable for the ~100-130s paced fan-out.
- Connection: worker uses the Railway PUBLIC proxy URL with pg Pool ssl: { rejectUnauthorized: false }. Internal networking (postgres.railway.internal) produced ETIMEDOUT; the public proxy requires SSL or resets the connection (ECONNRESET at ~7s).
- A startup `select 1` probe is kept in the worker permanently — it isolates infrastructure failures from application/insert failures.
- Inserts are chunked at 100 rows/statement (terminals and routes both) to keep statement size bounded.
- Operational note: the original Postgres instance wedged into an "online but refuses all connections" state (Railway's own dashboard also could not connect; restart/redeploy did not recover it). Resolution was to delete and recreate the Postgres service — mirror data is regenerable cache, so zero data loss. If the same symptoms recur (probe ECONNRESET ~7s, dashboard "connection terminated unexpectedly"), suspect the DB instance, not the code; recreate rather than chasing code fixes.

## D6 — Lazy DB-init contract (lib/db never throws at import time)
**Decided:** 2026-06-07. **Class:** persistence / build-infra. **Status:** RATIFIED, shipped + verified.

lib/db must never throw at import time. The pg Pool and drizzle db are constructed lazily behind getPool()/getDb(); connection (and any missing-DATABASE_URL) errors surface on first USE, not at module load. Justification: import-time connection construction required DATABASE_URL to be present during Next build, CI test-load, and page-data collection — environments that import the module without ever issuing a query. That coupling caused the production Server Components render crash and the CI test-load failure. Deferring to first-use decouples import from connection, so build/CI/collection no longer need the env var.

ALTERNATIVE CONSIDERED AND REJECTED: move the whole app onto Railway as the app host (so the DB env is always present and internal). Rejected — it would discard the Vercel deploy/CI model for no benefit; the app is not a tight-loop DB consumer, so lazy init is sufficient and keeps the existing deploy pipeline intact.

## D7 — Loop planner objective is max aUEC/hr, and a leg must earn its place
**Decided:** 2026-06-08. **Class:** ranking-math (loop composer). **Status:** RATIFIED as design intent, unbuilt.

Surfaced by the loop plan-view spike (app/spike/loop, throwaway). The spike rendered a hand-authored 3-stop Stanton loop and exposed three things the eventual composer must encode:

- OBJECTIVE: the loop planner maximizes aUEC PER HOUR over a closed loop, NOT total aUEC. These diverge: max-total keeps every positive-profit leg (UEX fleet-gross behavior, wrong for a solo player whose time is the scarce resource); max-per-hour CUTS a thin leg when deadheading that segment raises the loop's hourly rate. The spike's 24,768 Aluminum leg (vs ~190k on the other two legs) is the worked example — it dragged the loop's hourly rate down, so the honest planner should recommend dropping it and flying empty. "Never deadhead" is a HEURISTIC, not a law; the planner must be willing to recommend an empty leg.

- LEG MODEL: a leg is NOT "stop A sells commodity X, stop B buys commodity Y." A leg is a FIXED origin→destination pair + the best-available cargo to carry across that pair + a verdict on whether carrying anything beats deadheading. The two prices at a node are independent (it is the sell terminal for the inbound commodity and the buy terminal for a different outbound commodity); a node being a good sell point says nothing about it being a good buy point. Per-leg profit is a property of the COMMODITY CARRIED between two stops, not of either stop. Edge profit = existing capacity-aware getTopRoutes ranking applied to a fixed pair instead of all pairs.

- TIME IS THE BLOCKER: aUEC/hr's denominator is time (travel + load + unload). Travel-time constants are still uncalibrated seeds (standing VERIFICATIONS calibration run, blocked on in-game measurement). A loop optimizer fed untrustworthy time estimates will confidently rank garbage loops. Therefore the per-hour objective CANNOT be the live ranking until travel time is calibrated.

BUILD-ORDER CONSEQUENCE (refined): rank by aUEC/hr from the start, treating the seed travel-time constants as an ORDINAL signal, not a cardinal one. Relative ranking holds because consistent-but-wrong constants cancel in the comparison — to order loops you need consistent time, not true time. THREE caveats define what waits for calibration:
(1) Do NOT display the hourly rate as a promised number — order by it, but show it as an estimate/ranking signal only, never a hard "X aUEC/hr" claim (same honesty rule as the price-age label: no confident number that has not earned its confidence).
(2) The cancel-out only holds for loops of SIMILAR time-composition. The time model is several constants with different shapes (QT scales with distance, spool is per-jump fixed, terminal overhead is per-stop fixed, load/unload scales with SCU), so a wrong constant does NOT scale uniformly across loops with different leg structures and can flip the ranking between a many-short-hops loop and a one-long-haul loop. Cross-shape ranking is therefore only trustworthy after calibration.
(3) Deadhead-vs-carry is an ABSOLUTE comparison (real credits vs estimated minutes), so do NOT auto-cut weak legs on seed constants — FLAG a weak leg for the user to judge instead of silently removing it.
Calibration upgrades all three: the rate becomes displayable as a real number, cross-shape rankings become trustworthy, and the planner can auto-recommend deadheads. This decouples the useful part (per-hour ordering of similar-shape loops, weak-leg flagging) from the one input the operator cannot currently collect (calibrated travel time), without ever displaying or acting on a number that has not earned its confidence.

ALGORITHM NOTE: max-ratio cycle is a hard (TSP-adjacent) class. Do NOT attempt a general optimum. Bounded loops (2-3 stops, possibly 4) within a single system are enumerable — enumerate and score. "Best 3-stop Stanton loop" is tractable; "best loop of any length across all systems" is out of scope.

The spike itself (app/spike/loop) is throwaway and should be deleted once these findings are captured — it is fake data and is currently live on the public deploy.

SOLE-USER NOTE: the operator is currently the only live user, which legitimately keeps debug surfaces ungated and auth/rate-sharing concerns out of scope. It does NOT relax the uncertainty-honesty framing above: verse-profiteer is also a public portfolio piece (a stranger hitting the deploy lacks the operator's context and will read an unlabeled rate as a hard claim), and future-operator will not remember which constants were seeds. The "estimate, not promise" rule therefore stays the default for displayed numbers regardless of current user count; sole-user simplification applies to access/infra ceremony, not to honest presentation of uncertain data.

## D9 — Product north star: a play-time trading companion (reshapes the spine's purpose)
**Decided:** 2026-06-08. **Class:** product direction. **Status:** RATIFIED as direction; informs spine schema design (next beat).

The operator articulated the end-state product: not a board you read before playing, but a companion you operate WHILE playing. The flow: wake up at a starting terminal → the tool routes from the player's current location (load cargo, or fly empty/deadhead to a pickup) → at each terminal the player enters the actual on-screen commodity prices and quantities → the tool recomputes/reroutes, taking into account what is currently in the ship's hold → repeat at each stop. This is the product the operator has always wanted; it is the steering target for all spine-era design decisions.

Three distinct capabilities, with very different costs:
1. PLAYER-LOCATION-ORIGIN ROUTING (+ deadhead option): anchor/filter ranking to a starting terminal; allow a zero-cargo positioning leg. Small — a constraint on existing ranking, no new data model. The shippable front edge, and a prerequisite for the live loop (a loop is location-origin routing where the location is "here, now").
2. MANUAL PRICE/QTY ENTRY as GROUND TRUTH (not "override"): the player on-site is the highest-quality price observer the tool can have. D8 proved UEX prices can be ~an hour stale while the route looks fresh; a freshly-entered observation SUPERSEDES UEX's crowdsourced value for that terminal. This reframes the backlog "user price overrides" item from a power-user toggle to a correctness feature for the moment of actual trading. Depends on the spine (entered observations need somewhere to live + a recompute path).
3. CARRY-AWARE REROUTING across a trip: "reroute given what I'm holding right now." This IS the cargo-ledger spine (Plan/Leg/Item with live carry-state) plus a re-plan trigger. Not a separate feature — it is the spine's ultimate purpose. Carry-state = the ledger.

SEQUENCING / TRAP TO AVOID: the "take a photo of the kiosk" framing implies OCR on the Star Citizen UI — an image-parsing reliability problem of its own. Do NOT build vision first. MANUAL ENTRY (type the values) delivers ~95% of the value at ~5% of the cost; OCR is a later input-adapter feeding the same entry-and-recompute path. Manual first; photos are a v2 input method, not the mechanism.

CONSEQUENCE FOR THE SPINE: design the spine to model a TRIP BEING ACTIVELY FLOWN — player enters observations at each stop, plan recomputes against current hold — not merely a precomputed loop. This is a sharper spec than "model a loop" and should be the frame for the upcoming schema-design session. The objective function (D7, max aUEC/hr, ordinal until calibration) and the leg model (best-cargo-for-a-fixed-pair + deadhead verdict) still hold; D9 adds the live/observed/carry-aware dimension on top.

## D10 — Cargo-ledger spine schema (Plan / Leg / Item / price_observations)
**Decided:** 2026-06-09. **Class:** persistence / data model. **Status:** RATIFIED; schema + migration shipped (0001).

The concrete spine implementing the Spine Rule (CLAUDE.md) and D9's trip-being-flown frame. Four tables in lib/db/schema.ts:

- plans — a trip. status draft/active/completed/abandoned; ship_capacity_scu (typed SCU input now, migrate to a ship reference when the ship picker lands — store the input you have today, not a FK to a table that doesn't exist); allowed_systems (text[], array for forward-compat); start_terminal_id; tenant_id (default 'operator', included now per D4 so multi-user later is not a migration touching every owned row, even though sole-user has no auth yet).
- legs — D7's atom: a FIXED origin->destination pair + chosen cargo (id_commodity, nullable = deadhead/undecided; the user's CHOICE is stored, the recommendation is derived) + source_activity (default 'trade'; mining/salvage/refining later — the loop-agnostic hook). NO status column: the cargo IS the lock. "Is this leg locked?" = "is its commodity currently in the hold?", derived from the ledger; a stored status would be a second source of truth for a derived fact (Spine Rule violation). A leg's destination is FIXED — carrying leftover cargo to a different buyer spawns a NEW leg, never mutates an executed leg's destination (keeps "where am I" unambiguous, keeps the re-router out of any leg with item events).
- items — the actuals ledger (the cargo tracker cornerstone): movement acquire/dispose, disposition sale/dump/loss (dispose only, for real P(loss) and leftovers), scu, unit_price (observed actual; null for mined/dumped/lost), fee (observed auto-load fee), id_terminal, occurred_at. Loop-agnostic: mined quantanium is an acquire with null unit_price. Chosen as the ACTUALS ledger, not a planned manifest, because a manifest cannot represent "bought 8, terminal took 6, holding 2" — and that leftover is exactly what carry-aware reroute reads.
- price_observations — manual ground-truth sightings (D9 cap. 2): price_buy/price_sell/scu_available at a (commodity, terminal), observed_at, source ('manual' now, 'ocr' later — OCR is a v2 input adapter into the same path, NOT built first). A sighting newer than UEX's date_modified supersedes UEX for ranking. Separate from items because you sight prices for commodities you don't transact, and sightings are reusable across plans. This is the home D4 anticipated for operator price overrides when prices_mirror was deferred.

ALL status/activity/disposition/source fields are plain text (validated in app code), NOT pgEnum — adding a loop or input source must not require an enum-alter migration.

DERIVED ON READ, never stored (Spine Rule): carry-state (sum acquire.scu - sum dispose.scu per commodity), realized profit (sum sale proceeds - sum acquire cost - sum fee), per-leg profit (from the leg's items), current position (terminal of the latest item event, else plan.start_terminal_id), locked-leg set (legs whose commodity is currently held), UEX estimate + estimate-vs-actual (against the current mirror — NOT snapshotted; tradeoff accepted is that the exact historical prediction is not reconstructable), effective ranking price (newest observation if newer than UEX date_modified, else UEX), aUEC/hr / distance / duration (travel-time seeds, ordinal per D7), stop sequence (ordered leg endpoints).

ALTERNATIVES REJECTED: (1) single append-only events jsonb log — maximally loop-agnostic but every read reconstructs structure and loses referential integrity; the mirror uses jsonb because it mirrors a feed it doesn't control, the spine controls its own shape so it normalizes. (2) stop-centric model (the spike's mistake) — profit belongs to the commodity carried between two stops, not a stop (D7). (3) planned-manifest items — see above. (4) pgEnums — see above. (5) snapshotting the UEX estimate at commit time — persists a derived upstream value and the mirror churns every 15 min anyway.

## D11 — Migrations auto-apply on worker startup (amends D4)
**Decided:** 2026-06-09. **Class:** persistence / migration workflow. **Status:** RATIFIED; shipped + verified (spine tables present on a real run 2026-06-09).

D4 set the workflow as manual drizzle-kit migrate ("operator applies migrations by hand"). Two problems surfaced: (a) drizzle.config.ts has no SSL setting, so a local db:migrate against the Railway public proxy likely fails (D5: the proxy needs SSL or resets); (b) the operator wants the apply step automated. Resolution: the refresh worker (scripts/refresh-mirror.ts) runs migrate(db, { migrationsFolder: "./drizzle" }) on startup, after the select 1 probe and before any table access, through its existing pool (which already has the required SSL). Still "migrate", not "push" — it runs the committed ./drizzle SQL — and idempotent (drizzle tracks applied migrations), so a no-op once applied. The worker is single-instance cron, so no concurrency race; the Vercel app was deliberately NOT chosen (serverless cold-start concurrency + it fights the D6 lazy-init contract).

TRADEOFF ACCEPTED: the human gate moves from "before I run migrate" to "before I merge the PR" — the generated SQL is still reviewed in the diff, but once merged it auto-applies on the next worker run. Low-risk for additive migrations (CREATE TABLE). For a DESTRUCTIVE migration (DROP/ALTER on a table holding real flight history) the auto-apply gate is too loose — pause and apply/verify by hand before merging those.

## Routes-source fork — resolved (supports D2/D3)
**Decided:** 2026-06-03. **Status:** RATIFIED.

Mirror commodities_routes via paced fan-out (Option R), NOT derive routes locally from commodities_prices_all (Option P). Option P was rejected as reimplementing the route math the pivot deliberately chose to consume from UEX. Routes are slower-moving than prices and UEX caches them about 30min upstream, so a ~30-min mirror cadence is the sane floor.

## Probe findings (2026-06-03) — inputs to the mirror schema
Record of what the live commodities_routes probe returned, to inform D2/D3 build:

- No-param call returns HTTP 400 (missing_one_required_inputs). id_commodity is required — fan-out confirmed, no all-rows shortcut.
- No date_modified on route rows. date_added (Unix ts) is row-creation, not freshness. Blind 30-min poll confirmed (D2).
- game_version_origin / game_version_destination ARE on route rows — a patch-boundary staleness signal available for routes (previously catalogued only on rentals).
- Fields to promote to typed/indexed columns beyond the original schema list, because they are ranking/filter inputs: scu_reachable (UEX's own bottleneck field — compare against the three-way min), status_origin / status_destination (buy/sell availability), container_sizes_origin / destination (needed as typed columns for the container intersection capacity work).
- has_freight_elevator_origin / destination is on the route row but stays STRUCK as an auto-load proxy (disproven 2026-06-02; is_auto_load on /terminals is authoritative). The auto-load filter still requires the terminals_mirror join.

---

See TRANSFER.md for the full design narrative and the Spine Rule (Plan/Leg/Item type). The Spine Rule and persistence deploy-model change are folded into CLAUDE.md separately (next doc beat).

## Open item — doc-trailer / stop-hook conflict (2026-06-04, unresolved)
The repo's stop hook auto-commits and pushes on task completion. This collides with the doc-only prompt trailer "Do not run any commands," because commit and push are commands. CC correctly halts and asks rather than overriding the instruction. Resolution options (own beat, escalation-class — the trailer is defined in project instructions): (a) reword the doc trailer to "Do not run lint, typecheck, or build; allow the commit/push stop hook to run"; (b) accept the per-prompt commit question. Recommendation: (a). Not yet actioned.
