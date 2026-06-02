"use client";

import { useRouter } from "next/navigation";
import type { Vehicle } from "@/lib/uex";

export default function ShipPicker({
  vehicles,
  selectedShipId,
  currentSystems,
}: {
  vehicles: Vehicle[];
  selectedShipId?: number;
  currentSystems: string[];
}) {
  const router = useRouter();

  const cargoShips = vehicles
    .filter((v) => v.scu > 0)
    .sort((a, b) => b.scu - a.scu || a.name.localeCompare(b.name));

  const maxScu = cargoShips[0]?.scu ?? 1;

  function selectShip(id: number) {
    router.push(`?ship=${id}&systems=${currentSystems.join(",")}`);
  }

  return (
    <div className="mb-6">
      {selectedShipId === undefined && (
        <p className="text-sm text-text-muted mb-3">Select a ship to see runnable routes</p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {cargoShips.map((vehicle) => {
          const isSelected = vehicle.id === selectedShipId;
          const barPct = Math.round((vehicle.scu / maxScu) * 100);
          return (
            <button
              key={vehicle.id}
              onClick={() => selectShip(vehicle.id)}
              className={`rounded border p-3 text-left transition-colors ${
                isSelected
                  ? "border-accent bg-bg-card"
                  : "border-border bg-bg-card hover:border-accent"
              }`}
            >
              <div className="flex justify-between items-baseline gap-1 mb-2">
                <span
                  className={`text-sm font-medium leading-tight ${isSelected ? "text-accent" : ""}`}
                >
                  {vehicle.name}
                </span>
                <span className="text-base font-bold tabular-nums text-accent shrink-0">
                  {vehicle.scu}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${barPct}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-text-muted">SCU</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
