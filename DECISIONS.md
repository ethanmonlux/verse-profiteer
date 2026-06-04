# DECISIONS.md — verse-profiteer

Ratified architecture decisions. An entry here is LOCKED — decided, justified, and safe to build on. Escalation-class changes (persistence, caching cadence, ranking math, ROI math, auth) get an entry here BEFORE implementation, so there is no drift between a decision made in chat and what ships.

Format per decision: what was decided, why, what class it falls in, status.

---

## D1 — Postgres persistence for operator data
**Decided:** 2026-06-03. **Class:** persistence / architecture. **Status:** RATIFIED, unbuilt.

Operator data — saved plans, flight history, derived stats — lives in Postgres. Justified by persistent history and user stats surviving sessions. NOT justified by rate limits (see D2 correction). Operator has already built and run this exact stack (FastAPI + Postgres + Railway) on a prior project, so infra cost and complexity are not a barrier. Stack is all-TypeScript: Vercel Cron → Next route handler → Postgres. GOATS patterns reused (pooling, JSONB blob storage, scheduled refresh, tenant_id identity column), reimplemented in TS — not its Python runtime. The CLAUDE.md deploy-model section stays valid; the Postgres/Cron persistence layer is added to it.

## D2 — UEX mirror refresh cadence
**Decided:** 2026-06-03. **Class:** caching-TTL (escalation-gated). **Status:** RATIFIED, unbuilt.

The UEX dataset is mirrored in Postgres and refreshed by a scheduled background job, not on user page-loads. Cadence matches UEX upstream caches: prices ~5min, terminals ~12h, routes ~30min. Routes use a BLIND ~30-min poll — the probe (2026-06-03) confirmed commodities_routes rows carry NO date_modified, so refresh-on-change is not possible; date_added is row-creation, not freshness. Routes are fetched by paced fan-out (one call per id_commodity, ~122 calls) throttled under the 120/min cap (~1 call/600ms, about 75s total). The shared cap gets SAFER, not riskier: user loads read Postgres and stop hitting UEX; only the one paced job touches UEX. Any change to this cadence is caching-TTL-class — escalate before prompting.

CORRECTION RECORDED: the belief that changing filters (systems / auto-load / ship size) triggers fresh UEX calls is FALSE. All three are applied in-memory after the cached fetch (verified in lib/routes.ts). Filter permutations cost zero new calls until TTL lapses. "Store UEX in DB to avoid rate limits" was therefore dropped as a reason for D1 — but it pointed at the real adjacent problem D3 fixes.

## D3 — Full mirror replaces the top-35 shortlist trim
**Decided:** 2026-06-03. **Class:** ranking-math (escalation-gated). **Status:** RATIFIED, unbuilt.

Ranking and filtering run against the WHOLE mirrored routes dataset, not a top-35 slice taken before filters apply. The current board shortlists the top 35 commodities by raw margin BEFORE filters run, so the best route for a given ship/systems combination can be silently missing (a commodity ranked about 40 on raw margin could be the best realizable route for a specific ship and never enter the pool). Mirroring the whole dataset and ranking against all of it guarantees the best route per situation. This is a ranking-math-class change: REVIEW + VERIFY at merge, Pending VERIFICATIONS.md entry, spot-check a mirror row against a live UEX query.

CONSEQUENCE: because nothing computed is stored (see Spine Rule), ranking computes realizable profit across the full mirror at request time, every request. Cheap today (top-35, in-memory); heavier against the full dataset. Handled via indexed columns on ranking INPUTS in the mirror schema. The ranking path is now the performance-sensitive surface.

## D4 — Persistence layer: Drizzle ORM + Railway Postgres
**Decided:** 2026-06-04. **Class:** persistence / architecture. **Status:** RATIFIED, unbuilt.

- **ORM:** Drizzle, chosen for schema-as-TypeScript as a single source of truth for both migrations and the future typed query accessor (avoids SQL/types drift).
- **Driver:** node-postgres (pg) with a shared Pool, selected over postgres-js for better-documented Vercel serverless pooling and parity with prior GOATS pg.Pool usage.
- **Migration workflow:** generate + migrate (drizzle-kit). Never push — push is dev-only and this DB holds real data.
- **Schema location:** lib/db/schema.ts. Generated SQL: ./drizzle (committed, never hand-edited).
- **Mirror tables** (routes_mirror, terminals_mirror) are GLOBAL — no tenant_id. One UEX truth shared across all users. tenant_id belongs on the spine (operator data) only.
- **Hybrid table shape:** typed/indexed columns on ranking/filter/join inputs + raw jsonb (verbatim UEX row, source of truth) + refreshed_at.
- **container_sizes** stored as integer[], normalized from the UEX comma-string at refresh-write time (raw jsonb retains the original); normalization includes a defensive fallback to NULL on any unexpected token, never a silent drop or crash.
- **prices_mirror deferred:** D3 dissolves the margin shortlist that commodities_prices_all fed, leaving no consumer. Future price overrides are operator observations and belong on the spine, not this mirror.
- **DB client/pool module** deliberately not built in this beat — it lands with its first caller (the refresh job).
- **Connection:** Railway PUBLIC url (autorack.proxy.rlwy.net:PORT) is required for both local .env and Vercel, because both run outside Railway's network. The .railway.internal host does NOT resolve from Vercel or local and is unused by this project.

## Routes-source fork — resolved (supports D2/D3)
**Decided:** 2026-06-03. **Status:** RATIFIED.

Mirror commodities_routes via paced fan-out (Option R), NOT derive routes locally from commodities_prices_all (Option P). Option P was rejected as reimplementing the route math the pivot deliberately chose to consume from UEX. Routes are slower-moving than prices and UEX caches them about 30min upstream, so a ~30-min mirror cadence is the sane floor.

## Probe findings (2026-06-03) — inputs to the mirror schema
Record of what the live commodities_routes probe returned, to inform D2/D3 build:

- No-param call returns HTTP 400 (missing_one_required_inputs). id_commodity is required — fan-out confirmed, no all-rows shortcut.
- No date_modified on route rows. date_added (Unix ts) is row-creation, not freshness. Blind 30-min poll confirmed (D2).
- game_version_origin / game_version_destination ARE on route rows — a patch-boundary staleness signal available for routes (previously catalogued only on rentals).
- Fields to promote to typed/indexed columns beyond the original schema list, because they are ranking/filter inputs: scu_reachable (UEX's own bottleneck field — compare against the three-way min), status_origin / status_destination (buy/sell availability), container_sizes_origin / destination (needed as typed columns for the container intersection capacity work).
- has_freight_elevator_origin / destination is on the route row but stays STRUCK as an auto-load proxy (disproven 2026-06-02; is_auto_load on /terminals is authoritative). The auto-load filter still requires the terminals_mirror join.

---

See TRANSFER.md for the full design narrative and the Spine Rule (Plan/Leg/Item type). The Spine Rule and persistence deploy-model change are folded into CLAUDE.md separately (next doc beat).

## Open item — doc-trailer / stop-hook conflict (2026-06-04, unresolved)
The repo's stop hook auto-commits and pushes on task completion. This collides with the doc-only prompt trailer "Do not run any commands," because commit and push are commands. CC correctly halts and asks rather than overriding the instruction. Resolution options (own beat, escalation-class — the trailer is defined in project instructions): (a) reword the doc trailer to "Do not run lint, typecheck, or build; allow the commit/push stop hook to run"; (b) accept the per-prompt commit question. Recommendation: (a). Not yet actioned.
