import { CommodityRoute } from "@/lib/uex";
import { profitPerScu } from "@/lib/profitPerScu";

export function realizableProfit(route: CommodityRoute, shipCapacity: number): number {
  const cap =
    Number.isFinite(shipCapacity) && shipCapacity > 0 ? shipCapacity : Infinity;
  const haulable = Math.min(cap, route.scu_origin, route.scu_destination);
  return Math.round(profitPerScu(route) * haulable);
}

export function routeBottleneck(route: CommodityRoute): number {
  return Math.min(route.scu_origin, route.scu_destination);
}
