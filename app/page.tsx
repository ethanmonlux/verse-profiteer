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

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-sm bg-bg-card">
          <thead>
            <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-left whitespace-nowrap">Commodity</th>
              <th className="px-4 py-3 text-left whitespace-nowrap">Buy terminal</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">Buy price</th>
              <th className="px-4 py-3 text-left whitespace-nowrap">Sell terminal</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">Sell price</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">Profit / unit</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">Updated</th>
            </tr>
          </thead>
          <tbody>
            {routes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-text-muted">
                  No routes available.
                </td>
              </tr>
            ) : (
              routes.map((route) => {
                const { label, stale } = relativeAge(route.oldestDateModified);
                return (
                  <tr
                    key={`${route.commodityId}-${route.buyTerminalId}-${route.sellTerminalId}`}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {route.commodityName}
                    </td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                      {route.buyTerminal}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                      {route.priceBuy.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                      {route.sellTerminal}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                      {route.priceSell.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-profit whitespace-nowrap">
                      +{route.profitPerUnit.toLocaleString()}
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums whitespace-nowrap ${
                        stale ? "text-warning" : "text-text-muted"
                      }`}
                    >
                      {label}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
