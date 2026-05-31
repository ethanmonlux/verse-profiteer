# TRANSFER.md — verse-profiteer

Session-continuity handoff. Start of session: read this + recent CHANGELOG.md, TODO.md, VERIFICATIONS.md (Pending). Flag if this file is stale relative to those.

## Last updated

2026-05-31 — shipped ship-capacity scaling (display-only realizable profit, three-way min, verification PENDING); found a shortlist available-SCU bug (folded into outlier guard v2); logged competitor anti-pattern + realizable-profit floor + ship-picker/flip-money backlog.

## Current state

- Repo deployed to Vercel (verse-profiteer.vercel.app). Next.js 16 / React 19 / Tailwind v4 (NOT Next 14 — verify framework APIs against installed version, see AGENTS.md).
- UEX proxy DONE + verified: lib/uex.ts (single data-access module) + app/api/commodities/route.ts, returns commodities_prices_all. Env/token/base-URL guards in place, 5-min fetch cache.
- commodities_routes integration SHIPPED + verified: lib/routes.ts (shortlistCommodities + getTopRoutes), /api/routes serving UEX route data, grouped-card board on app/page.tsx (top 10 commodities, top 3 routes each, sorted by best-route profit). Verified against UEX (Atlasium, 2026-05-30).
- Travel-time estimate SHIPPED: lib/travelTime.ts (estimateTravelMinutes + estimateTravelRange), point estimate + flat-band range per route row, four calibration constants + ESTIMATE_BAND_PCT seeded as uncalibrated guesses, inputs distance/scu_origin free from commodities_routes — no new UEX calls. Display-only; ranking unchanged. Estimator math verified 2026-05-31 against raw routes (E'tam id 29, Dymantium id 127). Unit tests in lib/travelTime.test.ts. Calibration OPEN but deferred by operator (see VERIFICATIONS.md Pending).
- Profit-per-SCU SHIPPED: lib/profitPerScu.ts (profitPerScu = profit / scu_origin, divide-by-zero guarded, rounded to whole credits), compact {value}/SCU per route row. Divisor verified against asymmetric-SCU routes. Display-only; ranking unchanged. Math verified 2026-05-31 against raw (E'tam id 29). Unit tests in lib/profitPerScu.test.ts.
- v0.1 planner RETIRED: planRoutes, Route interface, lib/routePlanner.ts, lib/routePlanner.test.ts removed. Verification entry remains in VERIFICATIONS.md as historical record.
- Investigation spike DELETED: getCommodityRoutes spike code and /api/routes-spike removed.
- GitHub Actions CI LIVE: .github/workflows/ci.yml — lint + typecheck + test on every PR into main and on push. PR-into-main flow now in effect; CI green/red on the PR is the merge signal.
- Route-count guard SHIPPED + VERIFIED (threshold <=1, quarantine-and-label): `lib/routes.ts` + `app/page.tsx`. Commodities with a single profitable route are quarantined below all corroborated commodities and labelled 'single route — unverified'. Verified 2026-05-30 via raw-data audit (Osoian Hides correctly isolated; see VERIFICATIONS.md Completed). Outlier guard v2 (SCU / origin-count signals) logged as the real follow-up — see TODO.md Major.
- Debug verify-button SHIPPED (ungated raw UEX passthrough): `app/api/verify/route.ts` (GET endpoint) + `app/DebugRoutes.tsx` (per-card `{ } raw` toggle client island) + copy-to-clipboard button on the route panel. Marked TEMPORARY DEBUG SURFACE.
- Debug prices button SHIPPED: `app/api/verify-prices/route.ts` (GET endpoint, returns raw commodities_prices_all array) + `app/DebugPrices.tsx` (`{ } prices` toggle, rendered below the subhead on the home page). Marked TEMPORARY DEBUG SURFACE. Strip-before-public trigger now covers all three surfaces: /api/verify (raw routes), /api/verify-prices (raw prices feed), and both debug buttons including copy — before public launch / monetization unpause.
- Ship-capacity scaling SHIPPED (lib/realizableProfit.ts realizableProfit + routeBottleneck; board split into server + app/Board.tsx client with in-memory capacity input; per-row realizable + cap indicator; ≤-total-profit invariant tested). Display-only, ranking unchanged. Verification PENDING (state-sensitive) — see VERIFICATIONS.md.

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

(none — TODO.md rewrite and CLAUDE.md TTL+architecture edits were written and run this session)

## Pending verification count

1 code verification PENDING (ship-capacity scaling); 1 calibration run OPEN but deferred (travel-time); 1 parked (per-ship QT).

## Next likely step

Travel-time and profit-per-SCU shipped this session. Next backlog in priority order (see TODO.md Major):
- Ship-capacity scaling (DESIGN-SPEC, state-sensitive) — add ship-capacity input, show realizable profit = profitPerScu × min(capacity, scu_origin, scu_destination), cap indicator when bottleneck is below capacity. Resolves the per-SCU vs total-profit contradiction visible in the live board.
- Outlier guard v2 — design session for SCU / origin-count trust signals (route-count is a weak proxy; live E'tam data confirms it: 44 routes across 3 origins, profit driven by scu_origin 67 vs 22 vs 7 — SCU is the right signal).
- Profit-per-hour ranking (strongly user-validated; depends on travel-time constants being calibrated).
- Multi-leg loop / chain routing (graph/pathfinding feature; needs own design-session; crowding caveat noted).

## Merge state

- Proxy merged to main and production-confirmed (2026-05-29).
- commodities_routes integration merged to main and production-confirmed (2026-05-30). Grouped-card board live.
- v0.1 planner retired and removed.
- Spike endpoints (/api/routes-spike, getCommodityRoutes) deleted.
- GitHub Actions CI live (2026-05-30). PR-into-main flow in effect.
- Branch model: operator opens PR from CC session branch into main; CI runs; merge when green. No develop layer while solo. No enforced branch protection.
