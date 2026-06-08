# TRANSFER.md — verse-profiteer

Session-continuity handoff. Start of session: read this + recent CHANGELOG.md, TODO.md, VERIFICATIONS.md (Pending). Flag if this file is stale relative to those.

## Session state (2026-06-08 — verify→mirror, staleness honesty, loop-UX spike)

- DONE this session: (1) /api/verify migrated to read routes_mirror (getMirroredRoutesByCommodity) instead of live UEX — the raw debug button now verifies against the same source the board reads; test updated; CI green. (2) Dead-code cleanup: shortlistCommodities + SHORTLIST_SIZE removed from lib/routes.ts and its tests (lint warning cleared). (3) Staleness-display honesty fix: card label changed from "Updated {date_added} ago" (route-row creation time — not a freshness signal) to "prices last seen {N}" computed as the OLDER of the two price legs' date_modified, joined in-memory in getTopRoutes; "price age unknown" when either leg is missing from the prices feed. dataAgeUnix field on RouteWithAutoLoad, derived-on-read. Rationale = honest-about-uncertainty: date_modified is last-human-observation, not last-price-change, so the label is an observation timestamp, not a freshness promise. (4) Loop plan-view spike built, viewed, findings captured as D7; spike to be deleted.
- NOTE: the staleness-display fix is a user-facing data-reliability claim change. If a VERIFICATIONS Pending entry was not added at merge, add one — spot-check a headline route's "prices last seen" against the older of its two terminals' date_modified in a live UEX query, and confirm a missing-leg route reads "price age unknown."
- OPEN follow-ups, priority order: (1) confirm/add the staleness-display VERIFICATIONS Pending entry + run the spot-check; (2) delete app/spike/loop; (3) read the daytime UEX cadence probe sample (15-min cadence under load; stock/status drift vs price); (4) tear down the probe service.
- NEXT BIG BEAT: the cargo-ledger spine (Plan/Leg/Item), then the loop composer per D7. Build order: spine types → edge profit (best-cargo-for-a-fixed-pair, reuses getTopRoutes) → bounded loop enumeration ranked by total profit → travel-time calibration → re-rank by aUEC/hr. The per-hour objective is blocked on travel-time calibration, which is blocked on in-game measurement (operator cannot play currently) — so ship total-profit ranking first.

## Session state (2026-06-07 — READ-PATH MIGRATION SHIPPED + VERIFIED)

- DONE: read-path migration shipped, verified on production, CI green (lint/typecheck/test). Route ranking reads from routes_mirror via lib/routesRepo.ts (getAllMirroredRoutes) instead of the live UEX per-commodity fan-out; top-35 shortlist removed (D3 landed in the read path). lib/db/index.ts now lazy-inits the connection (getPool()/getDb()) so build/CI/page-data collection no longer need DATABASE_URL at import — fixes the prod Server Components render crash and the CI test-load failure (recorded as D6).
- Open follow-ups, priority order: (1) /api/verify mirror migration; (2) staleness-display beat (propose → confirm root cause → prompts next session); (3) conditional/delta refresh (gated on probe); (4) shortlistCommodities/SHORTLIST_SIZE dead-code cleanup; (5) tear down the probe service.
- Cadence: worker cron moved 30 -> 15 min (evidence-backed by overnight probe — see DECISIONS D2 CORRECTED); conditional/delta refresh dropped as not worth building (UEX recompute floor ~15 min is the binding ceiling); probe may be left running for a daytime sample to confirm 15 holds under peak load, otherwise tear down.
- Infra state: both the Vercel app and the Railway worker use the Railway PUBLIC proxy URL for DATABASE_URL (Sensitive; Vercel Prod+Preview; the worker requires the public proxy because internal networking — postgres.railway.internal — failed with ETIMEDOUT, see D5); Railway = Postgres + worker + temporary probe service (to be deleted); stray Railway app service already deleted.
- Note: the `{ }` raw debug button is still live/ungated on production — tracked for strip/gate before public traffic.
- BUILD-COUPLING (learned 2026-06-07, the hard way): all three Railway services (app-not-applicable/Vercel hosts the app; Railway runs Postgres, the refresh worker, and the temporary UEX probe) that deploy from this repo share one build. Railway's default builder runs a repo-wide typecheck on deploy even for services with no custom build step. A TypeScript error ANYWHERE in the repo therefore fails the build for every repo-deploying service: a duplicate-key typo in scripts/probe-uex-cadence.ts crashed BOTH the probe and the refresh worker until the fix merged. Implication: a "throwaway" script in this repo is NOT isolated from production — it can take down the mirror worker. Mitigation: the `npm run typecheck` step in the code-prompt trailer is load-bearing, not ceremony — it catches exactly this class of error before push. Always let typecheck complete before pushing. Any script kept in-repo (including the probe) is held to the same typecheck discipline as production code.
- Pending verification count after this session: 0 (read-path moved to Completed).

## Session state (2026-06-06 — MIRROR REFRESH WORKER VERIFIED, BEAT CLOSED)

- DONE: mirror persistence + refresh worker fully shipped and verified. routes_mirror (~8930 rows) and terminals_mirror (823 rows) populating every 30 min on Railway cron. VF entry moved to Completed (VERIFICATIONS.md); connection/runtime decisions recorded as D5 (DECISIONS.md).
- Cleanup pending (minor): worker has a redundant DATABASE_PUBLIC_URL variable; only DATABASE_URL is read by code — safe to delete the duplicate.
- NEXT SESSION (the big one): wire the READ path. Point route ranking at routes_mirror instead of the live per-commodity UEX fan-out in lib/routes.ts. This is where D3 lands — removing the top-35 shortlist trim so capacity-aware ranking sees every candidate. Ranking-math + caching class: REVIEW + VERIFY, escalation-gated, with before/after verification that a known ship's best route is same-or-better, not worse.

## Session state (2026-06-04 — MIRROR PERSISTENCE + REFRESH WORKER SHIPPED)

- Persistence layer shipped: Drizzle + Railway Postgres, routes_mirror + terminals_mirror migrated and live.
- Mirror-write lib shipped: lib/db/index.ts (shared pg Pool + typed drizzle db), lib/mirror.ts (parseContainerSizes, pacedFanOut, upsertTerminals, upsertRoutes). Unit test on parseContainerSizes green.
- Refresh worker shipped: scripts/refresh-mirror.ts, run via npm run refresh:mirror, scheduled on Railway every 30 min using the INTERNAL DATABASE_URL. Paced fan-out (10 commodities / 6s) to respect the shared UEX 120/min cap.
- Architecture note: refresh runs as a Railway cron service, NOT a Vercel route — Hobby plan caps cron at once-daily and functions at 60s, both of which a ~90s 30-min refresh violates. Railway worker is colocated with the DB, free, unconstrained.
- Open: VF mirror-refresh-worker is Pending (see VERIFICATIONS.md) — worker must be run and verified before this beat is Done. Railway worker SERVICE still to be set up in the Railway dashboard (build/start config not committed to repo).
- Next session: after worker verified, the consumer swap — point route ranking at the mirror instead of live per-commodity fan-out (this is where D3 / shortlist dissolution actually lands in the read path).

## Session state (2026-06-04 — GATE CLEARED: probe + escalation trail + CLAUDE.md + TODO reshuffle)

The 2026-06-03 NEXT SESSION GATE is fully cleared. All four steps done, committed, on main. Plus two side correctness fixes shipped. NO implementation yet — next session opens at SCHEMA DESIGN.

### GATE — all four steps complete
1. PROBE (done) — /api/probe-routes hit live UEX, captured findings, endpoint deleted same session. Findings:
   - No-param commodities_routes returns HTTP 400 (missing_one_required_inputs). id_commodity REQUIRED — fan-out confirmed, no all-rows shortcut.
   - NO date_modified on route rows. date_added (Unix ts) is row-creation, not freshness → blind ~30-min poll confirmed (refresh-on-change NOT possible).
   - game_version_origin/destination ARE on route rows — patch-boundary staleness signal available for routes (previously only catalogued on rentals).
   - One commodity (id 18) returned 352 routes in one call — fan-out is ~122 calls each returning all that commodity's routes; mirror row volume is tens of thousands.
   - Typed-column list to EXPAND beyond original plan: scu_reachable, status_origin/destination, container_sizes_origin/destination, game_version_origin/destination (all on the route row).
   - has_freight_elevator on the route row stays STRUCK as auto-load proxy; is_auto_load on /terminals is authoritative — auto-load filter still needs the terminals join.
2. ESCALATION TRAIL (done) — created DECISIONS.md at repo root. D1 Postgres persistence, D2 mirror refresh cadence (caching-TTL-class), D3 full mirror replaces top-35 (ranking-math-class), routes-source fork (Option R), + probe findings section. Each marked RATIFIED, unbuilt.
3. CLAUDE.md (done) — 4 edits: persistence paragraph in Architecture; new Spine Rule section; branch-off-main-before-fresh-start note in Branch Model; new Verification Discipline section (report-as-BLOCKED, don't work around with debug endpoints). Cache TTL line left unchanged on purpose (5-min routes describes current behavior; D2's 30-min is the mirror cadence, recorded in DECISIONS.md, not built yet).
4. TODO reshuffle (done) — new RATIFIED ARCHITECTURE block at top of Major (mirror + spine + build order + still-undecided); ledger PROMOTED (D1 unblocks it); multi-leg loop PROMOTED (route-stacking = first spine consumer); capacity-aware ranking tagged PARTIALLY DISSOLVED BY MIRROR (sub-item 2 + shortlistCommodities bug + outlier-guard-v2 dissolve; container_sizes intersection + out-of-stock handling survive — reconcile at schema design, don't delete yet). v1 SCOPE block left intact.

### SIDE FIXES SHIPPED THIS SESSION (display-only, REVIEW, on production)
- Realizable-profit sign-aware rendering — Board.tsx headline + per-route realizable now use text-loss when <0, text-profit when >=0, and drop the hardcoded "+" (toLocaleString emits the minus). Fixed the "+-90,500 in green" bug. Confirmed on prod (Recycled Material Composite shows -180,500 in red). NOT escalation-gated, no math touched.
- /api/probe-routes created then deleted same session. Debug surface count back to baseline four: verify, verify-prices, verify-qt, verify-terminals.

### NEXT SESSION — START HERE: SCHEMA DESIGN (fresh chat)
This is a meaty design beat; it was deliberately given a clean context window. Agenda:
- Mirror schema finalized (routes_mirror typed columns per expanded probe list + JSONB raw + refreshed_at; terminals_mirror with is_auto_load; prices_mirror if/when shortlist logic is replaced). Indexes on (id_commodity) and (id_star_system_origin, id_star_system_destination).
- Spine types (Plan/Leg/Item) — exact lib/ paths; async DB accessor from day one (near-locked).
- DEEP capacity-ranking reconcile — confirm exactly what the mirror dissolves vs preserves (the TODO flag's split), THEN delete consciously.
- Postgres host decision — Railway is the default (GOATS precedent) but not formally chosen.
- RAILWAY PROVISIONING happens AFTER schema is designed+approved, as the first implementation step that needs it — NOT before (empty DB + likely re-provision otherwise).
- Build order after schema: provision host -> migration -> mirror refresh job (Vercel Cron -> Next route -> lib/uex.ts -> upsert) -> spine types -> route-stacking consumer. Mirror/refresh/ranking all REVIEW+VERIFY, Pending VERIFICATIONS entries at merge.

### OPEN ITEM RAISED THIS SESSION (not yet actioned)
- DOC-TRAILER / STOP-HOOK CONFLICT: the repo's stop hook auto-commits+pushes on task completion, which collides with the doc trailer's "Do not run any commands" (commit/push are commands). CC correctly stopped and asked each doc prompt; operator answered "commit & push" each time. FIX OPTIONS (own beat, escalation-class since it's the trailer definition in project instructions): reword the doc trailer to "Do not run lint, typecheck, or build; allow the commit/push stop hook to run," OR accept the per-prompt question. Recommend rewording. Not done this session.

## Session state (2026-06-02 — capacity-ranking-auto-load)

### SHIPPED + VERIFIED THIS SESSION (all merged to main, on production)

- Capacity-aware ranking engine + ship/systems gate. Fixed the rank bug (server ranked at hardcoded 576, client displayed at NaN/Infinity → headline profit didn't match sort order). Board gated behind ship + systems selection; selected ship SCU is the single capacity source for both server ranking and display. CAPACITY IS SHIP-SCU-BOUND ONLY (assumes perfect packing) — container_sizes intersection NOT done, do not mark capacity-aware ranking complete.
- Picker fix: filter v.is_cargo === 1 && v.is_ground_vehicle === 0 (is_cargo = "has a cargo grid", liberal — keeps small fighters like Avenger/M50; kept intentionally). Ship names fixed (was CSS, missing text color). /api/debug-vehicles deleted.
- verify-terminals: getTerminals() + Terminal interface (12h TTL) in lib/uex.ts; /api/verify-terminals debug surface + DebugTerminals UI. On the strip-before-public list (now 4 surfaces: verify, verify-prices, verify-qt, verify-terminals).
- Auto-load labels + TWO INDEPENDENT TOGGLES: join is_auto_load from /terminals onto routes by id_terminal_origin AND id_terminal_destination (Map lookup), exposing autoLoadOrigin/autoLoadDestination (1/0/-1). Per-route label "load ⚡/✋ · unload ⚡/✋". Two independent toggles: "Auto-load at buy" (autoLoadBuy param) and "Auto-unload at sell" (autoLoadSell param). Server filter: (!autoLoadBuy || origin===1) && (!autoLoadSell || dest===1). URL builder preserves both toggle states independently.

### KEY FINDINGS / DECISIONS

- is_auto_load on /terminals is the REAL authoritative auto-load field. VERIFIED: Terra Mills=0, New Babbage/Port Tressler/Area 18/Baijini/ARC-L4=1. 289 auto-load / 534 not, of 823 terminals.
- FREIGHT-ELEVATOR PROXY DISPROVEN AND ABANDONED: HDMS-Lathan/Thedus have freight_elevator=1 but is_auto_load=0. The earlier "7/7 proxy" finding is STRUCK (only looked good because all tested terminals were stations). Auto-load mechanic = requires ship STORAGE (hangar): cities + stations yes, open-pad outposts no. Confirmed by community + data.
- PROFIT FINDING: highest-profit routes are almost all HAND-LOAD origin (remote outposts). Best overall +1,364,740; best with origin auto-load +137,280; best both-ends +137,280. Requiring auto-load costs ~10x ceiling. ~12% routes buy-auto, ~40% sell-auto, ~6% both. Auto-load filter is a CONVENIENCE/TIME tool, NOT a profit strategy — defaults OFF. SUPERSEDES earlier wrong note that hand-load routes were "low-value dregs."
- TOGGLE-INDEPENDENCE INVESTIGATION (resolved, no bug): buy-only board appeared to show all ⚡/⚡, suspected of forcing both ends. Traced it: the toggles ARE independent and the filter code is correct. In Stanton, the only buy-auto/sell-hand routes are NEGATIVE profit (sell to scrap/salvage yards), so they never reach the top of the profit-ranked board. The ⚡/⚡ appearance is profit-ranking + Stanton geography, not a filter bug. No fix needed.
- Terra Mills: operator couldn't FIND the kiosk (location-guide gap); is_auto_load=0 confirms it also genuinely lacks auto-load. Both true, separate issues.

### BANKED FOR NEXT SESSION

- PR-C (foregone-profit comparison): show profit given up by requiring auto-load (best filtered route vs best overall). Needs getTopRoutes to compute filtered + unfiltered tops in one pass — ranking-function change.
- HEADLINE NEXT SESSION — ROUTE STACKING (big design session, ties to cargo-ledger/loop vision + Decision #2, now ACTIVE): TWO forms tackled as one vision — (1) multi-commodity manifest per single run (fill one hold, same origin→destination, maximize SCU); (2) multi-leg loops (A→B→C→A, never deadhead). Changes core model from "rank independent routes" to "compose routes into a plan." Decision-first design like the capacity gate — do NOT bolt on. This is where both-ends auto-load pays off (loop nodes are unload + reload).

### STANDING BACKLOG / VERIFICATION

- /terminals carries planet_name/moon_name/outpost_name — Tier-1 location data, joinable like is_auto_load. Re-prioritized UP: operator couldn't find Terra Mills kiosk mid-run. Surface "Cellin · Terra Mills" on cards. Fold into a join PR or its own.
- Reconsider Tier-2 hand-authored terminal interior notes (which kiosk/wall).
- container_sizes intersection (usable capacity vs hull SCU) — outstanding half of capacity-aware ranking.
- Travel-time / profit-per-hour still uncalibrated ("seed estimate" on every card) — would properly model hand-load time-cost vs higher margin.
- Galaxy Cargo Module shows scu 0; add `&& v.scu > 0` to picker if ever tightening.
- CLAUDE.md notes (escalate to operator): (1) verify-first failures should be REPORTED AS BLOCKED, not worked around with debug endpoints; (2) branch-off-main must happen BEFORE a fresh-start prompt runs — CC builds on whatever branch is checked out (caused debug-vehicles and freight-elevator to ride along on wrong branches this session).
- Decision #1 RATIFIED. Decision #2 (loop model graduates to build + CLAUDE.md rule) ACTIVE — next session's subject.

---

## Last updated (history)

2026-06-02 — docs-only session (second update). Project ambition expanded: from cargo-trading tool to a personal companion for all ECONOMIC loops (trading/mining/salvage/refining), unified by a loop-agnostic cargo ledger + cross-loop aUEC/hr. Vision note + scope guardrail added to TODO.md backlog. Sequencing unchanged: trading + ledger first, earn each subsequent loop by finishing the prior one. No code shipped.

2026-06-02 — docs-only session. Confirmed project identity: SOLO build for operator's own use + public portfolio piece; monetization shelved. Locked UEX as sole upstream data source (added to CLAUDE.md). Added post-v1 backlog re-prioritization chore to TODO.md. Stateful companion vision section added to TRANSFER.md. No code shipped.

2026-06-01 (scope lock) — v1 scope locked for operator absence (see v1 Scope section below). No code shipped this update; docs only.

2026-06-01 — shipped card information-hierarchy redesign (verified in production); calibration de-gated from "deferred" to STANDING task; profit-per-hour dropped from card (deferred to loop planner, lib/profitPerHour.ts retained); measured auto-load fee (~190 + ~62/SCU per event, charged on both load and unload), fixed load/unload overhead (~72s at 8 SCU), and reconciled sale proceeds (8 SCU Scrap @ 3,555.86 − 488 fee = 27,958, confirmed to the credit); structural findings: buy-side availability collapses to 0 at city TDDs (city = sell terminus, not buy origin), price flat vs quantity + varies by terminal confirmed, terminal-location friction (internal transit cost). Rental-ROI sourcing clarified: use UEX vehicles_rentals_prices feed, not UEX marketplace. Clean QT wall-clock leg still outstanding. Next likely step: capacity-aware ranking & candidate selection.

## Session summary (2026-06-02)

- Project ambition expanded: from cargo-trading tool to a personal companion for all ECONOMIC loops (trading/mining/salvage/refining), unified by a loop-agnostic cargo ledger + cross-loop aUEC/hr comparison. Key design decision recorded in TODO backlog: model money loops generically as { source_activity, items_acquired, items_sold, time_spent, profit } so the ledger absorbs new loops without rework; build the ledger loop-agnostic from the start. Scope guardrail recorded: economic loops (trading/mining/salvage/refining) are IN SCOPE; non-economic / different-tool-shaped loops (NPC hauling-contract missions, bounty/combat, medical/rescue) are explicitly OUT. Sequencing unchanged: trading + loop-agnostic ledger first, earn each subsequent loop by finishing the prior one. This nests under the confirmed solo/portfolio identity — the unified personal-economics ledger is the differentiated core, not a competitor reskin.
- Confirmed project identity: SOLO build for the operator's own use + a public portfolio piece. NOT a business; monetization shelved (saturated market, RSI policy prohibits donations/paywalls, donation economics don't sustain even Regolith-tier tools — see competitive research artifact).
- Two consequences locked: (1) UEX is the sole upstream by design, no third-party tool data dependencies (now explicit in CLAUDE.md UEX Hygiene Rules); (2) v1 backlog needs re-prioritization under the solo-user goal next session (TODO Chore added) — demote other-user features, keep correctness, likely pull cargo ledger forward.
- Wear two hats deliberately: "personal edge" justifies selfish feature choices; "portfolio" justifies keeping the repo clean/legible to a stranger.
- No code shipped this session; all changes are documentation.

## Session summary (2026-06-01)

- Shipped: card information-hierarchy redesign — headline = primary route realizable profit; per-route realizable behind expand; per-row qualifier contextual on capacity; total behind expand; per-SCU secondary. Verified in production.
- Calibration de-gated: travel-time calibration moved from "deferred by operator" to STANDING tuning task in VERIFICATIONS.md. Partial observables captured this session (see below); QT wall-clock leg still outstanding.
- Per-hour dropped from card: single-run per-hour overstates sustained earnings. Deferred to loop planner. lib/profitPerHour.ts retained on disk.
- Measured constants: auto-load fee ~190 + ~62/SCU per event, charged on BOTH load (buy) and unload (sell) — round-trip ~2x; fixed load/unload overhead ~72s at 8 SCU; load and unload are ASYMMETRIC (load overlaps walk-back, unload is serial after terminal travel).
- Sale proceeds reconciled: 8 SCU Scrap @ 3,555.86 − 488 fee = 27,958; balance 779,074 → 807,032 confirmed to the credit.
- Structural findings: buy-side availability routinely collapses to 0 at city TDDs (confirmed: NB TDD ~80 commodities OUT OF STOCK); city TDDs = sell termini, not buy origins; price flat vs quantity + varies by terminal confirmed (Scrap 2,600–4,500 spread, ~73%); terminal-location friction (internal transit to TDD is additive on unload leg).
- Rental-ROI sourcing: use UEX vehicles_rentals_prices feed (has game_version for staleness gating), NOT marketplace player-listings. In-game rental is per-real-time-day with multi-day discounts and full insurance included.
- Sell-side fee confirmed: auto-load fee charged on both load AND unload (~190 fixed + ~62/SCU per event, round-trip ~2×; optional via hand-load). Sale proceeds reconciled to balance (8 SCU Scrap @ 3,555.86 − 488 fee = 27,958; 779,074 → 807,032 confirmed to the credit). Fee model measured/closed; moved to Completed in VERIFICATIONS.md.
- Capacity-aware ranking UNBLOCKED: usable capacity is modelable via vehicle∩commodity container_sizes intersection — UEX exposes container_sizes on both /vehicles and per-terminal commodity data, plus game_version on /vehicles. Physical grid-cell geometry is NOT in UEX (no slot footprints), so true bin-packing stays out of scope. Pack-full-vs-pack-fast is a real surfaced tradeoff.
- Crash = total uninsured cargo loss (RSI Knowledge Base confirmed): hull insurance covers the ship via claim, not cargo; Support will not reimburse. New Minor: user risk-tolerance slider for risk-adjusted profit; also diversifies routing (risk-averse players steered to lower-value cargo, softening top-route depletion).
- Rentals game_version precision: game_version is on the DETAILED endpoint (vehicles_rentals_prices?id_vehicle=…) only — the bulk _all is date_modified-only. Exception to the default-to-bulk rule for this specific staleness-gating use case.
- Source landscape: UEX game_versions endpoint = canonical patch resolver for staleness gating. sc-trade.tools = UEX's named partner, natural second-source cross-check (public-API status unconfirmed). starcitizen.tools / RSI Cargo Grid Reference sheets = human-reference only (curated images/specs, not live feeds; usable only as a one-time hand-seed for per-ship grid geometry).

## v1 Scope — Locked 2026-06-01

**v1 boundary (corrected against raw commodities_routes dump):** v1 = items 1–5. Goal: enable a newer player to pick a route and execute it end-to-end without getting lost or running an un-runnable route.

**KEY FINDING:** CommodityRoute interface is an incomplete subset of the real response (see routes-29 dump) — type missing fields from raw, don't trust the interface as complete.

1+2. **Capacity-aware ranking + container_sizes** — data already on route response (container_sizes_origin/destination); ranking math + capacity-aware fan-out is the real work; escalation-gated, REVIEW+VERIFY.
3. **System filter** [Stanton-default toggle] — CORRECTION: must be SERVER-SIDE in getTopRoutes BEFORE headline-selection/sort/slice, NOT a display filter; escalation-gated, REVIEW+VERIFY; entangled with 1/2. URGENT: current #1 board route (E'tam +609k) originates in Pyro (Ashland) — un-runnable for Stanton-only and unflagged.
4. **Terminal-location guide** — Tier 1 auto incl. terminal capability flags (all already on route response, no extra fetch), Tier 2 hand-authored interior notes (operator-maintained static file), Tier 3 out.
5. **Buy/sell prices** — TRIVIAL display fix: price_origin/price_destination already returned in raw response, just untyped/unrendered. The one safe quick win — not escalation-gated, REVIEW only.

**Sequencing:** only #5 is safe to ship unattended; #1/2/3 are escalation-gated REVIEW+VERIFY, build when present; #4 Tier 1 is also straightforward once present.

**Post-v1 — explicitly deferred, do NOT fold in:** ship-info surface; crash/cargo-loss risk slider; multi-leg loop planner; user price overrides; UI visual-identity pass.

## Open measurement questions

- QT wall-clock for a clean single leg (this session's run contaminated by a mid-run course change; constants left unverified rather than anchored to bad data).
- Can a terminal service multiple ships in parallel (offload one while loading another) or is it strictly serial?
- Big-ship load (100+ SCU) to isolate the real per-SCU load scalar; large boxes (16/32) vs many small; a different commodity at same terminal/SCU to test type-dependence.
- Ship-ladder calibration protocol: methodical volume sweep (same commodity + terminal, increasing ship size) to measure per-SCU fee and load-time scalars cleanly.

## Current state

- Repo deployed to Vercel (verse-profiteer.vercel.app). Next.js 16 / React 19 / Tailwind v4 (NOT Next 14 — verify framework APIs against installed version, see AGENTS.md).
- UEX proxy DONE + verified: lib/uex.ts (single data-access module) + app/api/commodities/route.ts, returns commodities_prices_all. Env/token/base-URL guards in place, 5-min fetch cache.
- commodities_routes integration SHIPPED + verified: lib/routes.ts (shortlistCommodities + getTopRoutes), /api/routes serving UEX route data, grouped-card board on app/page.tsx (top 10 commodities, top 3 routes each, sorted by best-route profit). Verified against UEX (Atlasium, 2026-05-30).
- Travel-time estimate SHIPPED: lib/travelTime.ts (estimateTravelMinutes + estimateTravelRange), point estimate + flat-band range per route row, four calibration constants + ESTIMATE_BAND_PCT seeded as uncalibrated guesses, inputs distance/scu_origin free from commodities_routes — no new UEX calls. Display-only; ranking unchanged. Estimator math verified 2026-05-31 against raw routes (E'tam id 29, Dymantium id 127). Unit tests in lib/travelTime.test.ts. Calibration STANDING — partial observables captured 2026-06-01 (see VERIFICATIONS.md).
- Profit-per-SCU SHIPPED: lib/profitPerScu.ts (profitPerScu = profit / scu_origin, divide-by-zero guarded, rounded to whole credits), compact {value}/SCU per route row. Divisor verified against asymmetric-SCU routes. Display-only; ranking unchanged. Math verified 2026-05-31 against raw (E'tam id 29). Unit tests in lib/profitPerScu.test.ts.
- Card information hierarchy redesign SHIPPED + VERIFIED: card headline = primary route's realizable profit (capacity-aware); per-route realizable shown only on expand (fixes double-count bug on collapsed cards); per-row qualifier contextual on capacity; total profit behind expand; per-SCU on secondary line. Profit-per-hour removed from card (lib/profitPerHour.ts retained on disk). Verified in production 2026-06-01.
- v0.1 planner RETIRED: planRoutes, Route interface, lib/routePlanner.ts, lib/routePlanner.test.ts removed. Verification entry remains in VERIFICATIONS.md as historical record.
- Investigation spike DELETED: getCommodityRoutes spike code and /api/routes-spike removed.
- GitHub Actions CI LIVE: .github/workflows/ci.yml — lint + typecheck + test on every PR into main and on push. PR-into-main flow now in effect; CI green/red on the PR is the merge signal.
- Route-count guard SHIPPED + VERIFIED (threshold <=1, quarantine-and-label): `lib/routes.ts` + `app/page.tsx`. Commodities with a single profitable route are quarantined below all corroborated commodities and labelled 'single route — unverified'. Verified 2026-05-30 via raw-data audit (Osoian Hides correctly isolated; see VERIFICATIONS.md Completed). Outlier guard v2 merged into Capacity-aware ranking & candidate selection — see TODO.md Major.
- Debug verify-button SHIPPED (ungated raw UEX passthrough): `app/api/verify/route.ts` (GET endpoint) + `app/DebugRoutes.tsx` (per-card `{ } raw` toggle client island) + copy-to-clipboard button on the route panel. Marked TEMPORARY DEBUG SURFACE.
- Debug prices button SHIPPED: `app/api/verify-prices/route.ts` (GET endpoint, returns raw commodities_prices_all array) + `app/DebugPrices.tsx` (`{ } prices` toggle, rendered below the subhead on the home page). Marked TEMPORARY DEBUG SURFACE. Strip-before-public trigger now covers all three surfaces: /api/verify (raw routes), /api/verify-prices (raw prices feed), and both debug buttons including copy — before public launch / monetization unpause.
- Ship-capacity scaling SHIPPED + VERIFIED (lib/realizableProfit.ts realizableProfit + routeBottleneck; board split into server + app/Board.tsx client with in-memory capacity input; per-row realizable + cap indicator; ≤-total-profit invariant tested). Display-only, ranking unchanged. Verified 2026-05-31 (VERIFICATIONS Completed).

## Product Thesis

No official RSI market API exists or can exist. The game runs a per-shard, server-meshed economy where trade friction — supply depletion, price variance by terminal, availability collapse at consumption hubs — is CIG's intentional gameplay loop. A centralized market feed would dissolve that friction, which is why CIG won't build one. The missing API is structural and permanent.

The tool is valuable BECAUSE no API can exist. Every hard problem (staleness, availability uncertainty, per-shard price variance, buy-side OUT-OF-STOCK collapse) shares one root cause — no ground truth — which is also the moat. Competitors that paper over it (fantasy quantities, capacity-blind ranking) mislead users. Honest uncertainty is the differentiator.

North star: the freshest, most honest read on an economy nobody can see directly.

## Stateful companion vision (post-v1)

The recurring design throughline this session is HONESTY ABOUT UNCERTAINTY DELIVERED WITHOUT DISORIENTING THE USER — seen in quantity-confidence framing ("if ~N available", not a promise), commitment-aware re-routing (re-plan the future, never yank the committed leg), and the cargo tracker (learn reality from the user without overriding physics). The cargo tracker is the architectural cornerstone of the stateful half of the tool: it is the data spine feeding leftover-cargo selling, real qty/price sightings (ground-truth the feed can't give, works single-user), profit-vs-estimate verification, loop progress-state, and real P(loss). It is the first persistent state → the Railway+DB threshold. Sequencing: v1 (capacity ranking, system filter, box-size, terminal guide, buy/sell prices [shipped]) makes the BOARD trustworthy; the cargo tracker is the likely highest-leverage NEXT step because the loop planner, risk slider, quantity sightings, and profit verification all build on it. Also noted: UEX ranks by fleet-scale gross income (surfaces thin-margin bulk like Waste); our per-ship per-SCU ranking is the right metric for a solo player.

## The pivot (why, and what it means)

- DECISION: consume UEX commodities_routes (returns realizable profit, scu_origin/scu_destination already bottlenecked, investment, distance in Gm, price_roi, price_margin) instead of computing routes from commodities_prices_all. Building a worse UEX is not worth it; compete on UI, filters, in-game price overrides, and a chat-box instead.
- This retires the v0.1 planRoutes cartesian ranker (and its 8 tests). Its VERIFICATIONS.md entry stays as historical record.
- SPIKE FINDINGS (verified against 6 known-answer commodities + a full 122-commodity local sweep of commodities.json):
  - UEX scu_origin/scu_destination ARE the realizable bottleneck (Osoian came back capped at qty 1). profit IS realizable, not per-unit. Confirmed working.
  - UEX volatility_origin/volatility_destination are NULL in practice — UNUSABLE as a trust signal. Struck.
  - UEX score does NOT isolate bad trades — the Osoian outlier (586,500 profit, 1 route) outscored good small Degnous Root. Struck as a trust signal (may still be usable as a default sort).
  - GUARD SIGNAL CONFIRMED: route-count isolation. Full-feed sweep: only Osoian Hides has <=2 profitable routes (it has 1); all 71 other tradeable commodities have 9+. Zero false positives. Flag/downrank commodities with <=1-2 routes, label "single uncorroborated route", quarantine never silent-drop. Re-confirm exact threshold against UEX's live route counts when wired.

## Decisions affecting caching / math / auth

- UEX base URL: UEX_BASE_URL env var, .uk confirmed working.
- commodities_routes has NO _all bulk variant — it is one call per id_commodity (no request batching available). For whole-feed analysis, derive from commodities_prices_all locally instead of fanning out 122 route calls.
- Cache TTL for routes: 5 min (provisional, matches prices; UEX caches 30 min upstream). Added to CLAUDE.md hygiene list this session.
- No official RSI commodity-market API exists or is planned (confirmed 2026-05). UEX is the best upstream source; player price overrides are the single genuine data-quality edge.
- Supply/demand is player-influenced + tick-refreshed (5-15 min); feed quantities are fuzzy snapshots. Load/unload is a real per-SCU time cost (~6-8 min for 696 SCU), belongs with travel-time constants.
- STALENESS: commodities_prices_all has date_modified but NO game_version. Patch boundaries are mass-staleness events, distinct from per-cell aging.

## Open operator decisions

- Monetization: PAUSED (donation model is the viable path per peers; resume is operator's call; not legal advice).

## Prompts written but not run

(none)

## Pending verification count

0 code verifications pending (no code shipped 2026-06-02 — two consecutive docs-only sessions); 1 calibration run OPEN / STANDING (travel-time constants — QT wall-clock leg still outstanding; auto-load fee and sale proceeds reconciliation moved to Completed in VERIFICATIONS.md); 1 parked (per-ship QT, open only if tool consistently misranks fast vs slow ships). v1 item 5 SHIPPED + VERIFIED: buy/sell prices (price_origin/price_destination) added to CommodityRoute interface and rendered per row as "buy {price_origin}/SCU · sell {price_destination}/SCU"; card math verified in production (sell − buy = per-SCU; per-SCU × supply = headline profit; per-SCU × capacity = realizable).

## Next likely step

Capacity-aware ranking & candidate selection (see TODO.md Major) — client-side re-sort by realizable profit; capacity-aware shortlist so small-ship top-N isn't chosen by capacity-blind raw margin; container_sizes buyability filter; OUT-OF-STOCK / availability handling. After that: net-profit fee term (auto-load fee model, currently overstates profit), then travel-time model asymmetry.

## Merge state

- Proxy merged to main and production-confirmed (2026-05-29).
- commodities_routes integration merged to main and production-confirmed (2026-05-30). Grouped-card board live.
- v0.1 planner retired and removed.
- Spike endpoints (/api/routes-spike, getCommodityRoutes) deleted.
- GitHub Actions CI live (2026-05-30). PR-into-main flow in effect.
- Branch model: operator opens PR from CC session branch into main; CI runs; merge when green. No develop layer while solo. No enforced branch protection.
- Card information-hierarchy redesign merged to main and production-confirmed (2026-06-01).
