# Changelog — verse-profiteer

Format: one entry per shipped version. Newest on top. CC never edits this in a code prompt — doc updates are a separate prompt after code is committed.

## [Unreleased]

### Added

- Server-side UEX proxy: `lib/uex.ts` data-access module (the single place that calls UEX) and `app/api/commodities/route.ts` GET handler returning the `commodities_prices_all` data array. Token and base URL read from env (server-side only); 5-minute fetch cache; env-presence and response-shape guards. Verified against live UEX (2,581 records, spot-check matched site).

### Changed

### Fixed

## [0.1.0] — [date]

### Added

- Initial project scaffolding (Next.js 16 + TypeScript + Tailwind v4). Design tokens, .env.example, CLAUDE.md, branch model.
