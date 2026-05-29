# VERIFICATIONS.md — SC Cargo Tool

Source of truth for manual verification runs that are required but not yet run.
A change touching a state-sensitive system (UEX integration, caching, route ranking, travel-time constants, rental ROI, Patreon auth, staleness gating) is NOT done until its entry moves from Pending to Completed.

Two categories below: Code Verifications (gated on a specific change) and Calibration Runs (ongoing tuning against real in-game data).

How to run a verification: exercise the changed path against a real scenario with a known answer. For prices, spot-check one terminal against a manual UEX query in another tab. For ranking math, walk through one route by hand and confirm the tool agrees. For Patreon, test with a real tier-gated account.

When a verification passes, paste the date + outcome to the planning chat; it drafts a doc-only prompt to move the entry below.

## Pending — Code Verifications

(none — no state-sensitive code merged yet)

## Pending — Calibration Runs

These exist for the life of the tool — they don’t “complete” once and disappear. They re-open whenever the tool consistently misranks or a major SC patch ships.

- Travel-time constants (QT_SPEED_GM_PER_MIN, SPOOL_CALIBRATE_MIN, TERMINAL_OVERHEAD_MIN) — 3-5 real runs, compare estimated vs actual wall-clock, adjust constants so estimate ≈ actual. Re-run after any major SC patch that touches quantum drive or terminal flow. Opens once travel-time wiring (TODO Major) merges.
- Per-ship QT speeds — only open this if the tool consistently misranks fast vs slow ships in the same scenario. Skip until that’s observed.

## Completed — Code Verifications

(none)

## Completed — Calibration Runs

(none)

## Archive

When Completed exceeds ~30 entries, archive to docs/VERIFICATIONS_ARCHIVE.md.