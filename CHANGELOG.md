# Changelog — verse-profiteer 

Format: one entry per shipped version. Newest on top. CC never edits this in a code prompt — doc updates are a separate prompt after code is committed.

## [2026-06-07]

- Read-path migration shipped: route ranking now reads from routes_mirror via lib/routesRepo.ts (getAllMirroredRoutes) instead of the live UEX per-commodity fan-out. Top-35 margin shortlist removed (D3) — ranking now sees all commodities, eliminating the shortlist metric-mismatch class of bug. Verified on production.
- lib/db/index.ts converted to lazy connection init (getPool()/getDb()): the connection is deferred from import-time to first-use, so next build, CI, and page-data collection no longer require DATABASE_URL at import. Fixes the production Server Components render crash and the CI test-load failure.
- Infra: Vercel reaffirmed as app production host; the stray Railway web-app service was deleted (Railway now runs only Postgres + the refresh worker). Vercel DATABASE_URL set to the Railway public proxy URL (Sensitive, Production + Preview); the worker uses the internal *.railway.internal URL.
- Added throwaway scripts/probe-uex-cadence.ts (probe:uex) and a temporary Railway cron service to measure UEX update cadence. Diagnostic only — to be torn down after measurement.

## [Unreleased]

### Added

- Buy & sell prices on each route row. `price_origin` (buy at origin) and `price_destination` (sell at destination) — already returned by `commodities_routes` but previously untyped/unrendered — added to the `CommodityRoute` interface in `lib/uex.ts` and shown per row as "buy {price_origin}/SCU · sell {price_destination}/SCU" (toLocaleString formatting, existing tokens). Display-only; no new fetch, no ranking change. Verified on production: card math reconciles (sell − buy = per-SCU; per-SCU × supply = headline profit; per-SCU × capacity = realizable). Note for future work: the `commodities_routes` response is richer than the `CommodityRoute` interface (see TODO key finding) — type missing fields from the raw response rather than assuming the interface is complete.
- Profit-per-hour per route. lib/profitPerHour.ts: profitPerHour(route, shipCapacity) = realizableProfit / (estimateTravelMinutes / 60), divide-by-zero guarded, shown as +{value}/hr per row. Derives from travel-time constants so it recomputes on calibration. Display-only; ranking still on total profit. Unit tests in lib/profitPerHour.test.ts.
- Cards collapsed to one primary route by default, with a "+N more routes" inline toggle (per-card expand state) to reveal the rest. Reduces row density on mobile.
- Temporary debug surface /api/verify-qt + DebugQt ("{ } qt" button) to inspect UEX categories and items_attributes, with copy + download-JSON. UNGATED — strip/gate before public traffic.
- Ship-capacity scaling. New lib/realizableProfit.ts: realizableProfit(route, shipCapacity) = profitPerScu × min(shipCapacity, scu_origin, scu_destination), and routeBottleneck(route) = min(scu_origin, scu_destination). Capacity falls back to the route bottleneck when unset/invalid. A global ship-capacity input (in-memory, no persistence) was added; the interactive board moved into a client component (app/Board.tsx) while data fetch/ranking stays in the server component. Each route row shows realizable profit and a "caps at N SCU" indicator when capacity exceeds the route bottleneck. Safety invariant (unit-tested): realizable profit can never exceed the route's total profit — it scales down for undersized ships, never up. Display-only; ranking still on total profit. Unit tests in lib/realizableProfit.test.ts.
- Travel-time estimate per route. New lib/travelTime.ts: estimateTravelMinutes (point estimate = spool + distance/QT-speed + terminal overhead + load/unload×scu_origin) and estimateTravelRange (point ± a flat band). Four calibration constants (QT_SPEED_GM_PER_MIN, SPOOL_CALIBRATE_MIN, TERMINAL_OVERHEAD_MIN, LOAD_UNLOAD_MIN_PER_SCU) plus ESTIMATE_BAND_PCT, all seeded as uncalibrated guesses. Inputs (distance, scu_origin) come free from commodities_routes — no new UEX calls. Each route row shows an estimated time range with an uncalibrated-seed caption. Display-only; ranking unchanged. Unit tests in lib/travelTime.test.ts.
- Profit-per-SCU per route. New lib/profitPerScu.ts: profitPerScu = profit / scu_origin (divide-by-zero guarded, rounded to whole credits). Basis verified against asymmetric-SCU routes — profit is bottlenecked to scu_origin in observed UEX data. Displayed compact as {value}/SCU on every route row. Display-only; ranking unchanged. Unit tests in lib/profitPerScu.test.ts.
- v0.1 route planner. Pure `planRoutes` module (`lib/routePlanner.ts`) pairing lowest valid `price_buy` vs highest valid `price_sell` per commodity into single-leg routes, ranked by profit per unit, default top 50. Typed `CommodityPriceRecord` interface in `lib/uex.ts` replacing the untyped passthrough. `/api/routes` GET handler. Mobile-first card UI on the home page showing commodity, profit/unit, buy to sell with prices, and `date_modified` age with a stale (>30d) warning. Unit tests for the planner (8 cases, vitest). Verified against UEX: Aluminum profit/SCU 1,416 (buy Rod's Fuel 2,584, sell Dudley & Daughters 4,000) matched the live UEX commodity page.
- Server-side UEX proxy: `lib/uex.ts` data-access module (the single place that calls UEX) and `app/api/commodities/route.ts` GET handler returning the `commodities_prices_all` data array. Token and base URL read from env (server-side only); 5-minute fetch cache; env-presence and response-shape guards. Verified against live UEX (2,581 records, spot-check matched site).
- GitHub Actions CI (lint + typecheck + test) running on pull requests into main and on push. Adopted a PR-into-main step; CI status on the PR gates merges by convention (no enforced branch protection).
- Route-count guard: commodities with a single profitable route (per the full UEX response) are quarantined below all corroborated commodities and labelled 'single route — unverified', rather than ranking on an uncorroborated profit figure. Threshold starts at <=1 route.
- Added copy-to-clipboard buttons to both debug panels (DebugRoutes per-card '{ } raw', and DebugPrices '{ } prices').
- Added a temporary ungated '{ } prices' debug button + /api/verify-prices endpoint exposing the raw commodities_prices_all feed (the cheap bulk call the shortlist is built from), for auditing candidate selection against source.
- Added download-as-JSON to both debug panels (DebugRoutes, DebugPrices) alongside copy.

### Changed

- Realizable-profit values are now sign-aware in the route board. The card headline and the per-route realizable line use the loss token (text-loss) when the value is negative and the profit token (text-profit) when it is zero or positive, and no longer prepend a hardcoded "+" (toLocaleString already emits the minus sign). Fixes negative routes rendering as "+-90,500" in profit-green; a loss now reads as a red negative. Display-only, no ranking or math change. Verified on production.
- Replaced the local route planner with UEX commodities_routes integration. New `lib/routes.ts` (`shortlistCommodities` + `getTopRoutes`) selects top-margin commodity candidates from the cached prices feed, fetches real UEX routes for those candidates, and ranks by realizable profit.
- Routes board now renders one card per commodity (top 3 routes each, origin → destination + profit), sorted by best-route profit, showing the top 10 commodities.
- Card information hierarchy redesign (display-only, verified in production). Card headline now shows the primary route's realizable profit (capacity-aware), not total. Per-route green realizable profit shows only when a card is expanded (fixed prior double-count on collapsed cards). Per-row qualifier shows "pick up {haulable} SCU · {supply} available" when capacity is set, "at {bottleneck} SCU max supply" when unset. Total profit demoted behind expand; per-SCU on secondary line.

### Removed

- Retired `planRoutes`, the `Route` interface, `lib/routePlanner.ts`, `lib/routePlanner.test.ts`, and the `/api/routes-spike` endpoint.
- Profit-per-hour removed from the card. Rationale: single-run per-hour overstates sustained earnings (ignores supply refill, empty return leg, and per-shard demand depletion). Per-hour belongs in the future multi-leg loop planner. lib/profitPerHour.ts retained on disk, not deleted.

### Fixed

- Fixed commodity name visibility on cards and removed the unexplained distance line pending travel-time work.

## [0.1.0] — [date]

### Added

- Initial project scaffolding (Next.js 16 + TypeScript + Tailwind v4). Design tokens, .env.example, CLAUDE.md, branch model.
