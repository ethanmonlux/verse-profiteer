import { getTerminals, getCommodityPricesAll } from "@/lib/uex";
import PlanComposer from "@/app/PlanComposer";
import type { SheetOption } from "@/app/SearchableSheet";

export default async function PlanPage() {
  const [terminals, prices] = await Promise.all([
    getTerminals(),
    getCommodityPricesAll(),
  ]);

  const terminalOptions: SheetOption[] = terminals
    .filter((t) => t.star_system_name === "Stanton" && t.name !== null)
    .map((t) => ({
      id: t.id,
      primary: t.name,
      secondary:
        t.planet_name ??
        t.moon_name ??
        t.outpost_name ??
        t.star_system_name ??
        undefined,
    }))
    .sort((a, b) => a.primary.localeCompare(b.primary));

  // Dedupe price rows (many per commodity) down to one option per commodity.
  const seen = new Set<number>();
  const commodityOptions: SheetOption[] = [];
  for (const p of prices) {
    if (seen.has(p.id_commodity)) continue;
    seen.add(p.id_commodity);
    commodityOptions.push({ id: p.id_commodity, primary: p.commodity_name });
  }
  commodityOptions.sort((a, b) => a.primary.localeCompare(b.primary));

  return (
    <main className="min-h-screen px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-accent mb-1">Plan composer</h1>
      <p className="text-sm text-text-muted mb-6">
        Manual entry · raw rows, no computed numbers yet
      </p>
      <PlanComposer
        terminalOptions={terminalOptions}
        commodityOptions={commodityOptions}
      />
    </main>
  );
}
