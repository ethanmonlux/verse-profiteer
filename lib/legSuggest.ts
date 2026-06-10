// Auto leg-generation, Scope A: next-leg suggestion from a fixed origin.
// This is D7's edge-profit primitive — best-cargo-for-a-fixed-origin.
// Ranking is realizable profit; aUEC/hr is a DISPLAY HINT ONLY until
// travel-time calibration (D7 RC3). Next-leg candidates fan out from one
// origin to many destinations (cross-shape edges), so per-hour ordering is
// untrustworthy on uncalibrated seed constants — never sort on it.

import { getAllMirroredRoutes } from "@/lib/routesRepo";
import { realizableProfit, routeBottleneck } from "@/lib/realizableProfit";
import { estimateTravelMinutes } from "@/lib/travelTime";

export interface LegSuggestion {
  idCommodity: number;
  idTerminalOrigin: number;
  idTerminalDestination: number;
  originTerminalName: string | null;
  destinationTerminalName: string | null;
  realizableProfit: number; // the sort key
  bottleneckScu: number; // routeBottleneck(route)
  haulableScu: number; // Math.min(shipCapacity, bottleneckScu)
  estimateMinutes: number; // estimateTravelMinutes(route)
  aUecPerHrHint: number; // realizableProfit / (estimateMinutes / 60); DISPLAY HINT ONLY, never used to sort
}

export async function suggestNextLegs(opts: {
  originTerminal: number;
  shipCapacity: number;
  allowedSystems: string[];
  limit?: number;
}): Promise<LegSuggestion[]> {
  const { originTerminal, shipCapacity, allowedSystems, limit = 10 } = opts;

  const routes = await getAllMirroredRoutes();

  const allowed = new Set(allowedSystems);

  const suggestions = routes
    .filter(
      (route) =>
        route.id_terminal_origin === originTerminal &&
        route.origin_star_system_name != null &&
        route.destination_star_system_name != null &&
        allowed.has(route.origin_star_system_name) &&
        allowed.has(route.destination_star_system_name),
    )
    .map((route) => {
      const profit = realizableProfit(route, shipCapacity);
      const bottleneckScu = routeBottleneck(route);
      const estimateMinutes = estimateTravelMinutes(route);
      const aUecPerHrHint =
        estimateMinutes > 0 ? profit / (estimateMinutes / 60) : 0;
      return {
        idCommodity: route.id_commodity,
        idTerminalOrigin: route.id_terminal_origin,
        idTerminalDestination: route.id_terminal_destination,
        originTerminalName: route.origin_terminal_name,
        destinationTerminalName: route.destination_terminal_name,
        realizableProfit: profit,
        bottleneckScu,
        haulableScu: Math.min(shipCapacity, bottleneckScu),
        estimateMinutes,
        aUecPerHrHint,
      };
    });

  // Sort descending by realizableProfit ONLY (D7: aUEC/hr is a display hint,
  // not the ranking signal — see file header).
  suggestions.sort((a, b) => b.realizableProfit - a.realizableProfit);

  return suggestions.slice(0, limit);
}
