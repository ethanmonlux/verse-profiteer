"use client";

import { useRouter } from "next/navigation";
import SearchableSheet from "@/app/SearchableSheet";
import type { SheetOption } from "@/app/SearchableSheet";

type TerminalOption = {
  id: number;
  name: string;
  system: string | null;
  location: string | null;
};

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

  function selectOrigin(id: number | undefined) {
    const systemsPart = `?systems=${selectedSystems.join(",")}`;
    const shipPart = currentShipId !== undefined ? `&ship=${currentShipId}` : "";
    const autoLoadBuyPart = autoLoadBuy ? "&autoLoadBuy=1" : "";
    const autoLoadSellPart = autoLoadSell ? "&autoLoadSell=1" : "";
    const originPart = id !== undefined ? `&origin=${id}` : "";
    router.push(`${systemsPart}${shipPart}${autoLoadBuyPart}${autoLoadSellPart}${originPart}`);
  }

  const options: SheetOption[] = terminals.map((t) => {
    const parts = [t.system, t.location].filter((p): p is string => p !== null && p !== "");
    return {
      id: t.id,
      primary: t.name,
      secondary: parts.length > 0 ? parts.join(" · ") : undefined,
    };
  });

  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm text-text-muted">Origin</span>
      <SearchableSheet
        label="Origin"
        options={options}
        selectedId={selectedOrigin}
        placeholderPrimary="All origins"
        allOptionLabel="All origins"
        onSelect={selectOrigin}
      />
    </div>
  );
}
