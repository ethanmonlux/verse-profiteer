import { getTopRoutes } from "@/lib/routes";
import DebugPrices from "@/app/DebugPrices";
import DebugQt from "@/app/DebugQt";
import Board from "@/app/Board";

export default async function Home() {
  const groups = await getTopRoutes();

  return (
    <main className="min-h-screen px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-accent mb-1">Verse Profiteer</h1>
      <p className="text-sm text-text-muted mb-6">
        Top cargo trades · best routes per commodity
      </p>
      <DebugPrices />
      <DebugQt />
      <Board groups={groups} />
    </main>
  );
}
