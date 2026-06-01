# TRANSFER.md — verse-profiteer

Session-continuity handoff. Start of session: read this + recent CHANGELOG.md, TODO.md, VERIFICATIONS.md (Pending). Flag if this file is stale relative to those.

## Last updated

2026-06-01 — shipped card information-hierarchy redesign (verified in production); calibration de-gated from "deferred" to STANDING task; profit-per-hour dropped from card (deferred to loop planner, lib/profitPerHour.ts retained); measured auto-load fee (~190 + ~62/SCU per event, charged on both load and unload), fixed load/unload overhead (~72s at 8 SCU), and reconciled sale proceeds (8 SCU Scrap @ 3,555.86 − 488 fee = 27,958, confirmed to the credit); structural findings: buy-side availability collapses to 0 at city TDDs (city = sell terminus, not buy origin), price flat vs quantity + varies by terminal confirmed, terminal-location friction (internal transit cost). Rental-ROI sourcing clarified: use UEX vehicles_rentals_prices feed, not UEX marketplace. Clean QT wall-clock leg still outstanding. Next likely step: capacity-aware ranking & candidate selection.

## Session summary (2026-06-01)

- Shipped: card information-hierarchy redesign — headline = primary route realizable profit; per-route realizable behind expand; per-row qualifier contextual on capacity; total behind expand; per-SCU secondary. Verified in production.
- Calibration de-gated: travel-time calibration moved from "deferred by operator" to STANDING tuning task in VERIFICATIONS.md. Partial observables captured this session (see below); QT wall-clock leg still outstanding.
- Per-hour dropped from card: single-run per-hour overstates sustained earnings. Deferred to loop planner. lib/profitPerHour.ts retained on disk.
- Measured constants: auto-load fee ~190 + ~62/SCU per event, charged on BOTH load (buy) and unload (sell) — round-trip ~2x; fixed load/unload overhead ~72s at 8 SCU; load and unload are ASYMMETRIC (load overlaps walk-back, unload is serial after terminal travel).
- Sale proceeds reconciled: 8 SCU Scrap @ 3,555.86 − 488 fee = 27,958; balance 779,074 → 807,032 confirmed to the credit.
- Structural findings: buy-side availability routinely collapses to 0 at city TDDs (confirmed: NB TDD ~80 commodities OUT OF STOCK); city TDDs = sell termini, not buy origins; price flat vs quantity + varies by terminal confirmed (Scrap 2,600–4,500 spread, ~73%); terminal-location friction (internal transit to TDD is additive on unload leg).
- Rental-ROI sourcing: use UEX vehicles_rentals_prices feed (has game_version for staleness gating), NOT marketplace player-listings. In-game rental is per-real-time-day with multi-day discounts and full insurance included.

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

0 code verifications pending; 1 calibration run OPEN / STANDING (travel-time constants — partial observables captured 2026-06-01: auto-load fee model, ~72s fixed load/unload overhead, sale proceeds reconciled to the credit; QT wall-clock leg still outstanding); 1 parked (per-ship QT, open only if tool consistently misranks fast vs slow ships).

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
