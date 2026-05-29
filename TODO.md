# TODO.md — verse-profiteer

Severity: Blocker (broken, blocks usage) / Critical (significant gap, affects correctness or security) / Major (should ship soon) / Minor (nice to have) / Chore (maintenance, docs, cleanup).
New items in priority order. Completed items move to the bottom, organized by original severity — never left checked inline.

## Blocker

(none)

## Critical

- IP / monetization viability — RESOLVE BEFORE ANY PAYWALL WORK. Status: PAUSED by operator. CIG’s Fankit/Fandom FAQ (checked 2026-05) lists prohibited uses incl. for-profit, paywalls, donations. Established peers (UEX, Shebuka’s Datarunner) run a DONATION model instead: tool fully free, supporters get cosmetic/recognition perks only (badge, name in credits), no feature gating. That’s the viable path if monetization resumes — paywalling the differentiator features is the one model peers specifically avoid. Operator decision still required before any monetization work; not legal advice.

## Major

- v0.1 route planner (NEXT) — from the commodities_prices_all feed, pair low price_buy vs high price_sell across terminals per commodity, generate candidate routes, rank by marginal profit per stop. DESIGN-SPEC: needs propose → operator explain-back → prompt flow. Data layer confirmed able to feed this (2,581 records, both market sides, 122 commodities).
- Travel time wiring — distance-pair collection from candidate routes, terminals_distances fetch, travelTimeMinutes integration.
- Staleness gating — AMENDED: commodities_prices_all does NOT include a game_version field (confirmed against live feed 2026-05-29). Gate on date_modified threshold only for this endpoint; surface in UI as warnings not silent skips. Revisit game_version if/when an endpoint that carries it is used (e.g. vehicles_rentals_prices does include game_version).

## Minor

- Rental ROI card (addendum §C) — stretch goal, gate on price_rent_* presence + staleness. Note: rentals endpoint DOES carry game_version, unlike commodities.
- Patreon-readiness checklist (BLOCKED on Critical IP/monetization item; PAUSED — do not begin until resumed and resolved):
  - If donation model: supporter badge / name-in-credits / cosmetic perks only — NO feature gates.
  - Server-side Patreon OAuth flow (no client-side token handling)
  - Webhook handler for membership changes (cancel, downgrade, fail-charge)
  - Rate-limit posture review — confirm 120/min headroom across expected concurrent users
  - Disclaimers: data-staleness + “numbers can be wrong / SC patches reshuffle economy” on every ROI/profit surface
  - Privacy policy covering Patreon identifier storage
  - Required CIG attribution/disclaimer + Fankit terms compliance on any public surface
- Per-ship QT speeds — only if calibration shows fast/slow ships consistently misranked.
- Surface richer per-record fields the feed already returns but the proxy passes through untyped: status_buy / status_sell, SCU inventory, system split (Stanton/Pyro), quality/CS. Route planner will decide which feed ranking.

## Chore

- README with screenshots + setup instructions
- LICENSE file

## Completed

### Blocker

### Critical

### Major

### Minor

- Dual-host curl test for UEX_BASE_URL — 2026-05-29. Folded into proxy verification: /api/commodities returned live data with .uk host, so .uk confirmed working; .space fallback not needed.

### Chore

- .env.example with UEX_BASE_URL and UEX_API_TOKEN placeholders — done in scaffold (Prompt 1).
