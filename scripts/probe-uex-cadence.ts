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

  const line = {
    ts: new Date().toISOString(),
    probeId,
    newestPriceModified: {
      iso: new Date(newestPriceUnix * 1000).toISOString(),
      unix: newestPriceUnix,
    },
    priceRowCount: prices.length,
    newestRouteAdded: {
      iso: new Date(newestRouteUnix * 1000).toISOString(),
      unix: newestRouteUnix,
    },
    routeCount: routes.length,
  };

  console.log(`${TOKEN} ${JSON.stringify(line)}`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`${TOKEN} error`, message);
  process.exitCode = 1;
});
