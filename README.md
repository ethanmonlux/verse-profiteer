# Verse Profiteer

Trade route planner for Star Citizen. Mirrors live market data, ranks routes by realizable profit per minute (not per unit), and tracks an actual cargo run as a ledger so the math survives contact with the game.

Built because every existing tool ranks routes by spreadsheet profit. Real profit depends on travel time, spool time, load/unload overhead, auto-load fees charged on both ends, and whether the price data is 16 hours stale. This models all of that.

## What it does

- **Route board** — top routes filtered by ship, origin terminal, and star system. Ranked by profit per minute using a travel-time model (QT speed, spool, terminal overhead, per-SCU load time) calibrated against stopwatch runs in the live game.
- **Plan composer** — log acquires and disposes as you fly. Position, unrealized (held at cost), and realized P&L derive on read from the raw ledger. Weighted-average cost basis, over-sell surfaces an error banner instead of a 500.
- **Staleness gating** — every route card shows the age of the older price leg, with a warning past the threshold. Stale data is the main way trade tools lie to you; this one tells you.

## Architecture

Next.js (App Router, TypeScript) + Drizzle/Postgres. A Railway worker mirrors UEX market data on a cron offset a few minutes past UEX's observed publish grid (measured, not guessed). The fan-out across ~120 commodity calls uses per-call timeouts, bounded retries with backoff on network/5xx only, and a failure threshold: zero rows or >10% failures aborts the run loudly, anything less logs a skip summary and upserts what succeeded.

## Testing and verification

`npm test` (vitest) covers the derive-on-read ledger math, route ranking, and resilience cases. Beyond unit tests, [VERIFICATIONS.md](./VERIFICATIONS.md) is the standing protocol: any change touching a state-sensitive system isn't done until it's been exercised against a real scenario with a known answer — a route walked by hand, a sale reconciled to the credit against the account balance, a price cross-checked in-game. Calibration runs against live gameplay are tracked there too.

## Running locally

```bash
cp .env.example .env   # Postgres connection + UEX config
npm install
npm run db:migrate
npm run dev
```

`npm run refresh:mirror` pulls market data manually. `npm run typecheck` and `npm run lint` before commits.

## Status

Active. Current work is tracked in [TODO.md](./TODO.md); pending verifications in [VERIFICATIONS.md](./VERIFICATIONS.md).
