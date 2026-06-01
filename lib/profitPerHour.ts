import { CommodityRoute } from "@/lib/uex";
import { estimateTravelMinutes } from "@/lib/travelTime";
import { realizableProfit } from "@/lib/realizableProfit";

export function profitPerHour(route: CommodityRoute, shipCapacity: number): number {
  const minutes = estimateTravelMinutes(route);
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  return Math.round(realizableProfit(route, shipCapacity) / (minutes / 60));
}
