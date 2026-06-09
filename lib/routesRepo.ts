import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { routesMirror } from "@/lib/db/schema";
import type { CommodityRoute } from "@/lib/uex";

export async function getDistinctOriginTerminalIds(): Promise<number[]> {
  const db = getDb();
  const rows = await db
    .selectDistinct({ id: routesMirror.idTerminalOrigin })
    .from(routesMirror);
  return rows.map((r) => r.id as number);
}

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

// Reads only the rows for one commodity from the Postgres mirror, querying on
// the indexed id_commodity column. Same as getAllMirroredRoutes: the `raw`
// jsonb column is the exact original CommodityRoute object, returned with no
// field mapping. Spine Rule preserved: nothing is read from the typed columns.
export async function getMirroredRoutesByCommodity(
  idCommodity: number,
): Promise<CommodityRoute[]> {
  const db = getDb();
  const rows = await db
    .select({ raw: routesMirror.raw })
    .from(routesMirror)
    .where(eq(routesMirror.idCommodity, idCommodity));
  return rows.map((row) => row.raw as CommodityRoute);
}
