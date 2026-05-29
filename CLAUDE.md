# verse-profiteer

A Star Citizen route and profit planning tool (cargo first; mining, salvage, and other money loops planned).

## Stack

Next.js / TypeScript / Tailwind on Vercel, UEX API 2.0.

## Architecture

All UEX data access goes through a single module (`lib/uex.ts`) so the caching/fetch mechanism can be swapped later (e.g. Vercel fetch cache now, possible Railway + DB backend later) without touching route handlers.

## UEX Hygiene Rules

- `UEX_BASE_URL` env var only — never hardcoded.
- `UEX_API_TOKEN` server-side only; never in the client bundle or logs.
- All UEX calls go through server-side route handlers.
- Default to `_all` bulk endpoints; no per-terminal loops.
- Cache TTLs: 5 min prices, 1 hr terminals/purchases, 12 h distances/rentals, 1 day defs.

## Branch Model

Solo workflow: CC writes to a session branch; operator merges it directly into `main`. No `develop` layer at this time. `main` = production, auto-deploys on Vercel on push. Revisit adding `develop` → preview if the project grows past solo.
