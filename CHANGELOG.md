# Changelog — verse-profiteer

Format: one entry per shipped version. Newest on top. CC never edits this in a code prompt — doc updates are a separate prompt after code is committed.

## [Unreleased]

### Added

- v0.1 route planner — pure `planRoutes` module (`lib/routePlanner.ts`) pairing low `price_buy` vs high `price_sell` per commodity into single-leg routes ranked by profit per unit; typed `CommodityPriceRecord` interface in `lib/uex.ts` replacing the untyped passthrough; `/api/routes` handler; route-table UI on the home page with stale-leg (`date_modified`) warnings. Unit tests added for the planner (`lib/routePlanner.test.ts`).
- Server-side UEX proxy: `lib/uex.ts` data-access module (the single place that calls UEX) and `app/api/commodities/route.ts` GET handler returning the `commodities_prices_all` data array. Token and base URL read from env (server-side only); 5-minute fetch cache; env-presence and response-shape guards. Verified against live UEX (2,581 records, spot-check matched site).

### Changed

### Fixed

## [0.1.0] — [date]

### Added

- Initial project scaffolding (Next.js 16 + TypeScript + Tailwind v4). Design tokens, .env.example, CLAUDE.md, branch model.
