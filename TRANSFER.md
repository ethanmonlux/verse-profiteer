# TRANSFER.md — verse-profiteer

Session-continuity handoff. Start of session: read this + recent CHANGELOG.md, TODO.md, VERIFICATIONS.md (Pending). Flag if this file is stale relative to those.

## Last updated

2026-05-29 — v0.1 route planner shipped (lib/routePlanner.ts, /api/routes, home-page table, unit tests). Session closed.

## Current state

- Repo scaffolded and deployed to Vercel (verse-profiteer.vercel.app). Next.js 16 / React 19 / Tailwind v4 (note: NOT Next 14 — the addendum’s code snippets predate this; verify framework APIs against installed version, see AGENTS.md).
- v0.1 route planner SHIPPED: lib/routePlanner.ts (pure planRoutes — cartesian buy×sell per commodity, ranked by profit/unit, default top 50); typed CommodityPriceRecord interface in lib/uex.ts; /api/routes GET handler; home page (app/page.tsx) server component rendering the route table with stale-leg warnings (date_modified > 30d → text-warning). Unit tests in lib/routePlanner.test.ts (vitest, 8 cases). Pending verification: v0.1 ranking math (see VERIFICATIONS.md).
- UEX proxy DONE + verified: lib/uex.ts (single data-access module) + app/api/commodities/route.ts. Returns commodities_prices_all as a JSON array. Env-presence + response-shape guards in place. 5-min fetch cache (next: { revalidate: 300 } — was accepted by Next 16 lint/typecheck; confirm caching actually engages if traffic ever pressures the 120/min cap).
- Env vars set in Vercel (Production + Preview): UEX_BASE_URL=<https://api.uexcorp.uk/2.0>, UEX_API_TOKEN (marked Sensitive).

## Decisions affecting caching / math / auth

- UEX base URL: UEX_BASE_URL env var, .uk confirmed working, .space fallback unused.
- Bulk endpoints only; commodities_prices_all confirmed = 2,581 records / 122 commodities / 133 terminals, both market sides, in one call.
- Data access isolated in lib/uex.ts so the cache/fetch mechanism (Vercel fetch cache now → possible Railway + DB later) can be swapped without touching route handlers. v0.1 = Vercel fetch cache; DB-backed Railway backend parked as a v0.2 option if multi-user load pressures the shared cap.
- Cache TTLs locked to addendum §A.4 (5min prices / 1hr terminals+purchases / 12h distances+rentals / 1day defs).
- Travel-time defaults: QT_SPEED_GM_PER_MIN=12, SPOOL_CALIBRATE_MIN=0.4, TERMINAL_OVERHEAD_MIN=4 — placeholders; calibration is post-v0.1 (VERIFICATIONS Calibration Runs).
- STALENESS FINDING: commodities_prices_all has date_modified but NO game_version field (confirmed against live feed). Staleness gating for this endpoint uses date_modified only. game_version exists on vehicles_rentals_prices, so revisit when that endpoint is wired.

## Open operator decisions

- Monetization: PAUSED. Not blocked-unknown anymore — peers (UEX, Shebuka) use a donation model (free tool + cosmetic perks, no feature gates), which is the viable path vs. the paywall CIG’s FAQ prohibits. Resume decision is operator’s. Not legal advice.

## Prompts written but not run

(none — Prompt 1 scaffold and Prompt 2 + 2a proxy all run and verified)

## Pending verification count

1 code verification pending (v0.1 route planner ranking math — see VERIFICATIONS.md). UEX proxy verification COMPLETED. 2 calibration runs parked (open when travel-time wiring merges).

## Next likely step

Travel-time wiring (TODO Major) — distance-pair collection from candidate routes, terminals_distances fetch, travelTimeMinutes integration into ranking. Requires propose → operator explain-back → prompts. Keep monetization untouched while paused.

## Merge state

- Proxy merged to main and confirmed: /api/commodities returns live data on the production deploy (verified 2026-05-29). UEX proxy meets the full Done Definition.
- Branch model: operator merges CC session branches directly into main (no develop layer while solo). Diverges from any develop -> main wording; CLAUDE.md and project instructions updated to match.
