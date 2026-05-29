import { getCommodityPricesAll } from "@/lib/uex";
import { planRoutes } from "@/lib/routePlanner";

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

export default async function Home() {
  const prices = await getCommodityPricesAll();
  const routes = planRoutes(prices);

  return (
    <main className="min-h-screen px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-accent mb-1">Verse Profiteer</h1>
      <p className="text-sm text-text-muted mb-6">
        Top cargo trade routes · sorted by profit per unit
      </p>

      {routes.length === 0 ? (
        <p className="text-center text-text-muted">No routes available.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {routes.map((route) => {
            const { label, stale } = relativeAge(route.oldestDateModified);
            return (
              <div
                key={`${route.commodityId}-${route.buyTerminalId}-${route.sellTerminalId}`}
                className="rounded-lg border border-border bg-bg-card p-4"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="font-semibold">{route.commodityName}</span>
                  <span className="text-profit font-bold text-lg tabular-nums">
                    +{route.profitPerUnit.toLocaleString()}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-start gap-x-2 gap-y-1">
                  <div>
                    <div className="text-sm text-text-muted">{route.buyTerminal}</div>
                    <div className="text-xs text-text-muted tabular-nums">
                      {route.priceBuy.toLocaleString()}
                    </div>
                  </div>
                  <span className="text-sm text-text-muted self-center">→</span>
                  <div>
                    <div className="text-sm text-text-muted">{route.sellTerminal}</div>
                    <div className="text-xs text-text-muted tabular-nums">
                      {route.priceSell.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className={`mt-2 text-xs ${stale ? "text-warning" : "text-text-muted"}`}>
                  Updated {label}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
