# verse-profiteer

A Star Citizen route and profit planning tool (cargo first; mining, salvage, and other money loops planned).

## Stack

Next.js / TypeScript / Tailwind on Vercel, UEX API 2.0.

## Architecture

All UEX data access goes through a single module (`lib/uex.ts`) so the caching/fetch mechanism can be swapped later (e.g. Vercel fetch cache now, possible Railway + DB backend later) without touching route handlers. Route data is consumed from UEX's `commodities_routes` endpoint rather than computed locally; `lib/uex.ts` remains the sole UEX access point.

## UEX Hygiene Rules

- UEX is the SOLE upstream data source, by design. verse-profiteer fetches directly from the UEX API (isolated in `lib/uex.ts`) and computes all route ranking, profit, travel-time, and confidence/staleness logic itself. Do NOT add dependencies on third-party Star Citizen tools (e.g. Schaulers, SC Trade Tools) as data sources. Rationale: (1) those tools are themselves UEX consumers — routing through them is strictly worse than fetching UEX directly (UEX → third party → us vs UEX → us); (2) they expose no public/stable API, so any integration would mean scraping undocumented endpoints with no recourse when they change; (3) the route ranking / profit / confidence calculations are the project's whole point and primary differentiation — offloading them to another tool's finished output defeats the purpose and would make this a reskin; (4) the single-isolated-upstream assumption is what the caching TTL matrix, staleness gating, and `lib/uex.ts` isolation rule are all built around. Reference implementations of others' logic (e.g. sc-cargo.space container-fit) may be consulted as REFERENCE only — reimplemented in our own code, never called as a service.
- `UEX_BASE_URL` env var only — never hardcoded.
- `UEX_API_TOKEN` server-side only; never in the client bundle or logs.
- All UEX calls go through server-side route handlers.
- Default to `_all` bulk endpoints; no per-terminal loops.
- Cache TTLs: 5 min prices, 5 min routes, 1 hr terminals/purchases, 12 h distances/rentals, 1 day defs.

## Branch Model

Solo workflow: CC writes to a session branch; operator opens a PR into `main`; CI (lint + typecheck + test) runs on the PR; operator merges when CI is green. `main` = production, auto-deploys on Vercel on push. No branch protection — the green/red CI status on the PR is the signal; operator enforces it by not merging red. No `develop` layer at this time.

## Debug Surfaces

Any debug surface exposing a raw data pull ships with both copy-to-clipboard and download-as-JSON from the start (copy for small pulls, download for large). Not added later.
