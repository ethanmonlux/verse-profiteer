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

BUILD-ORDER CONSEQUENCE: ship the loop planner ranked by TOTAL PROFIT first (with per-leg deadhead-vs-carry flags and a stale-leg warning carried over from the price-age work), explicitly labeled "per-hour ranking pending travel-time calibration." Flip the objective to aUEC/hr only after calibration lands. This decouples the feature from the one input the operator currently cannot collect.

ALGORITHM NOTE: max-ratio cycle is a hard (TSP-adjacent) class. Do NOT attempt a general optimum. Bounded loops (2-3 stops, possibly 4) within a single system are enumerable — enumerate and score. "Best 3-stop Stanton loop" is tractable; "best loop of any length across all systems" is out of scope.

The spike itself (app/spike/loop) is throwaway and should be deleted once these findings are captured — it is fake data and is currently live on the public deploy.

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
