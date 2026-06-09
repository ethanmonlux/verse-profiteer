"use client";

import { useRouter } from "next/navigation";

type TerminalOption = { id: number; name: string };

export default function OriginPicker({
  terminals,
  selectedOrigin,
  selectedSystems,
  currentShipId,
  autoLoadBuy,
  autoLoadSell,
}: {
  terminals: TerminalOption[];
  selectedOrigin?: number;
  selectedSystems: string[];
  currentShipId?: number;
  autoLoadBuy: boolean;
  autoLoadSell: boolean;
}) {
  const router = useRouter();

  function selectOrigin(value: string) {
    const systemsPart = `?systems=${selectedSystems.join(",")}`;
    const shipPart = currentShipId !== undefined ? `&ship=${currentShipId}` : "";
    const autoLoadBuyPart = autoLoadBuy ? "&autoLoadBuy=1" : "";
    const autoLoadSellPart = autoLoadSell ? "&autoLoadSell=1" : "";
    const originPart = value !== "" ? `&origin=${value}` : "";
    router.push(`${systemsPart}${shipPart}${autoLoadBuyPart}${autoLoadSellPart}${originPart}`);
  }

  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm text-text-muted">Origin</span>
      <select
        value={selectedOrigin !== undefined ? String(selectedOrigin) : ""}
        onChange={(e: { target: { value: string } }) => selectOrigin(e.target.value)}
        className="rounded border border-border bg-bg-card text-sm text-text-muted px-3 py-1"
      >
        <option value="">All origins</option>
        {terminals.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
