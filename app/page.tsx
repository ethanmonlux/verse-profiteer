import { getTopRoutes } from "@/lib/routes";
import { getVehicles, getTerminals } from "@/lib/uex";
import { getDistinctOriginTerminalIds } from "@/lib/routesRepo";
import DebugPrices from "@/app/DebugPrices";
import DebugQt from "@/app/DebugQt";
import DebugTerminals from "@/app/DebugTerminals";
import Board from "@/app/Board";
import ShipPicker from "@/app/ShipPicker";
import SystemsPicker from "@/app/SystemsPicker";
import AutoLoadToggle from "@/app/AutoLoadToggle";
import OriginPicker from "@/app/OriginPicker";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const shipParam = typeof params.ship === "string" ? params.ship : undefined;
  const systemsParam = typeof params.systems === "string" ? params.systems : undefined;
  const originParam = typeof params.origin === "string" ? params.origin : undefined;
  const originTerminal =
    originParam && Number.isFinite(Number(originParam))
      ? Number(originParam)
      : undefined;
  const autoLoadBuy = params.autoLoadBuy === "1";
  const autoLoadSell = params.autoLoadSell === "1";

  const [vehicles, terminals] = await Promise.all([getVehicles(), getTerminals()]);
  const allowedSystems = systemsParam
    ? systemsParam.split(",").filter((s) => s.length > 0)
    : ["Stanton"];

  const originIds = new Set(await getDistinctOriginTerminalIds());

  const originTerminals = terminals
    .filter(
      (t) =>
        t.star_system_name !== null &&
        allowedSystems.includes(t.star_system_name) &&
        originIds.has(t.id)
    )
    .map((t) => ({ id: t.id, name: t.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const shipId = shipParam !== undefined ? parseInt(shipParam, 10) : NaN;
  const selectedVehicle =
    !isNaN(shipId) ? vehicles.find((v) => v.id === shipId) : undefined;

  const groups =
    selectedVehicle !== undefined
      ? await getTopRoutes({ allowedSystems, shipCapacity: selectedVehicle.scu, autoLoadBuy, autoLoadSell, originTerminal })
      : null;

  return (
    <main className="min-h-screen px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-accent mb-1">Verse Profiteer</h1>
      <p className="text-sm text-text-muted mb-6">
        Top cargo trades · best routes per commodity
      </p>
      <DebugPrices />
      <DebugQt />
      <DebugTerminals />
      <SystemsPicker
        selectedSystems={allowedSystems}
        currentShipId={selectedVehicle?.id}
        autoLoadBuy={autoLoadBuy}
        autoLoadSell={autoLoadSell}
        selectedOrigin={originTerminal}
      />
      <OriginPicker
        terminals={originTerminals}
        selectedOrigin={originTerminal}
        selectedSystems={allowedSystems}
        currentShipId={selectedVehicle?.id}
        autoLoadBuy={autoLoadBuy}
        autoLoadSell={autoLoadSell}
      />
      <AutoLoadToggle
        autoLoadBuy={autoLoadBuy}
        autoLoadSell={autoLoadSell}
        selectedSystems={allowedSystems}
        currentShipId={selectedVehicle?.id}
        selectedOrigin={originTerminal}
      />
      <ShipPicker
        vehicles={vehicles}
        selectedShipId={selectedVehicle?.id}
        currentSystems={allowedSystems}
        autoLoadBuy={autoLoadBuy}
        autoLoadSell={autoLoadSell}
        selectedOrigin={originTerminal}
      />
      {groups !== null && selectedVehicle !== undefined && (
        <Board groups={groups} capacity={selectedVehicle.scu} />
      )}
    </main>
  );
}
