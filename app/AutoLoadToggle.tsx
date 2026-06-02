"use client";

import { useRouter } from "next/navigation";

export default function AutoLoadToggle({
  autoLoadBuy,
  autoLoadSell,
  selectedSystems,
  currentShipId,
}: {
  autoLoadBuy: boolean;
  autoLoadSell: boolean;
  selectedSystems: string[];
  currentShipId?: number;
}) {
  const router = useRouter();

  function toggleBuy() {
    const systemsPart = `systems=${selectedSystems.join(",")}`;
    const shipPart = currentShipId !== undefined ? `&ship=${currentShipId}` : "";
    const buyPart = autoLoadBuy ? "" : "&autoLoadBuy=1";
    const sellPart = autoLoadSell ? "&autoLoadSell=1" : "";
    router.push(`?${systemsPart}${shipPart}${buyPart}${sellPart}`);
  }

  function toggleSell() {
    const systemsPart = `systems=${selectedSystems.join(",")}`;
    const shipPart = currentShipId !== undefined ? `&ship=${currentShipId}` : "";
    const buyPart = autoLoadBuy ? "&autoLoadBuy=1" : "";
    const sellPart = autoLoadSell ? "" : "&autoLoadSell=1";
    router.push(`?${systemsPart}${shipPart}${buyPart}${sellPart}`);
  }

  return (
    <div className="flex items-center gap-2 mb-4">
      <button
        onClick={toggleBuy}
        className={`rounded border px-3 py-1 text-sm transition-colors ${
          autoLoadBuy
            ? "border-accent text-accent"
            : "border-border text-text-muted hover:border-accent hover:text-accent"
        }`}
      >
        Auto-load at buy
      </button>
      <button
        onClick={toggleSell}
        className={`rounded border px-3 py-1 text-sm transition-colors ${
          autoLoadSell
            ? "border-accent text-accent"
            : "border-border text-text-muted hover:border-accent hover:text-accent"
        }`}
      >
        Auto-unload at sell
      </button>
    </div>
  );
}
