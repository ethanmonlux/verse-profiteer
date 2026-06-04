import { pool } from "@/lib/db";
import { pacedFanOut, upsertRoutes, upsertTerminals } from "@/lib/mirror";
import {
  getCommodityPricesAll,
  getCommodityRoutes,
  getTerminals,
} from "@/lib/uex";
import type { CommodityRoute } from "@/lib/uex";

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log(`[refresh-mirror] start ${new Date(startedAt).toISOString()}`);

  // Terminals first: cheap, a single bulk call.
  const terminals = await getTerminals();
  const tCount = await upsertTerminals(terminals);
  console.log(`[refresh-mirror] upserted ${tCount} terminals`);

  // Enumerate the FULL commodity id list from the bulk price pull. The mirror
  // holds the complete dataset, not a top-N margin shortlist.
  const prices = await getCommodityPricesAll();
  const ids = [...new Set(prices.map((p) => p.id_commodity))];
  console.log(`[refresh-mirror] fetching routes for ${ids.length} distinct commodity ids`);

  // Paced fan-out protects the shared UEX 120/min cap (default batch 10 / 6s).
  const routeArrays = await pacedFanOut(ids, (id) => getCommodityRoutes(id));
  const allRoutes: CommodityRoute[] = routeArrays.flat();
  console.log(`[refresh-mirror] collected ${allRoutes.length} route rows`);

  const rCount = await upsertRoutes(allRoutes);
  console.log(`[refresh-mirror] upserted ${rCount} route rows`);

  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`[refresh-mirror] done in ${elapsedSec}s`);
}

main()
  .catch((err) => {
    // A failed refresh must surface as a failed run, not a silent success.
    console.error("[refresh-mirror] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Always close the pool so the process can exit cleanly.
    await pool.end();
  });
