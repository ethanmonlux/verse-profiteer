"use client";

import { useEffect, useState } from "react";
import SearchableSheet, { type SheetOption } from "@/app/SearchableSheet";

// Local JSON shapes for the API responses. NOT imported from spineRepo: JSON
// numerics (Postgres numeric) come back as strings and the Drizzle row types
// would mistype them.
type PlanJson = {
  id: number;
  title: string | null;
  shipCapacityScu: number;
  allowedSystems: string[];
  startTerminalId: number | null;
  status: string;
};
type LegJson = {
  id: number;
  seq: number;
  idTerminalOrigin: number;
  idTerminalDestination: number;
  idCommodity: number | null;
  sourceActivity: string;
};
type ItemJson = {
  id: number;
  legId: number | null;
  idCommodity: number;
  movement: string;
  disposition: string | null;
  scu: number;
  unitPrice: string | null;
  fee: string | null;
  idTerminal: number | null;
};
type CarryLine = { idCommodity: number; scu: number };
type DerivedView = {
  carry: CarryLine[];
  unrealizedInventoryValue: number;
  planRealizedProfit: number;
  legProfits: { legId: number; profit: number }[];
  currentPositionTerminalId: number | null;
  executedLegIds: number[];
  lockedLegIds: number[];
};
type AggregateJson = {
  plan: PlanJson;
  legs: LegJson[];
  items: ItemJson[];
  derived: DerivedView | null;
  derivedError: string | null;
};
type SuggestionJson = {
  idCommodity: number;
  idTerminalOrigin: number;
  idTerminalDestination: number;
  originTerminalName: string | null;
  destinationTerminalName: string | null;
  realizableProfit: number;
  bottleneckScu: number;
  haulableScu: number;
  estimateMinutes: number;
  aUecPerHrHint: number;
};
type SuggestResponse = {
  originTerminalId: number | null;
  heldCargo: { idCommodity: number; scu: number }[];
  suggestions: SuggestionJson[];
  blockedReason: string | null;
};

const inputClass =
  "w-full bg-bg-card border border-border rounded text-sm px-3 py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent";
const buttonClass =
  "w-full rounded border border-border bg-bg-card text-accent text-sm px-3 py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent";
const panelClass = "bg-bg-card border border-border rounded-lg p-4";
const rowClass = "border border-border rounded px-3 py-2 text-sm";
const fmtAuec = (n: number) => `${Math.round(n).toLocaleString("en-US")} aUEC`;
const profitClass = (n: number) => (n < 0 ? "text-loss" : "text-profit");

export default function PlanComposer({
  terminalOptions,
  commodityOptions,
}: {
  terminalOptions: SheetOption[];
  commodityOptions: SheetOption[];
}) {
  // id -> primary lookup maps for rendering names instead of bare ids. A name
  // as a label is not a derived number — expected and fine.
  const terminalNames = new Map(terminalOptions.map((o) => [o.id, o.primary]));
  const commodityNames = new Map(commodityOptions.map((o) => [o.id, o.primary]));
  const terminalName = (id: number) => terminalNames.get(id) ?? `#${id}`;
  const commodityName = (id: number) => commodityNames.get(id) ?? `#${id}`;

  const [plansList, setPlansList] = useState<PlanJson[]>([]);
  const [active, setActive] = useState<AggregateJson | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Suggest-next-leg panel state. suggestData is the last response (or null
  // before first fetch); suggestLoading toggles around the GET.
  const [suggestData, setSuggestData] = useState<SuggestResponse | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);

  // Plan form fields. Systems fixed to ["Stanton"] for now — no picker.
  const [planTitle, setPlanTitle] = useState("");
  const [planShipScu, setPlanShipScu] = useState("");
  const [planStartTerminal, setPlanStartTerminal] = useState<number | undefined>(
    undefined,
  );

  // Leg form fields.
  const [legOrigin, setLegOrigin] = useState<number | undefined>(undefined);
  const [legDest, setLegDest] = useState<number | undefined>(undefined);
  const [legCommodity, setLegCommodity] = useState<number | undefined>(undefined);
  const [legActivity, setLegActivity] = useState("trade");

  // Item form fields.
  const [itemLegId, setItemLegId] = useState<string>(""); // "" = (no leg)
  const [itemCommodity, setItemCommodity] = useState<number | undefined>(
    undefined,
  );
  const [itemMovement, setItemMovement] = useState("acquire");
  const [itemDisposition, setItemDisposition] = useState("sale");
  const [itemScu, setItemScu] = useState("");
  const [itemUnitPrice, setItemUnitPrice] = useState("");
  const [itemFee, setItemFee] = useState("");
  const [itemTerminal, setItemTerminal] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetch("/api/plans")
      .then((res) => res.json())
      .then((data) => setPlansList(data))
      .catch(() => setError("failed to load plans"));
  }, []);

  async function refreshList() {
    const res = await fetch("/api/plans");
    if (res.ok) setPlansList(await res.json());
  }

  async function refreshActive(id: number) {
    const res = await fetch(`/api/plans/${id}`);
    if (res.ok) {
      setActive(await res.json());
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "failed to load plan");
    }
  }

  // POST helper: on !ok, surface the JSON { error } and return null; on ok,
  // clear error and return the parsed row.
  async function postJson<T>(url: string, body: unknown): Promise<T | null> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "request failed");
      return null;
    }
    setError(null);
    return (await res.json()) as T;
  }

  // GET the next-leg suggestions for a plan. On !ok, surface the error and
  // leave suggestData null; ranking/derivation all happens server-side.
  async function fetchSuggestions(planId: number) {
    setSuggestLoading(true);
    try {
      const res = await fetch(`/api/plans/${planId}/suggestions`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "failed to load suggestions");
        setSuggestData(null);
        return;
      }
      setError(null);
      setSuggestData((await res.json()) as SuggestResponse);
    } finally {
      setSuggestLoading(false);
    }
  }

  // Accept a suggestion: write it as a leg through the existing legs endpoint,
  // then refresh the plan view and re-pull suggestions to reflect new state.
  async function acceptSuggestion(s: SuggestionJson) {
    if (active === null) return;
    const leg = await postJson<LegJson>(`/api/plans/${active.plan.id}/legs`, {
      idTerminalOrigin: s.idTerminalOrigin,
      idTerminalDestination: s.idTerminalDestination,
      idCommodity: s.idCommodity,
      sourceActivity: "trade",
    });
    if (leg === null) return;
    await refreshActive(active.plan.id);
    await fetchSuggestions(active.plan.id);
  }

  async function submitPlan(e: React.FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = {
      shipCapacityScu: Number(planShipScu),
      allowedSystems: ["Stanton"],
    };
    if (planTitle.trim() !== "") body.title = planTitle.trim();
    if (planStartTerminal !== undefined) body.startTerminalId = planStartTerminal;

    const plan = await postJson<PlanJson>("/api/plans", body);
    if (plan === null) return;
    setPlanTitle("");
    setPlanShipScu("");
    setPlanStartTerminal(undefined);
    await refreshList();
    await refreshActive(plan.id);
  }

  async function submitLeg(e: React.FormEvent) {
    e.preventDefault();
    if (active === null) return;
    if (legOrigin === undefined || legDest === undefined) {
      setError("origin and destination terminals are required");
      return;
    }
    const body: Record<string, unknown> = {
      idTerminalOrigin: legOrigin,
      idTerminalDestination: legDest,
      sourceActivity: legActivity,
    };
    if (legCommodity !== undefined) body.idCommodity = legCommodity;

    const leg = await postJson<LegJson>(
      `/api/plans/${active.plan.id}/legs`,
      body,
    );
    if (leg === null) return;
    setLegOrigin(undefined);
    setLegDest(undefined);
    setLegCommodity(undefined);
    setLegActivity("trade");
    await refreshActive(active.plan.id);
  }

  async function submitItem(e: React.FormEvent) {
    e.preventDefault();
    if (active === null) return;
    if (itemCommodity === undefined) {
      setError("commodity is required");
      return;
    }
    const body: Record<string, unknown> = {
      idCommodity: itemCommodity,
      movement: itemMovement,
      scu: Number(itemScu),
    };
    if (itemLegId !== "") body.legId = Number(itemLegId);
    if (itemMovement === "dispose") body.disposition = itemDisposition;
    if (itemUnitPrice.trim() !== "") body.unitPrice = itemUnitPrice.trim();
    if (itemFee.trim() !== "") body.fee = itemFee.trim();
    if (itemTerminal !== undefined) body.idTerminal = itemTerminal;

    const item = await postJson<ItemJson>(
      `/api/plans/${active.plan.id}/items`,
      body,
    );
    if (item === null) return;
    setItemLegId("");
    setItemCommodity(undefined);
    setItemMovement("acquire");
    setItemDisposition("sale");
    setItemScu("");
    setItemUnitPrice("");
    setItemFee("");
    setItemTerminal(undefined);
    await refreshActive(active.plan.id);
  }

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      {error !== null && (
        <div className="border border-warning text-warning rounded px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {/* PLANS */}
      <section className={panelClass}>
        <h2 className="text-lg font-semibold mb-3">Plans</h2>
        <form onSubmit={submitPlan} className="flex flex-col gap-3 mb-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-muted">Title (optional)</span>
            <input
              type="text"
              value={planTitle}
              onChange={(e) => setPlanTitle(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-muted">Ship capacity (SCU)</span>
            <input
              type="number"
              required
              value={planShipScu}
              onChange={(e) => setPlanShipScu(e.target.value)}
              className={inputClass}
            />
          </label>
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-text-muted">Start terminal (optional)</span>
            <SearchableSheet
              label="Start terminal"
              options={terminalOptions}
              selectedId={planStartTerminal}
              placeholderPrimary="Choose terminal"
              allOptionLabel="None"
              onSelect={setPlanStartTerminal}
            />
          </div>
          <button type="submit" className={buttonClass}>
            Create plan
          </button>
        </form>

        <ul className="flex flex-col gap-2">
          {plansList.map((p) => {
            const isActive = active?.plan.id === p.id;
            return (
              <li
                key={p.id}
                className={`flex items-center justify-between gap-2 rounded px-3 py-2 text-sm border ${
                  isActive ? "border-accent" : "border-border"
                }`}
              >
                <div className="flex flex-col">
                  <span>{p.title ?? "(untitled)"}</span>
                  <span className="text-xs text-text-muted">
                    {p.status} · {p.shipCapacityScu} SCU
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => refreshActive(p.id)}
                  className="rounded border border-border text-accent text-xs px-2 py-1 shrink-0"
                >
                  Load
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* STATUS (derived) */}
      {active !== null && (
        <section className={panelClass}>
          <h2 className="text-lg font-semibold mb-3">Status</h2>
          {active.derivedError !== null ? (
            <p className="border border-warning text-warning rounded px-3 py-2 text-sm">
              Can&apos;t compute totals: {active.derivedError}. Raw rows are still
              shown below — fix the flagged entry.
            </p>
          ) : active.derived !== null ? (
            <div className="flex flex-col gap-2 text-sm">
              <div>
                <span className="text-text-muted">Position: </span>
                {active.derived.currentPositionTerminalId === null
                  ? "—"
                  : terminalName(active.derived.currentPositionTerminalId)}
              </div>
              <div>
                <span className="text-text-muted">Realized profit: </span>
                <span className={profitClass(active.derived.planRealizedProfit)}>
                  {fmtAuec(active.derived.planRealizedProfit)}
                </span>
              </div>
              <div>
                <span className="text-text-muted">Unrealized (held at cost): </span>
                {fmtAuec(active.derived.unrealizedInventoryValue)}
              </div>
              <div>
                <span className="text-text-muted">In hold: </span>
                {active.derived.carry.length === 0
                  ? "empty"
                  : active.derived.carry
                      .map((c) => `${c.scu} ${commodityName(c.idCommodity)}`)
                      .join(", ")}
              </div>
            </div>
          ) : null}
        </section>
      )}

      {/* SUGGEST NEXT LEG */}
      {active !== null && (
        <section className={panelClass}>
          <h2 className="text-lg font-semibold mb-3">Suggest next leg</h2>
          <button
            type="button"
            onClick={() => fetchSuggestions(active.plan.id)}
            disabled={suggestLoading}
            className={`${buttonClass} mb-4`}
          >
            {suggestData !== null ? "Refresh suggestions" : "Suggest next leg"}
          </button>

          {suggestData === null && !suggestLoading ? (
            <p className="text-sm text-text-muted">
              Tap to get suggestions from your current position.
            </p>
          ) : null}

          {suggestData !== null && suggestData.blockedReason !== null ? (
            <div className="flex flex-col gap-1 text-sm">
              <p className="text-text-muted">{suggestData.blockedReason}</p>
              {suggestData.heldCargo.length > 0 ? (
                <p className="text-text-muted">
                  In hold:{" "}
                  {suggestData.heldCargo
                    .map((c) => `${c.scu} ${commodityName(c.idCommodity)}`)
                    .join(", ")}
                </p>
              ) : null}
            </div>
          ) : null}

          {suggestData !== null && suggestData.blockedReason === null ? (
            <ul className="flex flex-col gap-2">
              {suggestData.suggestions.map((s) => (
                <li
                  key={`${s.idCommodity}-${s.idTerminalDestination}`}
                  className={`${rowClass} flex flex-col gap-1`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      {commodityName(s.idCommodity)} →{" "}
                      {terminalName(s.idTerminalDestination)}
                    </span>
                    <span className={profitClass(s.realizableProfit)}>
                      {fmtAuec(s.realizableProfit)}
                    </span>
                  </div>
                  <div className="text-text-muted">~{s.haulableScu} SCU</div>
                  <div className="text-xs text-text-muted">
                    est ~{Math.round(s.estimateMinutes)} min · ~
                    {Math.round(s.aUecPerHrHint).toLocaleString("en-US")} aUEC/hr
                    (uncalibrated — ranking is by realizable profit, not this
                    rate)
                  </div>
                  <button
                    type="button"
                    onClick={() => acceptSuggestion(s)}
                    className="self-start rounded border border-border text-accent text-xs px-2 py-1 shrink-0"
                  >
                    Add leg
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      )}

      {/* LEGS */}
      {active !== null && (
        <section className={panelClass}>
          <h2 className="text-lg font-semibold mb-3">
            Legs · {active.plan.title ?? "(untitled)"}
          </h2>
          <form onSubmit={submitLeg} className="flex flex-col gap-3 mb-4">
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-text-muted">Origin terminal</span>
              <SearchableSheet
                label="Origin terminal"
                options={terminalOptions}
                selectedId={legOrigin}
                placeholderPrimary="Choose origin"
                allOptionLabel="None"
                onSelect={setLegOrigin}
              />
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-text-muted">Destination terminal</span>
              <SearchableSheet
                label="Destination terminal"
                options={terminalOptions}
                selectedId={legDest}
                placeholderPrimary="Choose destination"
                allOptionLabel="None"
                onSelect={setLegDest}
              />
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-text-muted">Commodity (optional)</span>
              <SearchableSheet
                label="Commodity"
                options={commodityOptions}
                selectedId={legCommodity}
                placeholderPrimary="Choose commodity"
                allOptionLabel="None (deadhead)"
                onSelect={setLegCommodity}
              />
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-text-muted">Source activity</span>
              <select
                value={legActivity}
                onChange={(e) => setLegActivity(e.target.value)}
                className={inputClass}
              >
                <option value="trade">trade</option>
                <option value="mining">mining</option>
                <option value="salvage">salvage</option>
                <option value="refining">refining</option>
              </select>
            </label>
            <button type="submit" className={buttonClass}>
              Add leg
            </button>
          </form>

          <ul className="flex flex-col gap-2">
            {active.legs.map((leg) => {
              const lp = active.derived?.legProfits.find(
                (p) => p.legId === leg.id,
              );
              const locked =
                active.derived?.lockedLegIds.includes(leg.id) ?? false;
              const flown =
                active.derived?.executedLegIds.includes(leg.id) ?? false;
              return (
                <li
                  key={leg.id}
                  className={`${rowClass}${flown ? " opacity-60" : ""}`}
                >
                  <span className="text-text-muted">#{leg.seq}</span>{" "}
                  {terminalName(leg.idTerminalOrigin)} →{" "}
                  {terminalName(leg.idTerminalDestination)} ·{" "}
                  {leg.idCommodity === null
                    ? "deadhead"
                    : commodityName(leg.idCommodity)}{" "}
                  · {leg.sourceActivity}
                  {locked ? (
                    <span className="ml-2 text-warning">[LOCKED]</span>
                  ) : null}
                  {lp ? (
                    <span className={`ml-2 ${profitClass(lp.profit)}`}>
                      {fmtAuec(lp.profit)}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ITEMS */}
      {active !== null && (
        <section className={panelClass}>
          <h2 className="text-lg font-semibold mb-3">Items (ledger)</h2>
          <form onSubmit={submitItem} className="flex flex-col gap-3 mb-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-text-muted">Leg</span>
              <select
                value={itemLegId}
                onChange={(e) => setItemLegId(e.target.value)}
                className={inputClass}
              >
                <option value="">(no leg)</option>
                {active.legs.map((leg) => (
                  <option key={leg.id} value={leg.id}>
                    seq {leg.seq}: {terminalName(leg.idTerminalOrigin)}→
                    {terminalName(leg.idTerminalDestination)}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-text-muted">Commodity</span>
              <SearchableSheet
                label="Commodity"
                options={commodityOptions}
                selectedId={itemCommodity}
                placeholderPrimary="Choose commodity"
                allOptionLabel="None"
                onSelect={setItemCommodity}
              />
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-text-muted">Movement</span>
              <select
                value={itemMovement}
                onChange={(e) => setItemMovement(e.target.value)}
                className={inputClass}
              >
                <option value="acquire">acquire</option>
                <option value="dispose">dispose</option>
              </select>
            </label>
            {itemMovement === "dispose" && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-text-muted">Disposition</span>
                <select
                  value={itemDisposition}
                  onChange={(e) => setItemDisposition(e.target.value)}
                  className={inputClass}
                >
                  <option value="sale">sale</option>
                  <option value="dump">dump</option>
                  <option value="loss">loss</option>
                </select>
              </label>
            )}
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-text-muted">SCU</span>
              <input
                type="number"
                required
                value={itemScu}
                onChange={(e) => setItemScu(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-text-muted">Unit price (optional)</span>
              <input
                type="text"
                value={itemUnitPrice}
                onChange={(e) => setItemUnitPrice(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-text-muted">Fee (optional)</span>
              <input
                type="text"
                value={itemFee}
                onChange={(e) => setItemFee(e.target.value)}
                className={inputClass}
              />
            </label>
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-text-muted">Terminal (optional)</span>
              <SearchableSheet
                label="Terminal"
                options={terminalOptions}
                selectedId={itemTerminal}
                placeholderPrimary="Choose terminal"
                allOptionLabel="None"
                onSelect={setItemTerminal}
              />
            </div>
            <button type="submit" className={buttonClass}>
              Log item
            </button>
          </form>

          <ul className="flex flex-col gap-2">
            {active.items.map((item) => (
              <li key={item.id} className={rowClass}>
                {item.movement}
                {item.disposition !== null ? ` (${item.disposition})` : ""} ·{" "}
                {item.scu} {commodityName(item.idCommodity)} @{" "}
                {item.unitPrice ?? "—"}
                {item.fee !== null ? ` · fee ${item.fee}` : ""}
                {item.idTerminal !== null
                  ? ` · ${terminalName(item.idTerminal)}`
                  : ""}
                {item.legId !== null
                  ? ` · leg ${
                      active.legs.find((l) => l.id === item.legId)?.seq ??
                      `#${item.legId}`
                    }`
                  : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
