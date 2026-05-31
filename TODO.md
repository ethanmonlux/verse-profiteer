# TODO.md — verse-profiteer

Severity: Blocker (broken, blocks usage) / Critical (significant gap, affects correctness or security) / Major (should ship soon) / Minor (nice to have) / Chore (maintenance, docs, cleanup).
New items in priority order. Completed items move to the bottom, organized by original severity — never left checked inline.

## Blocker

(none)

## Critical

- IP / monetization viability — RESOLVE BEFORE ANY PAYWALL WORK. Status: PAUSED by operator. CIG's Fankit/Fandom FAQ (checked 2026-05) lists prohibited uses incl. for-profit, paywalls, donations. Established peers (UEX, Shebuka's Datarunner) run a DONATION model instead: tool fully free, supporters get cosmetic/recognition perks only (badge, name in credits), no feature gating. That's the viable path if monetization resumes — paywalling the differentiator features is the one model peers specifically avoid. Operator decision still required before any monetization work; not legal advice.

## Major

- Staleness gating — AMENDED: commodities_prices_all does NOT include a game_version field (confirmed against live feed 2026-05-29). Gate on date_modified threshold only for this endpoint; surface in UI as warnings not silent skips. Revisit game_version if/when an endpoint that carries it is used (e.g. vehicles_rentals_prices does include game_version). Note: a patch boundary is a mass-staleness event (all prices suspect for a day or two while UEX catches up), distinct from per-cell aging.
- User price overrides — let players submit the live in-game price they see standing at a terminal, overriding the UEX feed value for ranking. Rationale: UEX has no game API; prices are crowdsourced from players screenshotting terminals (e.g. Datarunner OCR), so a feed price is only as fresh as the last player to visit and report that terminal — backwater terminals go stale (some cells are months old). The player at the terminal now is the freshest source. DESIGN-SPEC, v0.2+: new data source feeding ranking math (state-sensitive) plus a new trust surface. Open questions: storage (ties to the parked Railway+DB option), conflict rule (user vs feed — newer wins? user always wins?), per-user vs shared, override staleness/expiry, whether to write back to UEX. Do NOT fold into v0.1. ELEVATED priority: confirmed no official RSI market API exists or is planned, and UEX is the best upstream source available — so player-submitted live prices are the single genuine data-quality edge.
- Profit-per-hour ranking — board ranks by total realizable profit; switch ranking basis to profit per hour once travel-time constants are wired. Strongly user-validated: a hauler comment laid out Time = Load + Travel + Admin time and showed raw-profit routes that fail once load time dominates.
- Profit per SCU display — surface per-SCU profit on each route row alongside total profit. Data already available from commodities_routes. Repeatedly requested by users (per-SCU breakdown, per-stop profit).
- Multi-leg loop / chain routing — plan trade chains where each leg's sell terminal is the next leg's buy point, minimizing empty legs, showing full-loop total profit. This is a graph/pathfinding feature over the route data, not a tweak to the current board; needs its own design-spec. User-requested ('full rundown of the loop', 'fly to your next good location').
  - Note — any loop/chain routing will need ship cargo capacity and current location as inputs (confirmed by haulerapp.space's model).
  - Note — Crowding caveat: experienced haulers deliberately avoid the most-surfaced routes (they get stripped/contested). Consider this when designing how prominently top routes are ranked/surfaced; a 'less contested' view may be worth offering.
- Outlier guard v2 — replace/augment route-count with a stronger trust signal. Route count is inflated by destination fan-out (one buy point × many sell destinations = many routes), so it is a weak proxy for corroboration. The real signals are bottleneck SCU (scu_origin / scu_destination — a route resting on ~1 SCU of supply is untrustworthy regardless of route count) and distinct origin-terminal count (single-source commodities are uncorroborated). The shipped <=1 route-count guard is a deliberate first-pass stopgap that catches only the most degenerate case (e.g. Osoian Hides). Evaluate SCU/origin-count against live data in its own design session. Live evidence (2026-05-31): raw E'tam (id 29) had 44 routes across only 3 origin terminals, with realizable profit driven by scu_origin (67 vs 22 vs 7), not by route count — confirms route count is inflated by destination fan-out and is a weak trust proxy; the real signals are bottleneck SCU and distinct origin-terminal count.
## Minor

- Range model v2 — replace the flat ESTIMATE_BAND_PCT with per-constant min/max that propagate, so band width emerges from which constants are uncertain (load-heavy routes get wider bands). Earned once calibration data exists; flat band is the v1 stopgap.
- Capital-aware ranking — largely provided by UEX (investment field on commodities_routes). Remaining: expose and filter on investment + player SCU capacity.
- Custom filters layer — filter UEX routes by origin terminal, ship/SCU capacity, capital, and time. UEX commodities_routes input params (id_terminal_origin, investment, destination) back this. The chat-box plugs in here. v0.2+.
- Chat-box route planner — natural-language input ('I have X ship, X credits, X time, at X station') parsed to UEX route params by an LLM; deterministic ranking stays in code. Depends on the filters layer and overrides. v0.2+.
- Page metadata still says "Create Next App" — update the title/description in `app/layout.tsx` to Verse Profiteer. Surgical, presentation-only.
- Rental ROI card (addendum §C) — stretch goal, gate on price_rent_* presence + staleness. Note: rentals endpoint DOES carry game_version, unlike commodities.
- Patreon-readiness checklist (BLOCKED on Critical IP/monetization item; PAUSED — do not begin until resumed and resolved):
  - If donation model: supporter badge / name-in-credits / cosmetic perks only — NO feature gates.
  - Server-side Patreon OAuth flow (no client-side token handling)
  - Webhook handler for membership changes (cancel, downgrade, fail-charge)
  - Rate-limit posture review — confirm 120/min headroom across expected concurrent users
  - Disclaimers: data-staleness + "numbers can be wrong / SC patches reshuffle economy" on every ROI/profit surface
  - Privacy policy covering Patreon identifier storage
  - Required CIG attribution/disclaimer + Fankit terms compliance on any public surface
- Per-ship QT speeds — only if calibration shows fast/slow ships consistently misranked.
- Surface richer per-record fields the feed already returns but the proxy passes through untyped: status_buy / status_sell, SCU inventory, system split (Stanton/Pyro), quality/CS. Route planner will decide which feed ranking.
- Route-count guard threshold — currently <=1; evaluate loosening to <=2 against live UEX route counts if thin-but-real commodities are observed ranking as healthy.
- Shortlist over-fetch tuning — getTopRoutes fetches top 20 candidates but displays top 10; the gap is intentional buffer to absorb guard-rejected commodities (e.g. Osoian Hides) without starving the visible board. Once the route-count guard proves the bad set is small/stable, revisit tightening 20 toward ~15. Gated on guard landing.
- Strip or gate the debug verify surface — before public launch / monetization unpause (whichever comes first), strip or gate all three debug surfaces: /api/verify (raw routes), /api/verify-prices (raw prices feed), and the DebugRoutes / DebugPrices buttons (including copy).
- Prior art / inspiration — haulerapp.space (hauler.thespacecoder.space, by TheSpaceCoder): a contract-stacking optimizer for accepted delivery contracts, which is a different problem from commodity arbitrage. Patterns worth considering if loop/contract routing is ever pursued: (1) OCR 'add contract from screenshot' import — pastes an in-game contract screenshot and extracts reward + pickup/dropoff objectives, sidestepping manual entry (no Star Citizen contract API exists); (2) inputs ship cargo capacity + current location + a session ID; (3) contracts decompose into cargo types, each with multiple loading/offloading legs (SCU + location). Adjacent product, not a parity target — keep commodity arbitrage the focus.
- Enforced branch protection (require green CI to merge) — optional hardening if the project grows past solo.

## Chore

- README with screenshots + setup instructions
- LICENSE file

## Notes / Findings

- No official RSI commodity-market API exists or is planned (confirmed 2026-05); the game's per-shard/server-meshed economy makes one unlikely. UEX remains the best source.
- Supply/demand is player-influenced and tick-refreshed (5-15 min); feed quantities are fuzzy snapshots, not stable capacities. Reinforces staleness gating and overrides.
- Load/unload is a real per-SCU time cost (e.g. ~6-8 min for 696 SCU); belongs with travel-time constants for profit-per-hour.
- commodities_status endpoint rows decode status_origin/status_destination for display; commodities_prices_history available if route-count corroboration ever needs deepening.
- Architecture pivot: tool consumes commodities_routes rather than computing routes from commodities_prices_all. The v0.1 planRoutes ranker is being retired; its verification entry remains in VERIFICATIONS.md as historical record.

## Completed

### Blocker

### Critical

### Major

- Travel time wiring — lib/travelTime.ts shipped; point estimate + flat-band range displayed per route, four constants + band seeded pending calibration, inputs distance/scu_origin free from commodities_routes. Display-only, ranking unchanged. Constants require in-game wall-clock calibration (see VERIFICATIONS.md).
- Route-count guard — shipped as route-count isolation at threshold <=1, quarantine-and-label. Commodities with a single profitable route are quarantined below all corroborated commodities and labelled 'single route — unverified'. Verified against the live Osoian Hides case 2026-05-30 (single route, correctly isolated; healthy board order unchanged).
- GitHub Actions CI — .github/workflows/ci.yml; triggers on PR into main and on push; lint + typecheck + test as separate named steps; actions/checkout@v6 + setup-node@v6 (Node 20, npm cache). Adopted PR-into-main flow; CI status is the merge signal (no enforced branch protection).
- Wire commodities_routes integration — lib/routes.ts (shortlistCommodities + getTopRoutes), /api/routes serving UEX route data, grouped-card board (top 10 commodities, top 3 routes each, sorted by best-route profit). planRoutes, Route interface, lib/routePlanner.ts, lib/routePlanner.test.ts, and /api/routes-spike retired. Verified against UEX (Atlasium, 2026-05-30).
- v0.1 route planner — from the commodities_prices_all feed, pair low price_buy vs high price_sell across terminals per commodity, generate candidate routes, rank by marginal profit per stop. Shipped: lib/routePlanner.ts, /api/routes, route-table UI on home page, unit tests.

### Minor

- Dual-host curl test for UEX_BASE_URL — 2026-05-29. Folded into proxy verification: /api/commodities returned live data with .uk host, so .uk confirmed working; .space fallback not needed.

### Chore

- .env.example with UEX_BASE_URL and UEX_API_TOKEN placeholders — done in scaffold (Prompt 1).
