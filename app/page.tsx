import { getTopRoutes } from "@/lib/routes";

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
  const groups = await getTopRoutes();

  return (
    <main className="min-h-screen px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-accent mb-1">Verse Profiteer</h1>
      <p className="text-sm text-text-muted mb-6">
        Top cargo trades · best routes per commodity
      </p>

      {groups.length === 0 ? (
        <p className="text-center text-text-muted">No routes available.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((group) => {
            const { label, stale } = relativeAge(group.routes[0].date_added);
            return (
              <div
                key={group.id_commodity}
                className="rounded-lg border border-border bg-bg-card p-4"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="font-semibold text-accent">{group.commodityName}</span>
                  <span className="text-profit font-bold text-lg tabular-nums">
                    +{group.routes[0].profit.toLocaleString()}
                  </span>
                </div>

                <div className="mt-2 flex flex-col gap-1">
                  {group.routes.map((route) => {
                    const routeLabel =
                      route.origin_terminal_name && route.destination_terminal_name
                        ? `${route.origin_terminal_name} → ${route.destination_terminal_name}`
                        : `Route ${route.id}`;
                    return (
                      <div key={route.id} className="flex justify-between items-center gap-2">
                        <span className="text-sm text-text-muted">{routeLabel}</span>
                        <span className="text-sm tabular-nums">+{route.profit.toLocaleString()}</span>
                      </div>
                    );
                  })}
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
