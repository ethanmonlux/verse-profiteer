# TRANSFER.md — verse-profiteer

Session-continuity handoff. Start of session: read this + recent CHANGELOG.md, TODO.md, VERIFICATIONS.md (Pending). Flag if this file is stale relative to those.

## Last updated

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
