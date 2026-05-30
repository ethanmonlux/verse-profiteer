# TRANSFER.md — verse-profiteer

Session-continuity handoff. Start of session: read this + recent CHANGELOG.md, TODO.md, VERIFICATIONS.md (Pending). Flag if this file is stale relative to those.

## Last updated

2026-05-29 — ARCHITECTURE PIVOT session. Decided to consume UEX's commodities_routes instead of computing routes locally. TODO.md and CLAUDE.md updated to match. No production code merged this session beyond a throwaway investigation spike (see below).

## Current state

- Repo deployed to Vercel (verse-profiteer.vercel.app). Next.js 16 / React 19 / Tailwind v4 (NOT Next 14 — verify framework APIs against installed version, see AGENTS.md).
- UEX proxy DONE + verified: lib/uex.ts (single data-access module) + app/api/commodities/route.ts, returns commodities_prices_all. Env/token/base-URL guards in place, 5-min fetch cache.
- v0.1 route planner SHIPPED + verified (lib/routePlanner.ts planRoutes, /api/routes, card UI on app/page.tsx, 8 vitest cases). NOTE: this is being RETIRED by the pivot — see below. Code still present; not yet removed.
- INVESTIGATION SPIKE present in repo (throwaway, not a permanent feature): getCommodityRoutes + CommodityRoute interface in lib/uex.ts, and app/api/routes-spike/route.ts. Built to probe UEX's commodities_routes signals. It works (deployed, returns data). It should be folded into the real integration or deleted — do not treat it as finished product.

## The pivot (why, and what it means)

- DECISION: consume UEX commodities_routes (returns realizable profit, scu_origin/scu_destination already bottlenecked, investment, distance in Gm, price_roi, price_margin) instead of computing routes from commodities_prices_all. Building a worse UEX is not worth it; compete on UI, filters, in-game price overrides, and a chat-box instead.
- This retires the v0.1 planRoutes cartesian ranker (and its 8 tests). Its VERIFICATIONS.md entry stays as historical record.
- SPIKE FINDINGS (verified against 6 known-answer commodities + a full 122-commodity local sweep of commodities.json):
  - UEX scu_origin/scu_destination ARE the realizable bottleneck (Osoian came back capped at qty 1). profit IS realizable, not per-unit. Confirmed working.
  - UEX volatility_origin/volatility_destination are NULL in practice — UNUSABLE as a trust signal. Struck.
  - UEX score does NOT isolate bad trades — the Osoian outlier (586,500 profit, 1 route) outscored good small Degnous Root. Struck as a trust signal (may still be usable as a default sort).
  - GUARD SIGNAL CONFIRMED: route-count isolation. Full-feed sweep: only Osoian Hides has <=2 profitable routes (it has 1); all 71 other tradeable commodities have 9+. Zero false positives. Flag/downrank commodities with <=1-2 routes, label "single uncorroborated route", quarantine never silent-drop. Re-confirm exact threshold against UEX's live route counts when wired.

## Decisions affecting caching / math / auth

- UEX base URL: UEX_BASE_URL env var, .uk confirmed working.
- commodities_routes has NO _all bulk variant — it is one call per id_commodity (no request batching available). For whole-feed analysis, derive from commodities_prices_all locally instead of fanning out 122 route calls.
- Cache TTL for routes: 5 min (provisional, matches prices; UEX caches 30 min upstream). Added to CLAUDE.md hygiene list this session.
- No official RSI commodity-market API exists or is planned (confirmed 2026-05). UEX is the best upstream source; player price overrides are the single genuine data-quality edge.
- Supply/demand is player-influenced + tick-refreshed (5-15 min); feed quantities are fuzzy snapshots. Load/unload is a real per-SCU time cost (~6-8 min for 696 SCU), belongs with travel-time constants.
- STALENESS: commodities_prices_all has date_modified but NO game_version. Patch boundaries are mass-staleness events, distinct from per-cell aging.

## Open operator decisions

- Monetization: PAUSED (donation model is the viable path per peers; resume is operator's call; not legal advice).

## Prompts written but not run

(none — TODO.md rewrite and CLAUDE.md TTL+architecture edits were written and run this session)

## Pending verification count

0 code verifications pending. 2 calibration runs parked (open when travel-time wiring merges). NOTE: the commodities_routes integration and the route-count guard will EACH need a Pending entry when their design-specs are built — neither is started yet.

## Next likely step

Build the commodities_routes integration design-spec (APPROVED, not started): promote getCommodityRoutes from spike to production core, rework /api/routes to serve UEX route data, retire planRoutes + tests. State-sensitive, REVIEW + VERIFY, escalates to operator. THEN: route-count guard on top of it. THEN: the redesign (operator wants a Good Omen-style instrument-panel look — goodomentrading.com/performance as reference — replacing the current bordered-card UI). Keep monetization untouched while paused.

## Merge state

- Proxy + v0.1 planner merged to main and production-confirmed (2026-05-29). v0.1 planner pending retirement by the pivot.
- Spike endpoints (/api/routes-spike, getCommodityRoutes) are in the repo and deployed but are throwaway investigation code, not finished features.
- Branch model: operator merges CC session branches directly into main (no develop layer while solo).
