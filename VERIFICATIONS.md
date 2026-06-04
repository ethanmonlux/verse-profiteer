# VERIFICATIONS.md — verse-profiteer

Source of truth for manual verification runs that are required but not yet run.
A change touching a state-sensitive system (UEX integration, caching, route ranking, travel-time constants, rental ROI, Patreon auth, staleness gating) is NOT done until its entry moves from Pending to Completed.

Two categories below: Code Verifications (gated on a specific change) and Calibration Runs (ongoing tuning against real in-game data).

How to run a verification: exercise the changed path against a real scenario with a known answer. For prices, spot-check one terminal against a manual UEX query in another tab. For ranking math, walk through one route by hand and confirm the tool agrees. For Patreon, test with a real tier-gated account.

When a verification passes, paste the date + outcome to the planning chat; it drafts a doc-only prompt to move the entry below.

## Pending — Code Verifications

VF — Mirror refresh worker (Railway)  [Pending]
- What: First population of routes_mirror and terminals_mirror via the scheduled Railway worker (scripts/refresh-mirror.ts).
- How to verify (must run before marking Complete):
  1. Trigger the worker once on Railway (or locally via npm run refresh:mirror with DATABASE_URL set).
  2. Confirm terminals_mirror row count is non-zero and plausible (~hundreds).
  3. Confirm routes_mirror row count is non-zero and in the expected order of magnitude for all commodities (not just a 35-row shortlist).
  4. Run the worker a SECOND time; confirm refreshed_at advances on existing rows (proves onConflictDoUpdate updates, not just inserts) and row counts stay stable (proves upsert, not duplicate insert).
  5. Spot-check ONE route row against a live UEX commodities_routes query for that id_commodity: profit, scu_reachable, and price fields match.
  6. Spot-check that container_sizes_origin/destination are populated as int arrays for at least one row, and scan the worker logs for any parseContainerSizes null-fallback warnings — note how many fired and whether the feed format held.
- Why Pending: worker not yet run against live DB at doc time.

## Pending — Calibration Runs

These exist for the life of the tool — they don’t “complete” once and disappear. They re-open whenever the tool consistently misranks or a major SC patch ships.

- Travel-time constants (QT_SPEED_GM_PER_MIN, SPOOL_CALIBRATE_MIN, TERMINAL_OVERHEAD_MIN, LOAD_UNLOAD_MIN_PER_SCU) — STANDING tuning task. Re-run after any major SC patch that touches quantum drive or terminal flow. Partial calibration run 2026-06-01: (1) Fixed load/unload overhead measured ~72s at 8 SCU (terminal-to-ship, both ends); (2) Auto-load fee per event confirmed fixed ~190 + ~62/SCU — charged on BOTH load (buy) and unload (sell), so a normal run pays the fee ~twice; (3) Sale proceeds reconciliation: 8 SCU Scrap @ 3,555.86 − 488 auto-load fee = 27,958 realised; account balance 779,074 pre-sale → expected 807,032 post-sale — confirmed to the credit. Still uncaptured: clean QT wall-clock for a single leg (this run contaminated by a mid-run course change; constants left unverified rather than anchored to bad data). Method: isolate constants — a short tiny-cargo route pins SPOOL_CALIBRATE_MIN + TERMINAL_OVERHEAD_MIN (travel and load ≈ 0); a long big-cargo route pins QT_SPEED_GM_PER_MIN + LOAD_UNLOAD_MIN_PER_SCU. Compare estimate vs wall-clock, adjust so estimate ≈ actual. Then set ESTIMATE_BAND_PCT from observed scatter. Note: load and unload are ASYMMETRIC — loading overlaps with walk-back to ASOP (effective delay = max(0, load_time − walk_time)); unloading is serial (terminal travel fully additive before unload can start). Model them separately, not as one symmetric TERMINAL_OVERHEAD_MIN.
- Per-ship QT speeds — only open this if the tool consistently misranks fast vs slow ships in the same scenario. Skip until that’s observed.

## Completed — Code Verifications

- Ship-capacity scaling (lib/realizableProfit.ts + app/Board.tsx) — verified 2026-05-31. Cap 5/10/32 runs exercised both branches; down-scaling and supply-capped branch both confirmed; ≤-total-profit invariant held; cap indicator toggled correctly at the boundary.
- Route-count guard (`lib/routes.ts` + `app/page.tsx`) — verified 2026-05-30 via raw-data audit instead of the live badge (the Osoian anchor was unreliable due to market churn, so a data-based check was used). Method: pulled the raw commodities_prices_all feed (2,575 records, 122 commodities) and recomputed the shortlist (top-20 by margin = best price_sell − best price_buy per commodity). All 10 displayed board commodities (E'tam, Dymantium, Compboard, Atlasium, Taranite, Carbon-Silk, Degnous Root, Tritium, Gold, Gasping Weevil Eggs) fell within the computed top-20 — shortlist stage confirmed. Guard confirmed: Osoian Hides (id 53) is the #1 margin commodity by ~15x (margin 586,500) yet is absent from the board, while Gasping Weevil Eggs (#2 margin, multi-route) displays normally at the bottom — the highest-margin commodity is quarantined for being single-route while a multi-route commodity is not, exactly the intended discrimination. No badge visible because the over-fetch buffer (fetch 20, show 10) pushes the quarantined single-route commodity past slot 10.
- commodities_routes integration (`lib/routes.ts` + `/api/routes` + grouped-card board) — 2026-05-30. Verified against UEX routes view for Atlasium (code ATLA) on the live deploy. Board #1 card: Atlasium, Chawla's Beach → HDMS-Oparei, +2,928,480. UEX routes view top entry: same origin/destination, income 2.9M, ROI 50%, 121 Gm. Next two routes (Levski, Bueno Ravine) matched UEX order. Pipeline confirmed: shortlist → fetch → profit-rank → render.
- v0.1 route planner ranking math (`lib/routePlanner.ts` + `/api/routes` + home page) — 2026-05-29. Verified the planner's output against UEX. Anchor: Aluminum, UEX live page showed Profit/SCU best 1,416 (buy Rod's Fuel 2,584, sell Dudley & Daughters 4,000); tool produces the same pairing from the same feed. Confirmed /api/routes returns 50 routes, strictly descending by profitPerUnit, every profitPerUnit == priceSell - priceBuy and > 0, no phantom routes from price-0 cells. KNOWN LIMITATION (not a math defect): ranking is pure margin, so stale crowdsourced misentries can rank #1 (Osoian Hides 586,500 top route is suspect). Tracked as the outlier/bad-data guard TODO.
- UEX proxy + caching layer (lib/uex.ts + app/api/commodities/route.ts) — 2026-05-29. Hit /api/commodities on the deploy; returned a JSON array of 2,581 live price records across 122 commodities and 133 terminals. Spot-checked Aluminum at TDD Area 18: feed price_sell 3600 matched the UEX site (locations_buying tab, 3600 “Last”). Top-5 on both market sides also matched the site (sell side: Dudley & Daughters 4000, TDD New Babbage / CBD Lorville / TDD Orison / Stanton Gateway Nyx 3800; buy side: Rod’s Fuel / Megumi 2584, Shubins 2958). Token confirmed server-side only, not present in client response. Base URL .uk resolved correctly.

## Completed — Calibration Runs

- Sell-side auto-load fee — 2026-06-01. Scrap sell at New Babbage TDD, 8 SCU @ 3,555.86/unit = 28,446 gross goods value; with auto-load fee toggled on, net proceeds = 27,958 (fee 488 deducted on the unload/sell side, same magnitude as the 488 load fee paid at purchase). Confirms: auto-load fee is charged per event on BOTH load (buy) AND unload (sell). Balance reconciliation: 779,074 + 27,958 = 807,032, matched in-game (~807,xxx). Fee model (~190 fixed + ~62/SCU per event, round-trip ~2×) considered measured/closed. Still uncaptured: clean QT wall-clock for a single leg — travel-time constants remain flagged unverified.

## Archive

When Completed exceeds ~30 entries, archive to docs/VERIFICATIONS_ARCHIVE.md.
