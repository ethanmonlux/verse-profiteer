import {
  getCommodityPricesAll,
  getTerminals,
  CommodityRoute,
} from "@/lib/uex";
import { getAllMirroredRoutes } from "@/lib/routesRepo";
import { realizableProfit } from "@/lib/realizableProfit";

const DISPLAY_COUNT = 10;

// Start at 1 (only single-route commodities, e.g. Osoian Hides). Route count is a weak proxy — see Outlier guard v2 in TODO. Do not loosen without that work.
const ROUTE_COUNT_MIN = 1;

export type RouteWithAutoLoad = CommodityRoute & {
  autoLoadOrigin: number;
  autoLoadDestination: number;
};

export interface CommodityRouteGroup {
  id_commodity: number;
  commodityName: string;
  routes: RouteWithAutoLoad[];
  quarantined: boolean;
}

export async function getTopRoutes(opts: {
  allowedSystems: string[];
  shipCapacity: number;
  autoLoadBuy?: boolean;
  autoLoadSell?: boolean;
}): Promise<CommodityRouteGroup[]> {
  const [prices, terminals] = await Promise.all([getCommodityPricesAll(), getTerminals()]);
  const autoLoadMap = new Map<number, number>();
  for (const t of terminals) {
    autoLoadMap.set(t.id, t.is_auto_load);
  }
  const nameMap = new Map<number, string>();
  for (const r of prices) {
    if (!nameMap.has(r.id_commodity) && r.commodity_name) {
      nameMap.set(r.id_commodity, r.commodity_name);
    }
  }

  const allRoutes = await getAllMirroredRoutes();
  const routesByCommodity = new Map<number, CommodityRoute[]>();
  for (const r of allRoutes) {
    const bucket = routesByCommodity.get(r.id_commodity);
    if (bucket) {
      bucket.push(r);
    } else {
      routesByCommodity.set(r.id_commodity, [r]);
    }
  }

  const allowedSet = new Set(opts.allowedSystems);

  const groups: CommodityRouteGroup[] = [];
  for (const [id, commodityRoutes] of routesByCommodity) {
    const runnable = commodityRoutes.filter(
      (r) =>
        r.origin_star_system_name !== null &&
        r.destination_star_system_name !== null &&
        allowedSet.has(r.origin_star_system_name) &&
        allowedSet.has(r.destination_star_system_name) &&
        (!opts.autoLoadBuy || autoLoadMap.get(r.id_terminal_origin) === 1) &&
        (!opts.autoLoadSell || autoLoadMap.get(r.id_terminal_destination) === 1)
    );
    if (runnable.length === 0) continue;
    const sorted = runnable
      .slice()
      .sort((a, b) => realizableProfit(b, opts.shipCapacity) - realizableProfit(a, opts.shipCapacity));
    const top3: RouteWithAutoLoad[] = sorted.slice(0, 3).map((r) => ({
      ...r,
      autoLoadOrigin: autoLoadMap.has(r.id_terminal_origin)
        ? (autoLoadMap.get(r.id_terminal_origin) as number)
        : -1,
      autoLoadDestination: autoLoadMap.has(r.id_terminal_destination)
        ? (autoLoadMap.get(r.id_terminal_destination) as number)
        : -1,
    }));
    groups.push({
      id_commodity: id,
      commodityName: nameMap.get(id) ?? `Commodity ${id}`,
      routes: top3,
      quarantined: runnable.length <= ROUTE_COUNT_MIN,
    });
  }

  groups.sort((a, b) => {
    if (a.quarantined !== b.quarantined) return a.quarantined ? 1 : -1;
    return (
      realizableProfit(b.routes[0], opts.shipCapacity) -
      realizableProfit(a.routes[0], opts.shipCapacity)
    );
  });
  return groups.slice(0, DISPLAY_COUNT);
}
