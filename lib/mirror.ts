import { sql } from "drizzle-orm";

import { db } from "./db";
import { routesMirror, terminalsMirror } from "./db/schema";
import type { CommodityRoute, Terminal } from "./uex";

/**
 * Defensive normalization of UEX's `container_sizes` string into an int array.
 *
 * Returns the parsed array ONLY when every comma-separated token is a positive
 * integer. On any unexpected token (empty, NaN, non-integer, negative, zero, a
 * range like "1-8"), returns null. null means "unknown", which is honest; a
 * partial or garbage array would be a lie. The raw string is preserved
 * separately in the `raw` jsonb column by the upsert, so nothing is lost.
 */
export function parseContainerSizes(raw: string): number[] | null {
  if (raw == null) {
    return null;
  }

  const trimmed = raw.trim();
  if (trimmed === "") {
    return null;
  }

  const tokens = trimmed.split(",");
  const sizes: number[] = [];

  for (const token of tokens) {
    const t = token.trim();
    if (t === "") {
      return null;
    }
    const n = Number(t);
    if (!Number.isInteger(n) || n <= 0) {
      return null;
    }
    sizes.push(n);
  }

  return sizes;
}

/**
 * Process ids in batches, awaiting each batch fully before starting the next,
 * and pausing delayMs between batches (no pause after the final batch). This
 * protects the shared UEX 120/min rate cap — a single Promise.all over all ids
 * would burst far past it. Results are returned in the same order as `ids`.
 */
export async function pacedFanOut<T>(
  ids: number[],
  fn: (id: number) => Promise<T>,
  opts?: { batchSize?: number; delayMs?: number },
): Promise<T[]> {
  const batchSize = opts?.batchSize ?? 10;
  const delayMs = opts?.delayMs ?? 6000;

  const results: T[] = [];

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((id) => fn(id)));
    results.push(...batchResults);

    const hasMore = i + batchSize < ids.length;
    if (hasMore) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Mirror UEX terminals into terminals_mirror. Upserts on id, updating every
 * non-id column (including refreshedAt) on conflict. Returns the count of rows
 * processed.
 */
export async function upsertTerminals(terminals: Terminal[]): Promise<number> {
  if (terminals.length === 0) {
    return 0;
  }

  const now = new Date();

  const rows = terminals.map((t) => ({
    id: t.id,
    isAutoLoad: t.is_auto_load,
    starSystemName: t.star_system_name,
    planetName: t.planet_name,
    moonName: t.moon_name,
    outpostName: t.outpost_name,
    isCargoCenter: t.is_cargo_center,
    hasFreightElevator: t.has_freight_elevator,
    hasLoadingDock: t.has_loading_dock,
    hasDockingPort: t.has_docking_port,
    raw: t,
    refreshedAt: now,
  }));

  await db
    .insert(terminalsMirror)
    .values(rows)
    .onConflictDoUpdate({
      target: terminalsMirror.id,
      set: {
        isAutoLoad: sql`excluded.is_auto_load`,
        starSystemName: sql`excluded.star_system_name`,
        planetName: sql`excluded.planet_name`,
        moonName: sql`excluded.moon_name`,
        outpostName: sql`excluded.outpost_name`,
        isCargoCenter: sql`excluded.is_cargo_center`,
        hasFreightElevator: sql`excluded.has_freight_elevator`,
        hasLoadingDock: sql`excluded.has_loading_dock`,
        hasDockingPort: sql`excluded.has_docking_port`,
        raw: sql`excluded.raw`,
        refreshedAt: sql`excluded.refreshed_at`,
      },
    });

  return rows.length;
}

const ROUTE_INSERT_CHUNK = 500;

/**
 * Mirror UEX commodity routes into routes_mirror. numeric columns expect string
 * input (drizzle's default numeric mode is 'string'), so number fields are
 * converted with String(...). container_sizes are normalized via
 * parseContainerSizes — when that returns null, a concise warning is logged and
 * null is stored; the row is never skipped or crashed. game_version columns are
 * left null (CommodityRoute carries no game_version fields). Upserts on id,
 * updating every non-id column on conflict, batched in chunks. Returns the count
 * of rows processed.
 */
export async function upsertRoutes(routes: CommodityRoute[]): Promise<number> {
  if (routes.length === 0) {
    return 0;
  }

  const now = new Date();

  const rows = routes.map((r) => {
    const containerSizesOrigin = parseContainerSizes(r.container_sizes_origin);
    if (containerSizesOrigin === null) {
      console.warn(
        `[mirror] route ${r.id}: unparseable container_sizes_origin ${JSON.stringify(
          r.container_sizes_origin,
        )} — storing null`,
      );
    }

    const containerSizesDestination = parseContainerSizes(
      r.container_sizes_destination,
    );
    if (containerSizesDestination === null) {
      console.warn(
        `[mirror] route ${r.id}: unparseable container_sizes_destination ${JSON.stringify(
          r.container_sizes_destination,
        )} — storing null`,
      );
    }

    return {
      id: r.id,
      idCommodity: r.id_commodity,
      idTerminalOrigin: r.id_terminal_origin,
      idTerminalDestination: r.id_terminal_destination,
      idStarSystemOrigin: r.id_star_system_origin,
      idStarSystemDestination: r.id_star_system_destination,
      priceOrigin: String(r.price_origin),
      priceDestination: String(r.price_destination),
      profit: String(r.profit),
      investment: String(r.investment),
      distance: String(r.distance),
      scuOrigin: String(r.scu_origin),
      scuDestination: String(r.scu_destination),
      scuReachable: String(r.scu_reachable),
      statusOrigin: r.status_origin,
      statusDestination: r.status_destination,
      containerSizesOrigin,
      containerSizesDestination,
      gameVersionOrigin: null,
      gameVersionDestination: null,
      raw: r,
      refreshedAt: now,
    };
  });

  for (let i = 0; i < rows.length; i += ROUTE_INSERT_CHUNK) {
    const chunk = rows.slice(i, i + ROUTE_INSERT_CHUNK);
    await db
      .insert(routesMirror)
      .values(chunk)
      .onConflictDoUpdate({
        target: routesMirror.id,
        set: {
          idCommodity: sql`excluded.id_commodity`,
          idTerminalOrigin: sql`excluded.id_terminal_origin`,
          idTerminalDestination: sql`excluded.id_terminal_destination`,
          idStarSystemOrigin: sql`excluded.id_star_system_origin`,
          idStarSystemDestination: sql`excluded.id_star_system_destination`,
          priceOrigin: sql`excluded.price_origin`,
          priceDestination: sql`excluded.price_destination`,
          profit: sql`excluded.profit`,
          investment: sql`excluded.investment`,
          distance: sql`excluded.distance`,
          scuOrigin: sql`excluded.scu_origin`,
          scuDestination: sql`excluded.scu_destination`,
          scuReachable: sql`excluded.scu_reachable`,
          statusOrigin: sql`excluded.status_origin`,
          statusDestination: sql`excluded.status_destination`,
          containerSizesOrigin: sql`excluded.container_sizes_origin`,
          containerSizesDestination: sql`excluded.container_sizes_destination`,
          gameVersionOrigin: sql`excluded.game_version_origin`,
          gameVersionDestination: sql`excluded.game_version_destination`,
          raw: sql`excluded.raw`,
          refreshedAt: sql`excluded.refreshed_at`,
        },
      });
  }

  return rows.length;
}
