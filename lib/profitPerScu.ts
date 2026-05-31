import { CommodityRoute } from "@/lib/uex";

export function profitPerScu(route: CommodityRoute): number {
  if (!route.scu_origin || !isFinite(route.scu_origin)) return 0;
  return Math.round(route.profit / route.scu_origin);
}
