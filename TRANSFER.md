# TRANSFER.md — verse-profiteer

Session-continuity handoff. Start of session: read this + recent CHANGELOG.md, TODO.md, VERIFICATIONS.md (Pending). Flag if this file is stale relative to those.

## Session state (2026-06-02 — capacity-aware ranking PR)

### SHIPPED + VERIFIED THIS SESSION

- Capacity-aware ranking engine + ship/systems gate (the (b)+(d)+(c) PR). Fixed the rank bug where headline profit didn't match sort order (server ranked at hardcoded 576, client displayed at NaN/Infinity). Now: board is gated behind ship + systems selection; selected ship's SCU is the single capacity source feeding both server ranking and client display. Verified live on production — board descends correctly by headline profit.
- PR-1 (picker fix): SHIPPED + VERIFIED on production. lib/uex.ts added is_cargo + is_ground_vehicle to Vehicle interface; ShipPicker.tsx filter is now `v.is_cargo === 1 && v.is_ground_vehicle === 0` (replaced the wrong `scu >= 40` floor); ship names made visible (unselected name span was missing a text color — now text-text-muted); temporary app/api/debug-vehicles route DELETED. Confirmed on deploy: names readable, ground vehicles + tiny-SCU tail gone, debug route absent.
- IMPORTANT SCOPE NOTE: capacity-aware ranking is SHIP-SCU-BOUND ONLY. It clamps to the ship's full hull SCU and assumes perfect packing. The container_sizes intersection (vehicle.container_sizes ∩ commodity.container_sizes) is NOT done — still overstates realizable profit for mismatched box sizes. Do NOT mark "capacity-aware ranking" complete; it's partial.

### QUEUED — WRITTEN BUT NOT RUN (one PR remaining)

- PR-2 (auto-load label): lib/uex.ts add has_freight_elevator_origin to CommodityRoute interface; Board.tsx add per-route "⚡ auto-load" (when 1) / "hand-load" (when 0) line after buy/sell; add ONE-per-card caveat "auto-load is feed-reported and may be inaccurate" near the travel-time note. Display-only. Own PR. Prompt is fully drafted and ready to run.

### KEY FINDINGS / DECISIONS

- Ship picker: filter by is_cargo type, NOT an SCU floor. CONFIRMED ON DEPLOY that is_cargo in UEX means "has a cargo grid" (liberal — keeps small-cargo fighters like Avenger Titan, M50, Mustang), NOT "dedicated hauler." Kept as-is intentionally: it's the cleanest single-field filter; small-cargo ships are scroll-past noise; tightening would need an arbitrary SCU floor (fights fly-everything preference) or a hand-curated list (rejected maintenance burden). is_cargo===1 also cut the 100i/125a (they are is_cargo:0).
- Backlog footnote: Galaxy Cargo Module appears with scu 0 (an is_cargo module/addon). Harmless (sorts to bottom). If ever tightening, add `&& v.scu > 0` to the picker filter.
- Blank ship names were a CSS bug (missing default text color), not missing data.
- AUTO-LOAD PROXY: has_freight_elevator_origin is the best available proxy for auto-load at the buy terminal. Passed 7/7 ground-truth checks (New Babbage, Area 18, Lorville, Baijini, Port Tressler, ARC-L4, Nyx Gateway — all confirmed auto-load by operator, all flag=1). ZERO confirmed failures. Still a proxy: there is NO true auto-load field and NO hangar field on the route data.
- CORRECTION TO PRIOR RECORD: Terra Mills was NOT a proxy failure. Operator could not FIND the kiosk; auto-load was never confirmed broken there. Any earlier note calling Terra Mills a capability-flag failure is struck.
- AUTO-LOAD MECHANIC (hypothesis): likely tied to enclosed hangar storage — cities (NB, Area 18) and stations have hangars and auto-load; open-pad outposts (Terra Mills) likely cannot. NOT expressible from route data (no hangar field; is_space_station misses cities since cities are on-ground; freight_elevator flags pad outposts too). Proper future fix: /terminals hangar/auto-load field OR hand-maintained outpost pad-only notes (ties to Tier-2 terminal notes).
- HARD STRIP of non-auto-load routes REJECTED: only ~2% of pooled routes are hand-load-origin and they are all low-SCU/low-profit (self-bury under capacity ranking). Strip buys nothing and risks cutting good routes on a proxy false-negative. Flag-don't-strip chosen.
- TERMINAL-LOCATION GUIDE re-prioritized UP (Tier 1 + reconsider Tier 2): operator couldn't find the Terra Mills kiosk mid-run — this, not auto-load, is what broke the Fresh Food run. Tier 1 (system/planet/moon/outpost) is free on the route response. Strong real-play evidence for a feature previously deprioritized as "I know the 'verse."
- Decision #1 (backlog re-prioritization under solo-user goal): RATIFIED. Capacity-aware ranking + system filter = correctness top priority (system filter promoted from demote because operator is Stanton-only and the board headlined un-runnable Pyro routes). Terminal-location guide Tier 2 deferred-but-reconsider. Cargo ledger sits behind the correctness block, not at #1. Decision #2 (ledger graduates to build + CLAUDE.md rule) deferred until correctness block ships.

### STANDING VERIFICATION ITEMS

- Auto-load proxy: field-test outpost ORIGINS specifically (all 7 confirmed terminals were stations/cities; outpost origins untested). Note terminal name + did auto-load work + what the card said.
- Travel-time constants: clean QT wall-clock leg still uncaptured (pre-existing).
- VF-1 (/vehicles field names): name/scu/is_cargo/is_ground_vehicle now live-confirmed (via the now-deleted debug-vehicles dump, 278 vehicles). container_sizes/game_version still only wingman-ai-corroborated.

### BACKLOG ADDITIONS THIS SESSION

- container_sizes intersection (true usable capacity vs. hull SCU) — outstanding half of capacity-aware ranking.
- Ship picker polish: capacity-bar cards shipped, names fixed; own-silhouette icons fast-follow still open; optional `scu > 0` guard for the Galaxy module.
- Tier 1 terminal location on route card (free from response).
- Reconsider Tier 2 hand-authored terminal notes (operator's own outpost kiosk/pad notes).
- Short-board-at-exactly-10 edge (no "capped view" indicator when exactly 10 returned).
- CLAUDE.md note (escalates to operator): verify-first failures should be REPORTED AS BLOCKED, not worked around by pushing debug endpoints (CC created an unprompted /api/debug-vehicles earlier this session).

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
