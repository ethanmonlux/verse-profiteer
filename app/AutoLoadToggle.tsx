"use client";

import { useRouter } from "next/navigation";

export default function AutoLoadToggle({
  autoLoadRequired,
  selectedSystems,
  currentShipId,
}: {
  autoLoadRequired: boolean;
  selectedSystems: string[];
  currentShipId?: number;
}) {
  const router = useRouter();

  function toggle() {
    const systemsPart = `systems=${selectedSystems.join(",")}`;
    const shipPart = currentShipId !== undefined ? `&ship=${currentShipId}` : "";
    const autoLoadPart = autoLoadRequired ? "" : "&autoLoad=1";
    router.push(`?${systemsPart}${shipPart}${autoLoadPart}`);
  }

  return (
    <div className="flex items-center gap-2 mb-4">
      <button
        onClick={toggle}
        className={`rounded border px-3 py-1 text-sm transition-colors ${
          autoLoadRequired
            ? "border-accent text-accent"
            : "border-border text-text-muted hover:border-accent hover:text-accent"
        }`}
      >
        Auto-load required
      </button>
    </div>
  );
}
