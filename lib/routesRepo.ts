import { getDb } from "@/lib/db";
import { routesMirror } from "@/lib/db/schema";
import type { CommodityRoute } from "@/lib/uex";

// Reads the full route set from the Postgres mirror. The `raw` jsonb column is
// the exact original CommodityRoute object the live UEX path returned, so we
// cast and return with no field mapping or reconstruction. Derive-on-read
// (Spine Rule) is preserved: no profit/distance/duration is read from the typed
// columns.
export async function getAllMirroredRoutes(): Promise<CommodityRoute[]> {
  const db = getDb();
  const rows = await db.select({ raw: routesMirror.raw }).from(routesMirror);
  return rows.map((row) => row.raw as CommodityRoute);
}
