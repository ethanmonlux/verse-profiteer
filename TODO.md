# TODO.md — verse-profiteer

Severity: Blocker (broken, blocks usage) / Critical (significant gap, affects correctness or security) / Major (should ship soon) / Minor (nice to have) / Chore (maintenance, docs, cleanup).
New items in priority order. Completed items move to the bottom, organized by original severity — never left checked inline.

## Blocker

(none)

## Critical

- IP / monetization viability — RESOLVE BEFORE ANY PAYWALL WORK. Status: PAUSED by operator. CIG's Fankit/Fandom FAQ (checked 2026-05) lists prohibited uses incl. for-profit, paywalls, donations. Established peers (UEX, Shebuka's Datarunner) run a DONATION model instead: tool fully free, supporters get cosmetic/recognition perks only (badge, name in credits), no feature gating. That's the viable path if monetization resumes — paywalling the differentiator features is the one model peers specifically avoid. Operator decision still required before any monetization work; not legal advice.

## Major

- UI redesign / card information hierarchy (DESIGN-SPEC) — the route card now shows four profit numbers per row (per-SCU, realizable, per-hour, total) with no hierarchy, which is misleading: they answer "is this a good route?" four different conflicting ways and the user can't tell which to act on. Decide the ONE headline number per row (candidate: per-hour or realizable; total profit likely demoted since it assumes an unfillable hold — the competitor's misleading lead number), what's secondary, and what moves behind the "raw"/expand. Also decide whether ranking basis should change (per-hour ranking, gated on travel-time calibration). This was deferred until per-hour + per-SCU landed; both have landed, so it is now due. Motivated by live screenshots 2026-05-31.
- Staleness gating — AMENDED: commodities_prices_all does NOT include a game_version field (confirmed against live feed 2026-05-29). Gate on date_modified threshold only for this endpoint; surface in UI as warnings not silent skips. Revisit game_version if/when an endpoint that carries it is used (e.g. vehicles_rentals_prices does include game_version). Note: a patch boundary is a mass-staleness event (all prices suspect for a day or two while UEX catches up), distinct from per-cell aging.
- User price overrides — let players submit the live in-game price they see standing at a terminal, overriding the UEX feed value for ranking. Rationale: UEX has no game API; prices are crowdsourced from players screenshotting terminals (e.g. Datarunner OCR), so a feed price is only as fresh as the last player to visit and report that terminal — backwater terminals go stale (some cells are months old). The player at the terminal now is the freshest source. DESIGN-SPEC, v0.2+: new data source feeding ranking math (state-sensitive) plus a new trust surface. Open questions: storage (ties to the parked Railway+DB option), conflict rule (user vs feed — newer wins? user always wins?), per-user vs shared, override staleness/expiry, whether to write back to UEX. Do NOT fold into v0.1. ELEVATED priority: confirmed no official RSI market API exists or is planned, and UEX is the best upstream source available — so player-submitted live prices are the single genuine data-quality edge.
- Profit-per-hour ranking — board ranks by total realizable profit; switch ranking basis to profit per hour once travel-time constants are wired. Strongly user-validated: a hauler comment laid out Time = Load + Travel + Admin time and showed raw-profit routes that fail once load time dominates.
- Multi-leg loop / chain routing — plan trade chains where each leg's sell terminal is the next leg's buy point, minimizing empty legs, showing full-loop total profit. This is a graph/pathfinding feature over the route data, not a tweak to the current board; needs its own design-spec. User-requested ('full rundown of the loop', 'fly to your next good location').
  - Note — any loop/chain routing will need ship cargo capacity and current location as inputs (confirmed by haulerapp.space's model).
  - Note — Crowding caveat: experienced haulers deliberately avoid the most-surfaced routes (they get stripped/contested). Consider this when designing how prominently top routes are ranked/surfaced; a 'less contested' view may be worth offering.
- Outlier guard v2 — replace/augment route-count with a stronger trust signal. Route count is inflated by destination fan-out (one buy point × many sell destinations = many routes), so it is a weak proxy for corroboration. The real signals are bottleneck SCU (scu_origin / scu_destination — a route resting on ~1 SCU of supply is untrustworthy regardless of route count) and distinct origin-terminal count (single-source commodities are uncorroborated). The shipped <=1 route-count guard is a deliberate first-pass stopgap that catches only the most degenerate case (e.g. Osoian Hides). Evaluate SCU/origin-count against live data in its own design session. Live evidence (2026-05-31): raw E'tam (id 29) had 44 routes across only 3 origin terminals, with realizable profit driven by scu_origin (67 vs 22 vs 7), not by route count — confirms route count is inflated by destination fan-out and is a weak trust proxy; the real signals are bottleneck SCU and distinct origin-terminal count. Also covers a shortlist-input bug found 2026-05-31: shortlistCommodities in lib/routes.ts ranks candidates by global maxSell − minBuy with NO available-SCU check, so a thin-stock pair (e.g. a terminal with scu_buy 1) can be shortlisted on a margin that does not exist at volume, potentially bumping a genuine high-volume commodity out of the top-20 fetch set. Displayed numbers stay honest (routes come from commodities_routes, which is bottlenecked), so this is a ranking-input bug, not a displayed-number bug — lower severity than a fantasy total, same family. Fix direction: weight/filter shortlist margin by available SCU (scu_buy / scu_sell_stock). Fold into this v2 work; escalation-gated (shortlist/ranking math).
- Realizable-profit floor — a route/leg must clear a minimum realizable value (and a minimum bottleneck SCU) to be surfaced, so trivially-capped trades (the 6-SCU-Waste-in-a-Hull-E case) never rank. Directly motivated by the competitor anti-pattern. Ties to outlier guard v2 and (later) multi-leg routing. State-sensitive (changes what surfaces) — own evaluation.
## Minor

- profitPerHour unit test — per-hour shipped without a test; add lib/profitPerHour.test.ts (consistency with realizableProfit/estimateTravelMinutes, recompute-on-distance-change, divide-by-zero guard, integer result).
- Range model v2 — replace the flat ESTIMATE_BAND_PCT with per-constant min/max that propagate, so band width emerges from which constants are uncertain (load-heavy routes get wider bands). Earned once calibration data exists; flat band is the v1 stopgap.
- Fuel cost as net-profit refinement — UEX exposes fuel_prices / fuel_prices_all. Quantum fuel burn scales with distance, so a long QT run has a real fuel cost not currently subtracted from profit. Pairs with the travel-time model. Evaluate after travel-time constants are calibrated.
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
- Strip or gate the debug verify surface — before public launch / monetization unpause (whichever comes first), strip or gate all three ungated debug surfaces hitting UEX: /api/verify (routes), /api/verify-prices (raw prices feed), /api/verify-qt (categories + items_attributes), and their on-page buttons — DebugRoutes / DebugPrices / DebugQt (including copy + download-JSON).
- Prior art / inspiration — haulerapp.space (hauler.thespacecoder.space, by TheSpaceCoder): a contract-stacking optimizer for accepted delivery contracts, which is a different problem from commodity arbitrage. Patterns worth considering if loop/contract routing is ever pursued: (1) OCR 'add contract from screenshot' import — pastes an in-game contract screenshot and extracts reward + pickup/dropoff objectives, sidestepping manual entry (no Star Citizen contract API exists); (2) inputs ship cargo capacity + current location + a session ID; (3) contracts decompose into cargo types, each with multiple loading/offloading legs (SCU + location). Adjacent product, not a parity target — keep commodity arbitrage the focus.
- Enforced branch protection (require green CI to merge) — optional hardening if the project grows past solo.
- Ship picker (v2 of capacity input) — replace the raw SCU number field with a preset ship list (name → known max SCU), so capacity is chosen, not typed. Presentation layer over the existing realizableProfit math; no math change.
- Budget-constrained ROI routing ("flip my money") — user enters available capital; rank routes by best realizable ROI achievable within that budget (uses investment / price_roi already on commodities_routes). Pairs with capacity scaling and the filters layer. Larger than a display add; own session.

## Chore

- README with screenshots + setup instructions
- LICENSE file

## Notes / Findings

- UEX Quantum Drives category id = 22 (section "Systems"), confirmed via /api/verify-qt 2026-05-31. The categories pull works; the items_attributes?id_category=22 pull returned empty in the first run (attribute names/units for quantum speed + spool NOT yet captured) — retry needed to seed QT_SPEED_GM_PER_MIN and SPOOL_CALIBRATE_MIN from real data.
- No official RSI commodity-market API exists or is planned (confirmed 2026-05); the game's per-shard/server-meshed economy makes one unlikely. UEX remains the best source.
- Supply/demand is player-influenced and tick-refreshed (5-15 min); feed quantities are fuzzy snapshots, not stable capacities. Reinforces staleness gating and overrides.
- Load/unload is a real per-SCU time cost (e.g. ~6-8 min for 696 SCU); belongs with travel-time constants for profit-per-hour.
- commodities_status endpoint rows decode status_origin/status_destination for display; commodities_prices_history available if route-count corroboration ever needs deepening.
- Architecture pivot: tool consumes commodities_routes rather than computing routes from commodities_prices_all. The v0.1 planRoutes ranker is being retired; its verification entry remains in VERIFICATIONS.md as historical record.
- ~~commodities_ranking endpoint is deprecated/disabled upstream~~ ❌ (struck through with error icon on the live UEX index, 2026-05-31) — not callable. Would not be used regardless: ranking stays in code for determinism (UEX score already struck as a trust signal). Do not look for it.
- Auto-loading / cargo box sizes (SCU container packing) — OUT OF SCOPE for ranking. Box composition affects load time and physical fit, not credits (profit is per-SCU regardless of packing); load time is already averaged into LOAD_UNLOAD_MIN_PER_SCU. The container_sizes field exists on commodities_prices_all if ever needed. Do not model box packing.
- Real-time accuracy ceiling — no official RSI market API exists; all tools (UEX included) work from crowd-sourced snapshots. Cannot beat UEX freshness via API. The only real-time edges are user price overrides (freshest source = the player at the terminal) and staleness gating on date_modified (honesty about age). Both already on backlog; this reinforces user price overrides as the top data-quality lever.
- Competitor reference (ohana-services, Base44, observed 2026-05-31) — full multi-leg wizard (region → ship → commodity/budget → AI route → review) with strong presentation but a broken engine: it scales buy quantities to ship capacity with NO supply check, producing impossible stops (e.g. BUY Compboard x188 where the terminal feed shows scu_buy 12; BUY Waste x6 where scu_buy is 1) and fantasy totals (Hull E "+3,995,220"). Verified against our prices feed: their buy prices are real, their quantities are not. This is the exact unbounded-capacity bug our three-way min + realizable-profit floor prevent. Borrow the flow (ship-first wizard, budget mode); do not borrow the engine. Note: read from screenshots + feed cross-check, not their source.

## Completed

### Blocker

### Critical

### Major

- Ship-capacity scaling — lib/realizableProfit.ts shipped; realizable = profitPerScu × min(capacity, scu_origin, scu_destination), three-way min, cap indicator, ≤-total-profit invariant unit-tested. Global in-memory capacity input; board split into server (fetch/rank) + client (app/Board.tsx, capacity state). Display-only, ranking unchanged. State-sensitive — verification PENDING (see VERIFICATIONS.md).
- Travel time wiring — lib/travelTime.ts shipped; point estimate + flat-band range per route, four constants + band seeded pending calibration, inputs distance/scu_origin free from commodities_routes. Display-only. Estimator math verified 2026-05-31 against raw routes (E'tam id 29, Dymantium id 127) and discriminates correctly on distance. Constants still require in-game wall-clock calibration (VERIFICATIONS.md, calibration run OPEN, deferred by operator).
- Profit-per-SCU — lib/profitPerScu.ts shipped; profit/scu_origin compact per row, divisor verified against asymmetric routes. Display-only. Math verified 2026-05-31 against raw (E'tam id 29).
- Route-count guard — shipped as route-count isolation at threshold <=1, quarantine-and-label. Commodities with a single profitable route are quarantined below all corroborated commodities and labelled 'single route — unverified'. Verified against the live Osoian Hides case 2026-05-30 (single route, correctly isolated; healthy board order unchanged).
- GitHub Actions CI — .github/workflows/ci.yml; triggers on PR into main and on push; lint + typecheck + test as separate named steps; actions/checkout@v6 + setup-node@v6 (Node 20, npm cache). Adopted PR-into-main flow; CI status is the merge signal (no enforced branch protection).
- Wire commodities_routes integration — lib/routes.ts (shortlistCommodities + getTopRoutes), /api/routes serving UEX route data, grouped-card board (top 10 commodities, top 3 routes each, sorted by best-route profit). planRoutes, Route interface, lib/routePlanner.ts, lib/routePlanner.test.ts, and /api/routes-spike retired. Verified against UEX (Atlasium, 2026-05-30).
- v0.1 route planner — from the commodities_prices_all feed, pair low price_buy vs high price_sell across terminals per commodity, generate candidate routes, rank by marginal profit per stop. Shipped: lib/routePlanner.ts, /api/routes, route-table UI on home page, unit tests.

### Minor

- Dual-host curl test for UEX_BASE_URL — 2026-05-29. Folded into proxy verification: /api/commodities returned live data with .uk host, so .uk confirmed working; .space fallback not needed.

### Chore

- .env.example with UEX_BASE_URL and UEX_API_TOKEN placeholders — done in scaffold (Prompt 1).
