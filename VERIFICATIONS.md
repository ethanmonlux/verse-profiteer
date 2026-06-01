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

- Travel-time constants (QT_SPEED_GM_PER_MIN, SPOOL_CALIBRATE_MIN, TERMINAL_OVERHEAD_MIN, FIXED_LOAD_MIN [proposed], LOAD_UNLOAD_MIN_PER_SCU) + loading-fee measurement. OPEN as of 2026-05-31; no longer gating any feature (operator dropped the calibration gate — no users yet; constants stay seeds). Standing tuning task, not a release gate. Re-run after any major SC patch touching quantum drive or terminal flow. Operator's instrument: Avenger Titan (8 SCU), ~800k aUEC available to fund cargo. Auto-load only. Three observables, all measurable in one evening:
  1. Fixed overhead — time a tiny-cargo Titan run (dock → terminal → load → takeoff); at ~8 SCU the per-SCU term is negligible, so the measured time pins SPOOL_CALIBRATE_MIN + TERMINAL_OVERHEAD_MIN + the proposed FIXED_LOAD_MIN cluster. Define the boundary between TERMINAL_OVERHEAD_MIN and FIXED_LOAD_MIN here to avoid double-counting.
  2. Auto-load rate — note load duration vs SCU on the Titan run for a first LOAD_UNLOAD_MIN_PER_SCU anchor at the small-ship end. NOTE: the per-SCU scalar cannot be fully separated from a single 8-SCU ship — it needs a larger haul (rent a bigger ship later) to see the term grow. Titan pins the fixed constants well; scalar stays a known gap until a big-cargo run.
  3. Loading fee (profit, not time) — at the buy terminal, compare credits deducted at the freight elevator / auto-load against the raw buy price. Records: does a distinct fee exist, is it flat or per-SCU, and its magnitude. This feeds the new TODO Major "Loading/unloading fee as a net-profit term." Check unload side too if a fee applies there.
  Then set ESTIMATE_BAND_PCT from observed scatter. QT_SPEED_GM_PER_MIN already has a data-backed ~18.18 from UEX (category 22); confirm against wall-clock on a longer leg if convenient.
- Per-ship QT speeds — only open this if the tool consistently misranks fast vs slow ships in the same scenario. Skip until that’s observed.

## Completed — Code Verifications

- Ship-capacity scaling (lib/realizableProfit.ts + app/Board.tsx) — verified 2026-05-31. Cap 5/10/32 runs exercised both branches; down-scaling and supply-capped branch both confirmed; ≤-total-profit invariant held; cap indicator toggled correctly at the boundary.
- Route-count guard (`lib/routes.ts` + `app/page.tsx`) — verified 2026-05-30 via raw-data audit instead of the live badge (the Osoian anchor was unreliable due to market churn, so a data-based check was used). Method: pulled the raw commodities_prices_all feed (2,575 records, 122 commodities) and recomputed the shortlist (top-20 by margin = best price_sell − best price_buy per commodity). All 10 displayed board commodities (E'tam, Dymantium, Compboard, Atlasium, Taranite, Carbon-Silk, Degnous Root, Tritium, Gold, Gasping Weevil Eggs) fell within the computed top-20 — shortlist stage confirmed. Guard confirmed: Osoian Hides (id 53) is the #1 margin commodity by ~15x (margin 586,500) yet is absent from the board, while Gasping Weevil Eggs (#2 margin, multi-route) displays normally at the bottom — the highest-margin commodity is quarantined for being single-route while a multi-route commodity is not, exactly the intended discrimination. No badge visible because the over-fetch buffer (fetch 20, show 10) pushes the quarantined single-route commodity past slot 10.
- commodities_routes integration (`lib/routes.ts` + `/api/routes` + grouped-card board) — 2026-05-30. Verified against UEX routes view for Atlasium (code ATLA) on the live deploy. Board #1 card: Atlasium, Chawla's Beach → HDMS-Oparei, +2,928,480. UEX routes view top entry: same origin/destination, income 2.9M, ROI 50%, 121 Gm. Next two routes (Levski, Bueno Ravine) matched UEX order. Pipeline confirmed: shortlist → fetch → profit-rank → render.
- v0.1 route planner ranking math (`lib/routePlanner.ts` + `/api/routes` + home page) — 2026-05-29. Verified the planner's output against UEX. Anchor: Aluminum, UEX live page showed Profit/SCU best 1,416 (buy Rod's Fuel 2,584, sell Dudley & Daughters 4,000); tool produces the same pairing from the same feed. Confirmed /api/routes returns 50 routes, strictly descending by profitPerUnit, every profitPerUnit == priceSell - priceBuy and > 0, no phantom routes from price-0 cells. KNOWN LIMITATION (not a math defect): ranking is pure margin, so stale crowdsourced misentries can rank #1 (Osoian Hides 586,500 top route is suspect). Tracked as the outlier/bad-data guard TODO.
- UEX proxy + caching layer (lib/uex.ts + app/api/commodities/route.ts) — 2026-05-29. Hit /api/commodities on the deploy; returned a JSON array of 2,581 live price records across 122 commodities and 133 terminals. Spot-checked Aluminum at TDD Area 18: feed price_sell 3600 matched the UEX site (locations_buying tab, 3600 “Last”). Top-5 on both market sides also matched the site (sell side: Dudley & Daughters 4000, TDD New Babbage / CBD Lorville / TDD Orison / Stanton Gateway Nyx 3800; buy side: Rod’s Fuel / Megumi 2584, Shubins 2958). Token confirmed server-side only, not present in client response. Base URL .uk resolved correctly.

## Completed — Calibration Runs

(none)

## Archive

When Completed exceeds ~30 entries, archive to docs/VERIFICATIONS_ARCHIVE.md.
