"use client";

import { useRouter } from "next/navigation";
import type { Vehicle } from "@/lib/uex";
import SearchableSheet, { type SheetOption } from "@/app/SearchableSheet";

export default function ShipPicker({
  vehicles,
  selectedShipId,
  currentSystems,
  autoLoadBuy,
  autoLoadSell,
  selectedOrigin,
}: {
  vehicles: Vehicle[];
  selectedShipId?: number;
  currentSystems: string[];
  autoLoadBuy: boolean;
  autoLoadSell: boolean;
  selectedOrigin?: number;
}) {
  const router = useRouter();

  // Dedicated cargo ships only; is_ground_vehicle guard excludes any cargo-flagged ground vehicle. Intentionally cuts token-cargo fighters (e.g. 100i) — this is a trading tool.
  const cargoShips = vehicles
    .filter((v) => v.is_cargo === 1 && v.is_ground_vehicle === 0)
    .sort((a, b) => b.scu - a.scu || a.name.localeCompare(b.name));

  const maxScu = cargoShips[0]?.scu ?? 1;

  const shipOptions: SheetOption[] = cargoShips.map((v) => ({
    id: v.id,
    primary: v.name,
    value: v.scu,
    barPct: Math.round((v.scu / maxScu) * 100),
  }));

  function selectShip(id: number) {
    const autoLoadBuyPart = autoLoadBuy ? "&autoLoadBuy=1" : "";
    const autoLoadSellPart = autoLoadSell ? "&autoLoadSell=1" : "";
    const originPart = selectedOrigin !== undefined ? `&origin=${selectedOrigin}` : "";
    router.push(`?ship=${id}&systems=${currentSystems.join(",")}${autoLoadBuyPart}${autoLoadSellPart}${originPart}`);
  }

  function handleSelect(id: number | undefined) {
    if (id === undefined) {
      const autoLoadBuyPart = autoLoadBuy ? "&autoLoadBuy=1" : "";
      const autoLoadSellPart = autoLoadSell ? "&autoLoadSell=1" : "";
      const originPart = selectedOrigin !== undefined ? `&origin=${selectedOrigin}` : "";
      router.push(`?systems=${currentSystems.join(",")}${autoLoadBuyPart}${autoLoadSellPart}${originPart}`);
      return;
    }
    selectShip(id);
  }

  return (
    <div className="mb-6">
      <SearchableSheet
        label="Ship"
        options={shipOptions}
        selectedId={selectedShipId}
        placeholderPrimary="Select a ship"
        allOptionLabel="No ship selected"
        onSelect={handleSelect}
      />
    </div>
  );
}
