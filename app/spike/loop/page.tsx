// SPIKE — throwaway UX probe for the multi-leg loop plan view. NOT the real
// cargo-ledger spine. Hardcoded fake data, single-commodity legs only. Safe
// to delete wholesale. Do not build the spine on these types.

type SpikeAction = { verb: "load" | "sell"; commodity: string; scu: number; pricePerScu: number };
type SpikeLeg = { carrying: string; distanceGm: number; estMinutes: number; priceAgeLabel: string; stale: boolean };
type SpikeStop = {
  terminal: string;
  role: "start" | "mid" | "end";
  actions: SpikeAction[];
  legProfit: number | null;
  legToNext: SpikeLeg | null;
};
type SpikeLoop = {
  title: string;
  ship: string;
  shipScu: number;
  stops: SpikeStop[];
  roundTripProfit: number;
  totalMinutes: number;
  totalGm: number;
  aUECPerHour: number;
};

const loop: SpikeLoop = {
  title: "Stanton Triangle Loop",
  ship: "Caterpillar",
  shipScu: 576,
  roundTripProfit: 412_800,
  totalMinutes: 47,
  totalGm: 84,
  aUECPerHour: 526_978,
  stops: [
    {
      terminal: "Area 18 TDD",
      role: "start",
      actions: [{ verb: "load", commodity: "Laranite", scu: 576, pricePerScu: 2_710 }],
      legProfit: null,
      legToNext: {
        carrying: "Laranite",
        distanceGm: 38,
        estMinutes: 19,
        priceAgeLabel: "prices seen 2h ago",
        stale: false,
      },
    },
    {
      terminal: "Port Tressler",
      role: "mid",
      actions: [
        { verb: "sell", commodity: "Laranite", scu: 576, pricePerScu: 3_040 },
        { verb: "load", commodity: "Aluminum", scu: 576, pricePerScu: 122 },
      ],
      legProfit: 190_080,
      legToNext: {
        carrying: "Aluminum",
        distanceGm: 27,
        estMinutes: 15,
        priceAgeLabel: "prices seen 4d ago",
        stale: true,
      },
    },
    {
      terminal: "CRU-L1 Ambitious Dream Station",
      role: "mid",
      actions: [
        { verb: "sell", commodity: "Aluminum", scu: 576, pricePerScu: 165 },
        { verb: "load", commodity: "Agricium", scu: 576, pricePerScu: 2_290 },
      ],
      legProfit: 24_768,
      legToNext: {
        carrying: "Agricium",
        distanceGm: 19,
        estMinutes: 13,
        priceAgeLabel: "prices seen 5h ago",
        stale: false,
      },
    },
    {
      terminal: "Area 18 TDD",
      role: "end",
      actions: [{ verb: "sell", commodity: "Agricium", scu: 576, pricePerScu: 2_630 }],
      legProfit: 195_840,
      legToNext: null,
    },
  ],
};

export default function SpikeLoopPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-semibold text-accent">{loop.title}</h1>
          <span className="text-sm text-text-muted tabular-nums">
            {loop.ship} · {loop.shipScu.toLocaleString()} SCU
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-2xl font-bold text-profit tabular-nums">
            +{loop.roundTripProfit.toLocaleString()}
          </span>
          <span className="text-xs text-text-muted">round trip</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {loop.stops.map((stop, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-accent">{stop.terminal}</span>
                  {stop.role === "start" && (
                    <span className="rounded border border-border px-1.5 py-0.5 text-xs text-text-muted">
                      start
                    </span>
                  )}
                  {stop.role === "end" && (
                    <span className="rounded border border-border px-1.5 py-0.5 text-xs text-text-muted">
                      end
                    </span>
                  )}
                </div>
                {stop.legProfit !== null && (
                  <span className="rounded border border-border px-1.5 py-0.5 text-xs text-profit tabular-nums">
                    +{stop.legProfit.toLocaleString()} leg
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-col gap-1">
                {stop.actions.map((action, j) =>
                  action.verb === "sell" ? (
                    <span key={j} className="text-sm text-text-muted tabular-nums">
                      sell {action.commodity} · {action.pricePerScu.toLocaleString()}/SCU
                    </span>
                  ) : (
                    <span key={j} className="text-sm text-profit tabular-nums">
                      load {action.scu.toLocaleString()} SCU {action.commodity} ·{" "}
                      {action.pricePerScu.toLocaleString()}/SCU
                    </span>
                  ),
                )}
              </div>
            </div>

            {stop.legToNext !== null && (
              <div className="px-4 text-xs text-text-muted tabular-nums">
                carrying {stop.legToNext.carrying} · {stop.legToNext.distanceGm.toLocaleString()} Gm · ~
                {stop.legToNext.estMinutes.toLocaleString()} min ·{" "}
                <span className={stop.legToNext.stale ? "text-warning" : "text-text-muted"}>
                  {stop.legToNext.priceAgeLabel}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-text-muted tabular-nums">
        <span>
          {(loop.stops.length - 1).toLocaleString()} legs · ~{loop.totalMinutes.toLocaleString()} min ·{" "}
          {loop.totalGm.toLocaleString()} Gm
        </span>
        <span>~{loop.aUECPerHour.toLocaleString()} aUEC/hr</span>
      </div>
    </div>
  );
}
