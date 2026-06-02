"use client";

import { useRouter } from "next/navigation";

const ALL_SYSTEMS = ["Stanton", "Pyro", "Nyx"] as const;

export default function SystemsPicker({
  selectedSystems,
  currentShipId,
}: {
  selectedSystems: string[];
  currentShipId?: number;
}) {
  const router = useRouter();

  function toggleSystem(system: string) {
    const next = selectedSystems.includes(system)
      ? selectedSystems.filter((s) => s !== system)
      : [...selectedSystems, system];
    if (next.length === 0) return;
    const shipPart = currentShipId !== undefined ? `&ship=${currentShipId}` : "";
    router.push(`?systems=${next.join(",")}${shipPart}`);
  }

  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm text-text-muted">Systems</span>
      {ALL_SYSTEMS.map((system) => {
        const isActive = selectedSystems.includes(system);
        return (
          <button
            key={system}
            onClick={() => toggleSystem(system)}
            className={`rounded border px-3 py-1 text-sm transition-colors ${
              isActive
                ? "border-accent text-accent"
                : "border-border text-text-muted hover:border-accent hover:text-accent"
            }`}
          >
            {system}
          </button>
        );
      })}
    </div>
  );
}
