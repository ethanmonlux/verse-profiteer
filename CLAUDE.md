# verse-profiteer

A Star Citizen route and profit planning tool (cargo first; mining, salvage, and other money loops planned).

## Stack

Next.js / TypeScript / Tailwind on Vercel, UEX API 2.0.

## Architecture

All UEX data access goes through a single module (`lib/uex.ts`) so the caching/fetch mechanism can be swapped later (e.g. Vercel fetch cache now, possible Railway + DB backend later) without touching route handlers. Route data is consumed from UEX's `commodities_routes` endpoint rather than computed locally; `lib/uex.ts` remains the sole UEX access point.

Persistence (ratified, see DECISIONS.md D1): operator data — saved plans, flight history, derived stats — lives in Postgres. The UEX dataset is mirrored into Postgres by a scheduled job (Vercel Cron → Next route handler → Postgres) rather than fetched on user page-loads; user reads hit Postgres, only the background job touches UEX. The refresh job calls `lib/uex.ts` functions — it NEVER builds UEX URLs itself, so the single-access-point rule holds. Stack is all-TypeScript (no separate Python/FastAPI backend).

## Mirror Refresh

- The UEX mirror is populated by `scripts/refresh-mirror.ts`, run as a scheduled Railway service (every 30 min), NOT by Vercel cron (Hobby limits make Vercel cron unsuitable — see TRANSFER/DECISIONS).
- Refresh cadence (30 min) and the paced fan-out rate (10/6s) are caching/rate-limit decisions — changing either is escalation-gated.
- Mirror writes go only through `lib/mirror.ts`; the worker is the only caller that writes to the mirror.
- The mirror refresh worker connects via the Railway PUBLIC `DATABASE_URL` with Pool SSL (`rejectUnauthorized: false`). Do not switch the worker to the internal host without re-testing — internal networking has failed with ETIMEDOUT (see DECISIONS.md D5).
- Inserts are chunked (100/statement). The worker keeps a `select 1` startup probe to distinguish infra failures from code failures.
- Mirror tables hold regenerable UEX cache; the Postgres instance can be deleted/recreated with zero data loss (migrations re-apply automatically on the next worker run; repoint worker `DATABASE_URL`).

## Spine Rule

The Plan/Leg/Item type (see DECISIONS.md / TRANSFER.md) is a ratified architectural fixture: the shared spine for route-stacking, the cargo ledger, and the live re-router. The spine stores INPUTS and OBSERVATIONS only. Every profit, distance, and duration number is DERIVED ON READ, never persisted. Two sources of truth for one number is the exact "wrong number, lost trust" failure this rule prevents. The ledger stores actual prices/scu (observations, not derivable); profit from them is still computed, never stored. Loop-closure is derived, never a stored flag.

### Spine Tables (DECISIONS D10)
Four tables in `lib/db/schema.ts`:
- `plans` — a trip (draft/active/completed/abandoned): ship_capacity_scu (typed input now, ship-ref later), allowed_systems, start_terminal_id, tenant_id (default 'operator').
- `legs` — D7's atom: a FIXED origin->destination pair + chosen cargo (id_commodity, null = deadhead) + source_activity (trade now; mining/salvage/refining later). NO status column — the ledger is the lock. A leg's destination is fixed; leftover cargo carried onward spawns a NEW leg, never mutates an existing one.
- `items` — the actuals ledger: acquire/dispose movements (scu, unit_price, fee, terminal, disposition sale/dump/loss). Loop-agnostic; mined cargo is an acquire with null unit_price. Carry-state = sum acquire - sum dispose, derived.
- `price_observations` — manual ground-truth sightings (D9): buy/sell price + scu_available at a terminal; supersede UEX when newer than its date_modified. source 'manual' now, 'ocr' later.
Status/activity/disposition/source are plain `text` (app-validated), NOT pgEnum — keeps adding loops migration-free. Derived on read, never columns: carry-state, realized profit, per-leg profit, current position, locked-leg set, UEX estimate + estimate-vs-actual, effective ranking price, aUEC/hr / distance / duration.

## UEX Hygiene Rules

- UEX is the SOLE upstream data source, by design. verse-profiteer fetches directly from the UEX API (isolated in `lib/uex.ts`) and computes all route ranking, profit, travel-time, and confidence/staleness logic itself. Do NOT add dependencies on third-party Star Citizen tools (e.g. Schaulers, SC Trade Tools) as data sources. Rationale: (1) those tools are themselves UEX consumers — routing through them is strictly worse than fetching UEX directly (UEX → third party → us vs UEX → us); (2) they expose no public/stable API, so any integration would mean scraping undocumented endpoints with no recourse when they change; (3) the route ranking / profit / confidence calculations are the project's whole point and primary differentiation — offloading them to another tool's finished output defeats the purpose and would make this a reskin; (4) the single-isolated-upstream assumption is what the caching TTL matrix, staleness gating, and `lib/uex.ts` isolation rule are all built around. Reference implementations of others' logic (e.g. sc-cargo.space container-fit) may be consulted as REFERENCE only — reimplemented in our own code, never called as a service.
- `UEX_BASE_URL` env var only — never hardcoded.
- `UEX_API_TOKEN` server-side only; never in the client bundle or logs.
- All UEX calls go through server-side route handlers.
- Default to `_all` bulk endpoints; no per-terminal loops.
- Cache TTLs: 5 min prices, 5 min routes, 1 hr terminals/purchases, 12 h distances/rentals, 1 day defs.

## Persistence / Migrations

- DB schema is defined in TypeScript at `lib/db/schema.ts`.
- Schema changes flow: edit `lib/db/schema.ts` → `npm run db:generate` (writes SQL to `./drizzle`) → commit. The migration is APPLIED AUTOMATICALLY by the refresh worker on its next startup (it runs `migrate()` through the worker's pool before any table access — the programmatic equivalent of `db:migrate`, idempotent). Never `drizzle-kit push`. (Amends D4; see DECISIONS D11.)
- CC never hand-edits files in `./drizzle` (generated SQL) and never runs migrate — migrations apply on the next worker run after merge.
- DESTRUCTIVE migrations (DROP/ALTER on a table holding real data) are the exception: auto-apply removes the human gate, so for those, pause and apply/verify by hand before merging.
- `DATABASE_URL` uses the Railway PUBLIC connection string in all environments (local `.env`, Vercel Production + Preview, Sensitive). Never the `.railway.internal` host.
- Mirror tables are global UEX cache; `tenant_id` is spine-only.

## Branch Model

Solo workflow: CC writes to a session branch; operator opens a PR into `main`; CI (lint + typecheck + test) runs on the PR; operator merges when CI is green. `main` = production, auto-deploys on Vercel on push. No branch protection — the green/red CI status on the PR is the signal; operator enforces it by not merging red. No `develop` layer at this time.

Branch-off-main must happen BEFORE a fresh-start prompt runs. CC builds on whatever branch is currently checked out — starting fresh work without first branching off main has caused unrelated changes to ride along on the wrong branch.

## Debug Surfaces

Any debug surface exposing a raw data pull ships with both copy-to-clipboard and download-as-JSON from the start (copy for small pulls, download for large). Not added later.

## Verification Discipline

When a verify-first step cannot be completed (a needed live call fails, data is unavailable), report the step as BLOCKED and stop. Do NOT work around it by adding a debug endpoint or substituting an unverified assumption. A blocked verification is a surfaced state, not a problem to engineer around.
