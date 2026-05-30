# TODO.md — verse-profiteer

Severity: Blocker (broken, blocks usage) / Critical (significant gap, affects correctness or security) / Major (should ship soon) / Minor (nice to have) / Chore (maintenance, docs, cleanup).
New items in priority order. Completed items move to the bottom, organized by original severity — never left checked inline.

## Blocker

(none)

## Critical

- IP / monetization viability — RESOLVE BEFORE ANY PAYWALL WORK. Status: PAUSED by operator. CIG's Fankit/Fandom FAQ (checked 2026-05) lists prohibited uses incl. for-profit, paywalls, donations. Established peers (UEX, Shebuka's Datarunner) run a DONATION model instead: tool fully free, supporters get cosmetic/recognition perks only (badge, name in credits), no feature gating. That's the viable path if monetization resumes — paywalling the differentiator features is the one model peers specifically avoid. Operator decision still required before any monetization work; not legal advice.

## Major

- Wire commodities_routes as ranking core — consume UEX's pre-computed routes (profit, scu_origin/scu_destination, investment, distance, price_roi, price_margin) instead of computing from commodities_prices_all. Replaces the build-your-own ranker. State-sensitive (new UEX integration + ranking): DESIGN-SPEC, REVIEW + VERIFY. Needs a routes cache-TTL entry added to the addendum A.4 matrix (provisional 5 min, matching prices; UEX caches 30 min upstream).
- Travel time wiring — distance now comes free from commodities_routes (distance field, in Gm). Remaining work: convert Gm to minutes via ship QT speed, plus per-SCU load/unload time. Drop the terminals_distances fan-out (no longer needed).
- Staleness gating — AMENDED: commodities_prices_all does NOT include a game_version field (confirmed against live feed 2026-05-29). Gate on date_modified threshold only for this endpoint; surface in UI as warnings not silent skips. Revisit game_version if/when an endpoint that carries it is used (e.g. vehicles_rentals_prices does include game_version). Note: a patch boundary is a mass-staleness event (all prices suspect for a day or two while UEX catches up), distinct from per-cell aging.
- Outlier / bad-data guard — REVISED APPROACH. Prior ideas struck: price_sell_avg ratio (useless — avg equals the bad number for single-source entries) and UEX volatility_*/score fields (volatility returns null in practice; score does not isolate bad trades — the Osoian outlier outscored a good route in the spike). CONFIRMED approach: route-count isolation. Flag and downrank any commodity with very few profitable routes (<=1-2; full-feed sweep showed only Osoian Hides trips this, zero false positives across 72 commodities). Quarantine and label 'single uncorroborated route', never silent-drop. Re-confirm exact threshold against UEX's own route counts when wired. State-sensitive: DESIGN-SPEC, REVIEW + VERIFY.
- User price overrides — let players submit the live in-game price they see standing at a terminal, overriding the UEX feed value for ranking. Rationale: UEX has no game API; prices are crowdsourced from players screenshotting terminals (e.g. Datarunner OCR), so a feed price is only as fresh as the last player to visit and report that terminal — backwater terminals go stale (some cells are months old). The player at the terminal now is the freshest source. DESIGN-SPEC, v0.2+: new data source feeding ranking math (state-sensitive) plus a new trust surface. Open questions: storage (ties to the parked Railway+DB option), conflict rule (user vs feed — newer wins? user always wins?), per-user vs shared, override staleness/expiry, whether to write back to UEX. Do NOT fold into v0.1. ELEVATED priority: confirmed no official RSI market API exists or is planned, and UEX is the best upstream source available — so player-submitted live prices are the single genuine data-quality edge.

## Minor

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

- v0.1 route planner — from the commodities_prices_all feed, pair low price_buy vs high price_sell across terminals per commodity, generate candidate routes, rank by marginal profit per stop. Shipped: lib/routePlanner.ts, /api/routes, route-table UI on home page, unit tests.

### Minor

- Dual-host curl test for UEX_BASE_URL — 2026-05-29. Folded into proxy verification: /api/commodities returned live data with .uk host, so .uk confirmed working; .space fallback not needed.

### Chore

- .env.example with UEX_BASE_URL and UEX_API_TOKEN placeholders — done in scaffold (Prompt 1).
