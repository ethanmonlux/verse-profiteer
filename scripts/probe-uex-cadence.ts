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

  // Track the single highest-profit route (UEX's own profit field) so the same
  // route is followed across runs. Derived from the routes array already pulled.
  const bestRoute = routes.reduce<(typeof routes)[number] | null>(
    (best, r) => (best === null || r.profit > best.profit ? r : best),
    null,
  );
  const topRoute = bestRoute && {
    origin_terminal_name: bestRoute.origin_terminal_name,
    destination_terminal_name: bestRoute.destination_terminal_name,
    price_origin: bestRoute.price_origin,
    price_destination: bestRoute.price_destination,
    profit: bestRoute.profit,
    scu_origin: bestRoute.scu_origin,
    scu_destination: bestRoute.scu_destination,
    scu_reachable: bestRoute.scu_reachable,
    status_origin: bestRoute.status_origin,
    status_destination: bestRoute.status_destination,
    date_added: bestRoute.date_added,
  };

  // Bucket every price row by age (now - date_modified) from the prices array
  // already pulled. Missing/zero date_modified counts as the oldest band.
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
    if (modified <= 0) {
      priceAgeBuckets.over7day += 1;
      continue;
    }
    const ageSec = nowUnix - modified;
    if (ageSec < 30 * 60) priceAgeBuckets.under30min += 1;
    else if (ageSec < 3 * 3600) priceAgeBuckets.under3hr += 1;
    else if (ageSec < 12 * 3600) priceAgeBuckets.under12hr += 1;
    else if (ageSec < 24 * 3600) priceAgeBuckets.under1day += 1;
    else if (ageSec < 3 * 24 * 3600) priceAgeBuckets.under3day += 1;
    else if (ageSec < 7 * 24 * 3600) priceAgeBuckets.under7day += 1;
    else priceAgeBuckets.over7day += 1;
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
    topRoute: topRoute ?? null,
  };

  console.log(`${TOKEN} ${JSON.stringify(line)}`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`${TOKEN} error`, message);
  process.exitCode = 1;
});
