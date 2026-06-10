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

export default function Board({
  groups,
  capacity,
}: {
  groups: CommodityRouteGroup[];
  capacity: number;
}) {
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  return (
    <>
      {groups.length === 0 ? (
        <p className="text-center text-text-muted">No routes available.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.length < 10 && (
            <p className="text-sm text-text-muted">
              {groups.length} runnable route{groups.length !== 1 ? "s" : ""} in your selected systems
            </p>
          )}
          {groups.map((group) => {
            const headlineAge = group.routes[0].dataAgeUnix;
            const ageInfo = headlineAge !== null ? relativeAge(headlineAge) : null;
            const stale = ageInfo === null || ageInfo.stale;
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
                  <span className={`${primaryRealizable < 0 ? "text-loss" : "text-profit"} font-bold text-lg tabular-nums`}>
                    {primaryRealizable >= 0 ? "+" : ""}{primaryRealizable.toLocaleString()} aUEC
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
                    const haulable = Math.min(capacity, route.scu_origin, route.scu_destination);
                    const supply = routeBottleneck(route);
                    return (
                      <div key={route.id} className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-sm text-text-muted">{routeLabel}</span>
                          {isExpanded && (
                            <span className={`${realizable < 0 ? "text-loss" : "text-profit"} font-semibold tabular-nums`}>{realizable >= 0 ? "+" : ""}{realizable.toLocaleString()} aUEC realizable</span>
                          )}
                        </div>
                        <div className="text-xs text-text-muted tabular-nums">
                          pick up {haulable.toLocaleString()} SCU · {supply.toLocaleString()} available
                        </div>
                        <div className="text-xs text-text-muted tabular-nums">
                          P/L {pps.toLocaleString()} aUEC/SCU
                        </div>
                        <div className="text-xs text-text-muted tabular-nums">
                          buy {route.price_origin.toLocaleString()} aUEC/SCU · sell {route.price_destination.toLocaleString()} aUEC/SCU
                        </div>
                        <div className="text-xs text-text-muted">
                          {"load "}
                          <span className={route.autoLoadOrigin === 1 ? "text-profit" : "text-text-muted"}>
                            {route.autoLoadOrigin === 1 ? "⚡" : route.autoLoadOrigin === 0 ? "✋" : "—"}
                          </span>
                          {" · unload "}
                          <span className={route.autoLoadDestination === 1 ? "text-profit" : "text-text-muted"}>
                            {route.autoLoadDestination === 1 ? "⚡" : route.autoLoadDestination === 0 ? "✋" : "—"}
                          </span>
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
                  {ageInfo !== null ? `prices last seen ${ageInfo.label}` : "price age unknown"}
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
