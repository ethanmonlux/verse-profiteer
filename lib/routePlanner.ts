import type { CommodityPriceRecord } from "@/lib/uex";

export interface Route {
  commodityId: number;
  commodityName: string;
  buyTerminalId: number;
  buyTerminal: string;
  sellTerminalId: number;
  sellTerminal: string;
  priceBuy: number;
  priceSell: number;
  profitPerUnit: number;
  oldestDateModified: number;
}

export function planRoutes(
  records: CommodityPriceRecord[],
  opts?: { limit?: number }
): Route[] {
  const limit = opts?.limit ?? 50;

  const byCommod = new Map<number, CommodityPriceRecord[]>();
  for (const r of records) {
    let group = byCommod.get(r.id_commodity);
    if (!group) {
      group = [];
      byCommod.set(r.id_commodity, group);
    }
    group.push(r);
  }

  const routes: Route[] = [];

  for (const group of byCommod.values()) {
    const buys = group.filter((r) => r.price_buy > 0);
    const sells = group.filter((r) => r.price_sell > 0);

    for (const buy of buys) {
      for (const sell of sells) {
        const profitPerUnit = sell.price_sell - buy.price_buy;
        if (profitPerUnit <= 0) continue;
        routes.push({
          commodityId: buy.id_commodity,
          commodityName: buy.commodity_name,
          buyTerminalId: buy.id_terminal,
          buyTerminal: buy.terminal_name,
          sellTerminalId: sell.id_terminal,
          sellTerminal: sell.terminal_name,
          priceBuy: buy.price_buy,
          priceSell: sell.price_sell,
          profitPerUnit,
          oldestDateModified: Math.min(buy.date_modified, sell.date_modified),
        });
      }
    }
  }

  routes.sort((a, b) => b.profitPerUnit - a.profitPerUnit);
  return routes.slice(0, limit);
}
