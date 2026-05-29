# TODO.md — SC Cargo Tool

Severity: Blocker (broken, blocks usage) / Critical (significant gap, affects correctness or security) / Major (should ship soon) / Minor (nice to have) / Chore (maintenance, docs, cleanup).
New items in priority order. Completed items move to the bottom, organized by original severity — never left checked inline.

## Blocker

(none)

## Critical

- IP / monetization viability — RESOLVE BEFORE ANY PAYWALL WORK. CIG’s Fankit/Fandom FAQ (support.robertsspaceindustries.com, checked 2026-05) explicitly lists prohibited uses including for-profit, paywalls, donations, fundraising, and “games of any kind,” and states no licenses are offered. The fan-film YouTube-ad carve-out does not extend to tools. A Patreon paid tier on an SC-centered tool sits against this list; “donations” being named also closes the free-tool-plus-tip hatch. Operator decision required: (a) keep tool free / non-commercial, (b) seek written permission from CIG, or (c) accept revocation risk knowingly. Not legal advice — consider counsel before flipping a paywall. This gates the entire Patreon-readiness block below.

## Major

- v0.1 route planner — bulk pull commodities_prices_all, candidate route generation, marginal-profit ranking
- Travel time wiring — distance-pair collection from candidate routes, terminals_distances fetch, travelTimeMinutes integration
- Staleness gating — date_modified threshold + game_version major.minor check, surfaced in UI as warnings not silent skips

## Minor

- Rental ROI card (addendum §C) — stretch goal, gate on price_rent_* presence + staleness
- Dual-host curl test for UEX_BASE_URL — confirm .uk vs .space at session start
- Patreon-readiness checklist (BLOCKED on Critical IP/monetization item above — do not begin until resolved):
  - Server-side Patreon OAuth flow (no client-side token handling)
  - Tier mapping (free / paid tiers → feature gates)
  - Webhook handler for membership changes (cancel, downgrade, fail-charge)
  - Rate-limit posture review — confirm 120/min headroom across expected concurrent paid users
  - Refund policy + ToS copy referencing data-staleness disclaimers
  - “Numbers can be wrong / SC patches reshuffle economy” disclaimer on every ROI surface
  - Privacy policy covering Patreon identifier storage
  - Required CIG attribution/disclaimer + Fankit terms compliance on any public surface
- Per-ship QT speeds — only if calibration shows fast/slow ships consistently misranked

## Chore

- README with screenshots + setup instructions
- .env.example with UEX_BASE_URL and UEX_API_TOKEN placeholders
- LICENSE file

## Completed

### Blocker

### Critical

### Major

### Minor

### Chore