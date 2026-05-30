import {
  getCommodityPricesAll,
  getCommodityRoutes,
  CommodityPriceRecord,
  CommodityRoute,
} from "@/lib/uex";

export function shortlistCommodities(records: CommodityPriceRecord[], n: number): number[] {
  const margins = new Map<number, { maxSell: number; minBuy: number }>();

  for (const r of records) {
    const entry = margins.get(r.id_commodity) ?? { maxSell: 0, minBuy: Infinity };
    if (r.price_sell > 0 && r.price_sell > entry.maxSell) entry.maxSell = r.price_sell;
    if (r.price_buy > 0 && r.price_buy < entry.minBuy) entry.minBuy = r.price_buy;
    margins.set(r.id_commodity, entry);
  }

  return Array.from(margins.entries())
    .filter(([, { maxSell, minBuy }]) => maxSell > 0 && minBuy < Infinity)
    .map(([id, { maxSell, minBuy }]) => ({ id, margin: maxSell - minBuy }))
    .sort((a, b) => b.margin - a.margin)
    .slice(0, n)
    .map(({ id }) => id);
}

// Over-fetch buffer: fetch 20 candidates, show 10. The gap absorbs
// guard-rejected commodities (e.g. single-route outliers) without
// starving the visible board. Revisit once the route-count guard lands.
const SHORTLIST_SIZE = 20;
const DISPLAY_COUNT = 10;

// Start at 1 (only single-route commodities, e.g. Osoian Hides). Route count is a weak proxy — see Outlier guard v2 in TODO. Do not loosen without that work.
const ROUTE_COUNT_MIN = 1;

export interface CommodityRouteGroup {
  id_commodity: number;
  commodityName: string;
  routes: CommodityRoute[];
  quarantined: boolean;
}

export async function getTopRoutes(): Promise<CommodityRouteGroup[]> {
  const prices = await getCommodityPricesAll();
  const ids = shortlistCommodities(prices, SHORTLIST_SIZE);

  const nameMap = new Map<number, string>();
  for (const r of prices) {
    if (!nameMap.has(r.id_commodity) && r.commodity_name) {
      nameMap.set(r.id_commodity, r.commodity_name);
    }
  }

  const routeArrays = await Promise.all(ids.map((id) => getCommodityRoutes(id)));

  const groups: CommodityRouteGroup[] = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const routeCount = routeArrays[i].length;
    const sorted = routeArrays[i].slice().sort((a, b) => b.profit - a.profit);
    const top3 = sorted.slice(0, 3);
    if (top3.length === 0) continue;
    groups.push({
      id_commodity: id,
      commodityName: nameMap.get(id) ?? `Commodity ${id}`,
      routes: top3,
      quarantined: routeCount <= ROUTE_COUNT_MIN,
    });
  }

  groups.sort((a, b) => {
    if (a.quarantined !== b.quarantined) return a.quarantined ? 1 : -1;
    return b.routes[0].profit - a.routes[0].profit;
  });
  return groups.slice(0, DISPLAY_COUNT);
}
