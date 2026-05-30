# TRANSFER.md — verse-profiteer

Session-continuity handoff. Start of session: read this + recent CHANGELOG.md, TODO.md, VERIFICATIONS.md (Pending). Flag if this file is stale relative to those.

## Last updated

2026-05-30 — CI + branch-model session. GitHub Actions CI live (.github/workflows/ci.yml). PR-into-main flow adopted; CI is the merge signal. No enforced branch protection.

## Current state

- Repo deployed to Vercel (verse-profiteer.vercel.app). Next.js 16 / React 19 / Tailwind v4 (NOT Next 14 — verify framework APIs against installed version, see AGENTS.md).
- UEX proxy DONE + verified: lib/uex.ts (single data-access module) + app/api/commodities/route.ts, returns commodities_prices_all. Env/token/base-URL guards in place, 5-min fetch cache.
- commodities_routes integration SHIPPED + verified: lib/routes.ts (shortlistCommodities + getTopRoutes), /api/routes serving UEX route data, grouped-card board on app/page.tsx (top 10 commodities, top 3 routes each, sorted by best-route profit). Verified against UEX (Atlasium, 2026-05-30).
- v0.1 planner RETIRED: planRoutes, Route interface, lib/routePlanner.ts, lib/routePlanner.test.ts removed. Verification entry remains in VERIFICATIONS.md as historical record.
- Investigation spike DELETED: getCommodityRoutes spike code and /api/routes-spike removed.
- GitHub Actions CI LIVE: .github/workflows/ci.yml — lint + typecheck + test on every PR into main and on push. PR-into-main flow now in effect; CI green/red on the PR is the merge signal.

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

0 code verifications pending. 2 calibration runs parked (open when travel-time wiring merges). Atlasium verification closed 2026-05-30 (see VERIFICATIONS.md). Route-count guard will need a Pending entry when its design-spec is built.

## Next likely step

Next tasks in priority order:
1. Debug verify-button — tappable way to fetch raw UEX commodities_routes for a commodity and compare against the board. Gating approach (dev-only vs env-gated) to be decided in its design-spec.
2. Route-count guard — flag and downrank commodities with <=1-2 profitable routes. Live test case: Osoian Hides at rank 6, single route. Design-spec needed, state-sensitive, REVIEW + VERIFY.

New backlog from user research (see TODO.md Major):
- Profit-per-hour ranking (strongly user-validated; depends on travel-time constants)
- Profit per SCU display (data already available from commodities_routes; repeatedly requested)
- Multi-leg loop / chain routing (graph/pathfinding feature; needs own design-session; crowding caveat noted)

## Merge state

- Proxy merged to main and production-confirmed (2026-05-29).
- commodities_routes integration merged to main and production-confirmed (2026-05-30). Grouped-card board live.
- v0.1 planner retired and removed.
- Spike endpoints (/api/routes-spike, getCommodityRoutes) deleted.
- GitHub Actions CI live (2026-05-30). PR-into-main flow in effect.
- Branch model: operator opens PR from CC session branch into main; CI runs; merge when green. No develop layer while solo. No enforced branch protection.
