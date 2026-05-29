# TRANSFER.md — SC Cargo Tool

Session-continuity handoff. Start of session: read this + recent CHANGELOG.md, TODO.md, VERIFICATIONS.md (Pending). Flag if this file is stale relative to those.

## Last updated

[date] — initial seed (planning only, no code merged yet)

## Current state

- Pre-v0.1. Repo scaffolded (Next.js + TypeScript + Tailwind); no feature code merged.
- Design docs settled: Starter Kit + Addendum (corrected UEX API §A, travel time §B, rental ROI §C).
- Backlog files (TODO / VERIFICATIONS / CHANGELOG / this file) initialized.

## Decisions affecting caching / math / auth

- UEX base URL: UEX_BASE_URL env var, default <https://api.uexcorp.uk/2.0>, .space fallback.
- Bulk endpoints only (commodities_prices_all, vehicles_rentals_prices_all); no per-terminal loops.
- Distance fetch: candidate-routes-first → distinct-pair collection; never sweep pairs.
- Cache TTLs locked to addendum §A.4 (5min prices / 1hr terminals+purchases / 12h distances+rentals / 1day defs).
- Travel-time defaults: QT_SPEED_GM_PER_MIN=12, SPOOL_CALIBRATE_MIN=0.4, TERMINAL_OVERHEAD_MIN=4 — placeholders, calibration is a post-v0.1 task (VERIFICATIONS Calibration Runs).
- Staleness: both date_modified threshold AND game_version major.minor match required before showing a record.

## Open operator decisions

- CRITICAL: IP / monetization viability (TODO Critical). CIG Fankit/Fandom FAQ prohibits paywalls/donations on SC-centered work. Patreon paid tier is blocked until operator decides: free / seek permission / accept risk. Not legal advice.

## Prompts written but not run

(none)

## Pending verification count

0 code verifications. 2 calibration runs parked (open when travel-time wiring merges).

## Next likely step

Begin v0.1 route planner (TODO Major) — bulk price pull + candidate generation + marginal ranking. Keep Patreon work untouched until the Critical IP item is resolved.