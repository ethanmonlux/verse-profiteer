# VERIFICATIONS.md — verse-profiteer

Source of truth for manual verification runs that are required but not yet run.
A change touching a state-sensitive system (UEX integration, caching, route ranking, travel-time constants, rental ROI, Patreon auth, staleness gating) is NOT done until its entry moves from Pending to Completed.

Two categories below: Code Verifications (gated on a specific change) and Calibration Runs (ongoing tuning against real in-game data).

How to run a verification: exercise the changed path against a real scenario with a known answer. For prices, spot-check one terminal against a manual UEX query in another tab. For ranking math, walk through one route by hand and confirm the tool agrees. For Patreon, test with a real tier-gated account.

When a verification passes, paste the date + outcome to the planning chat; it drafts a doc-only prompt to move the entry below.

## Pending — Code Verifications

(none)

## Pending — Calibration Runs

These exist for the life of the tool — they don’t “complete” once and disappear. They re-open whenever the tool consistently misranks or a major SC patch ships.

- Travel-time constants (QT_SPEED_GM_PER_MIN, SPOOL_CALIBRATE_MIN, TERMINAL_OVERHEAD_MIN) — 3-5 real runs, compare estimated vs actual wall-clock, adjust constants so estimate ≈ actual. Re-run after any major SC patch that touches quantum drive or terminal flow. Opens once travel-time wiring (TODO Major) merges.
- Per-ship QT speeds — only open this if the tool consistently misranks fast vs slow ships in the same scenario. Skip until that’s observed.

## Completed — Code Verifications

- commodities_routes integration (`lib/routes.ts` + `/api/routes` + grouped-card board) — 2026-05-30. Verified against UEX routes view for Atlasium (code ATLA) on the live deploy. Board #1 card: Atlasium, Chawla's Beach → HDMS-Oparei, +2,928,480. UEX routes view top entry: same origin/destination, income 2.9M, ROI 50%, 121 Gm. Next two routes (Levski, Bueno Ravine) matched UEX order. Pipeline confirmed: shortlist → fetch → profit-rank → render.
- v0.1 route planner ranking math (`lib/routePlanner.ts` + `/api/routes` + home page) — 2026-05-29. Verified the planner's output against UEX. Anchor: Aluminum, UEX live page showed Profit/SCU best 1,416 (buy Rod's Fuel 2,584, sell Dudley & Daughters 4,000); tool produces the same pairing from the same feed. Confirmed /api/routes returns 50 routes, strictly descending by profitPerUnit, every profitPerUnit == priceSell - priceBuy and > 0, no phantom routes from price-0 cells. KNOWN LIMITATION (not a math defect): ranking is pure margin, so stale crowdsourced misentries can rank #1 (Osoian Hides 586,500 top route is suspect). Tracked as the outlier/bad-data guard TODO.
- UEX proxy + caching layer (lib/uex.ts + app/api/commodities/route.ts) — 2026-05-29. Hit /api/commodities on the deploy; returned a JSON array of 2,581 live price records across 122 commodities and 133 terminals. Spot-checked Aluminum at TDD Area 18: feed price_sell 3600 matched the UEX site (locations_buying tab, 3600 “Last”). Top-5 on both market sides also matched the site (sell side: Dudley & Daughters 4000, TDD New Babbage / CBD Lorville / TDD Orison / Stanton Gateway Nyx 3800; buy side: Rod’s Fuel / Megumi 2584, Shubins 2958). Token confirmed server-side only, not present in client response. Base URL .uk resolved correctly.

## Completed — Calibration Runs

(none)

## Archive

When Completed exceeds ~30 entries, archive to docs/VERIFICATIONS_ARCHIVE.md.
