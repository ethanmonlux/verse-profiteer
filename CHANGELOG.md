# Changelog — verse-profiteer

Format: one entry per shipped version. Newest on top. CC never edits this in a code prompt — doc updates are a separate prompt after code is committed.

## [Unreleased]

### Added

- v0.1 route planner. Pure `planRoutes` module (`lib/routePlanner.ts`) pairing lowest valid `price_buy` vs highest valid `price_sell` per commodity into single-leg routes, ranked by profit per unit, default top 50. Typed `CommodityPriceRecord` interface in `lib/uex.ts` replacing the untyped passthrough. `/api/routes` GET handler. Mobile-first card UI on the home page showing commodity, profit/unit, buy to sell with prices, and `date_modified` age with a stale (>30d) warning. Unit tests for the planner (8 cases, vitest). Verified against UEX: Aluminum profit/SCU 1,416 (buy Rod's Fuel 2,584, sell Dudley & Daughters 4,000) matched the live UEX commodity page.
- Server-side UEX proxy: `lib/uex.ts` data-access module (the single place that calls UEX) and `app/api/commodities/route.ts` GET handler returning the `commodities_prices_all` data array. Token and base URL read from env (server-side only); 5-minute fetch cache; env-presence and response-shape guards. Verified against live UEX (2,581 records, spot-check matched site).

### Changed

- Replaced the local route planner with UEX commodities_routes integration. New `lib/routes.ts` (`shortlistCommodities` + `getTopRoutes`) selects top-margin commodity candidates from the cached prices feed, fetches real UEX routes for those candidates, and ranks by realizable profit.
- Routes board now renders one card per commodity (top 3 routes each, origin → destination + profit), sorted by best-route profit, showing the top 10 commodities.

### Removed

- Retired `planRoutes`, the `Route` interface, `lib/routePlanner.ts`, `lib/routePlanner.test.ts`, and the `/api/routes-spike` endpoint.

### Fixed

- Fixed commodity name visibility on cards and removed the unexplained distance line pending travel-time work.

## [0.1.0] — [date]

### Added

- Initial project scaffolding (Next.js 16 + TypeScript + Tailwind v4). Design tokens, .env.example, CLAUDE.md, branch model.
