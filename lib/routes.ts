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

export async function getTopRoutes(): Promise<CommodityRoute[]> {
  const prices = await getCommodityPricesAll();
  const ids = shortlistCommodities(prices, SHORTLIST_SIZE);
  const routeArrays = await Promise.all(ids.map((id) => getCommodityRoutes(id)));
  const all = routeArrays.flat();
  all.sort((a, b) => b.profit - a.profit);
  return all.slice(0, DISPLAY_COUNT);
}
