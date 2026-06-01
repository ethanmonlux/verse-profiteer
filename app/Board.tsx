"use client";

import { useState } from "react";
import { CommodityRouteGroup } from "@/lib/routes";
import DebugRoutes from "@/app/DebugRoutes";
import { estimateTravelRange } from "@/lib/travelTime";
import { profitPerScu } from "@/lib/profitPerScu";
import { realizableProfit, routeBottleneck } from "@/lib/realizableProfit";

function relativeAge(unixSeconds: number): { label: string; stale: boolean } {
  const diffSec = Math.floor(Date.now() / 1000) - unixSeconds;
  const stale = diffSec > 30 * 86400;

  if (diffSec < 60) return { label: `${diffSec}s ago`, stale };
  if (diffSec < 3600) return { label: `${Math.floor(diffSec / 60)}m ago`, stale };
  if (diffSec < 86400) return { label: `${Math.floor(diffSec / 3600)}h ago`, stale };
  if (diffSec < 2592000) return { label: `${Math.floor(diffSec / 86400)}d ago`, stale };
  if (diffSec < 31536000) return { label: `${Math.floor(diffSec / 2592000)}mo ago`, stale };
  return { label: `${Math.floor(diffSec / 31536000)}yr ago`, stale };
}

export default function Board({ groups }: { groups: CommodityRouteGroup[] }) {
  const [capacityStr, setCapacityStr] = useState("");
  const capacity = parseFloat(capacityStr);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <label htmlFor="ship-capacity" className="text-sm text-text-muted">
          Ship capacity (SCU)
        </label>
        <input
          id="ship-capacity"
          type="number"
          min={1}
          className="w-24 rounded border border-border bg-bg-card px-2 py-1 text-sm tabular-nums text-accent placeholder:text-text-muted focus:outline-none focus:border-accent"
          value={capacityStr}
          onChange={(e) => setCapacityStr(e.target.value)}
          placeholder="—"
        />
      </div>

      {groups.length === 0 ? (
        <p className="text-center text-text-muted">No routes available.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((group) => {
            const { label, stale } = relativeAge(group.routes[0].date_added);
            const isExpanded = expandedCards.has(group.id_commodity);
            const routesToShow = isExpanded ? group.routes : [group.routes[0]];
            const primaryRealizable = realizableProfit(group.routes[0], capacity);
            return (
              <div
                key={group.id_commodity}
                className="rounded-lg border border-border bg-bg-card p-4"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-accent">{group.commodityName}</span>
                    {group.quarantined && (
                      <span className="text-xs text-warning">single route — unverified</span>
                    )}
                  </div>
                  <span className="text-profit font-bold text-lg tabular-nums">
                    +{primaryRealizable.toLocaleString()}
                  </span>
                </div>

                <div className="mt-2 flex flex-col gap-1">
                  {routesToShow.map((route) => {
                    const routeLabel =
                      route.origin_terminal_name && route.destination_terminal_name
                        ? `${route.origin_terminal_name} → ${route.destination_terminal_name}`
                        : `Route ${route.id}`;
                    const { min, max } = estimateTravelRange(route);
                    const pps = profitPerScu(route);
                    const realizable = realizableProfit(route, capacity);
                    const bottleneck = routeBottleneck(route);
                    const hasCapacity = Number.isFinite(capacity) && capacity > 0;
                    const haulable = hasCapacity
                      ? Math.min(capacity, route.scu_origin, route.scu_destination)
                      : null;
                    const supply = routeBottleneck(route);
                    return (
                      <div key={route.id} className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-sm text-text-muted">{routeLabel}</span>
                          {isExpanded && (
                            <span className="text-profit font-semibold tabular-nums">+{realizable.toLocaleString()} realizable</span>
                          )}
                        </div>
                        <div className="text-xs text-text-muted tabular-nums">
                          {haulable !== null ? `pick up ${haulable.toLocaleString()} SCU · ${supply.toLocaleString()} available` : `at ${bottleneck} SCU max supply`}
                        </div>
                        <div className="text-xs text-text-muted tabular-nums">
                          {pps.toLocaleString()}/SCU
                        </div>
                        {isExpanded && (
                          <div className="text-xs text-text-muted tabular-nums">
                            {min}–{max} min
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {group.routes.length > 1 && (
                    <button
                      className="text-xs text-accent text-left"
                      onClick={() =>
                        setExpandedCards((prev) => {
                          const next = new Set(prev);
                          if (isExpanded) next.delete(group.id_commodity);
                          else next.add(group.id_commodity);
                          return next;
                        })
                      }
                    >
                      {isExpanded ? "show less" : `+${group.routes.length - 1} more routes`}
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-text-muted">travel time uncalibrated — seed estimate</p>

                <div className={`mt-2 text-xs ${stale ? "text-warning" : "text-text-muted"}`}>
                  Updated {label}
                </div>
                <DebugRoutes idCommodity={group.id_commodity} />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
