// Throwaway diagnostic: one-shot UEX freshness probe for a SHORT Railway cron.
// UEX-only by design — no lib/db, no lib/mirror, no ranking. Output is a single
// greppable JSON line to stdout. Each invocation does ONE cycle and exits;
// Railway's cron handles repetition (this script does NOT loop or self-schedule).
import { getCommodityPricesAll, getCommodityRoutes } from "@/lib/uex";

const TOKEN = "[uex-cadence]";

async function main(): Promise<void> {
  const probeId = Number(process.env.PROBE_COMMODITY_ID ?? 75);

  // Exactly two UEX calls. No fan-out, no loop.
  const prices = await getCommodityPricesAll();
  const routes = await getCommodityRoutes(probeId);

  const newestPriceUnix = prices.reduce(
    (max, p) => Math.max(max, p.date_modified ?? 0),
    0,
  );
  const newestRouteUnix = routes.reduce(
    // date_added may not be on the CommodityRoute type for all rows; cast inline.
    (max, r) => Math.max(max, (r as { date_added?: number }).date_added ?? 0),
    0,
  );

  // Highest-profit route (UEX's own profit field), so the same route is tracked
  // consistently across runs. Derived from the routes array already pulled.
  const best = routes.reduce<(typeof routes)[number] | null>(
    (top, r) => (top === null || r.profit > top.profit ? r : top),
    null,
  );
  const topRoute =
    best === null
      ? null
      : {
          origin_terminal_name: best.origin_terminal_name,
          destination_terminal_name: best.destination_terminal_name,
          price_origin: best.price_origin,
          price_destination: best.price_destination,
          profit: best.profit,
          scu_origin: best.scu_origin,
          scu_destination: best.scu_destination,
          scu_reachable: best.scu_reachable,
          status_origin: best.status_origin,
          status_destination: best.status_destination,
          date_added: best.date_added,
        };

  // Price-age histogram from the prices array already pulled. Mutually exclusive
  // bands; a row with missing/zero date_modified counts as over7day.
  const HOUR = 3600;
  const DAY = 24 * HOUR;
  const nowUnix = Date.now() / 1000;
  const priceAgeBuckets = {
    under30min: 0,
    under3hr: 0,
    under12hr: 0,
    under1day: 0,
    under3day: 0,
    under7day: 0,
    over7day: 0,
  };
  for (const p of prices) {
    const modified = p.date_modified ?? 0;
    const age = modified > 0 ? nowUnix - modified : Infinity;
    if (age < 0.5 * HOUR) priceAgeBuckets.under30min++;
    else if (age < 3 * HOUR) priceAgeBuckets.under3hr++;
    else if (age < 12 * HOUR) priceAgeBuckets.under12hr++;
    else if (age < 1 * DAY) priceAgeBuckets.under1day++;
    else if (age < 3 * DAY) priceAgeBuckets.under3day++;
    else if (age < 7 * DAY) priceAgeBuckets.under7day++;
    else priceAgeBuckets.over7day++;
  }

  const line = {
    ts: new Date().toISOString(),
    probeId,
    newestPriceModified: {
      iso: new Date(newestPriceUnix * 1000).toISOString(),
      unix: newestPriceUnix,
    },
    priceRowCount: prices.length,
    priceAgeBuckets,
    newestRouteAdded: {
      iso: new Date(newestRouteUnix * 1000).toISOString(),
      unix: newestRouteUnix,
    },
    routeCount: routes.length,
    topRoute,
  };

  console.log(`${TOKEN} ${JSON.stringify(line)}`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`${TOKEN} error`, message);
  process.exitCode = 1;
});
