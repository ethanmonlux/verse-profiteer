// Pure bundler of the spine derive-on-read layer into one view; never throws —
// on any derive error it returns { view: null, error } so the caller can still
// serve the raw rows.
import {
  carryState,
  planRealizedProfit,
  legProfit,
  unrealizedInventoryValue,
  currentPositionTerminalId,
  executedLegIds,
  lockedLegIds,
} from "@/lib/spineDerive";
import type { Plan, Leg, Item } from "@/lib/spineRepo";

export interface PlanDerivedView {
  carry: { idCommodity: number; scu: number }[]; // current hold, nonzero entries, sorted by idCommodity asc
  unrealizedInventoryValue: number;
  planRealizedProfit: number;
  legProfits: { legId: number; profit: number }[]; // one per leg, in the order legs are passed in (seq asc)
  currentPositionTerminalId: number | null;
  executedLegIds: number[];
  lockedLegIds: number[];
}

export interface PlanViewResult {
  view: PlanDerivedView | null;
  error: string | null;
}

export function derivePlanView(
  plan: Plan,
  legs: Leg[],
  items: Item[],
): PlanViewResult {
  try {
    const carryMap = carryState(items);
    const carry = [...carryMap.entries()]
      .map(([idCommodity, scu]) => ({ idCommodity, scu }))
      .sort((a, b) => a.idCommodity - b.idCommodity);

    const view: PlanDerivedView = {
      carry,
      unrealizedInventoryValue: unrealizedInventoryValue(items),
      planRealizedProfit: planRealizedProfit(items),
      legProfits: legs.map((l) => ({ legId: l.id, profit: legProfit(items, l.id) })),
      currentPositionTerminalId: currentPositionTerminalId(plan, items),
      executedLegIds: executedLegIds(items),
      lockedLegIds: lockedLegIds(legs, items),
    };
    return { view, error: null };
  } catch (e) {
    // All-or-nothing — a ledger corrupt enough to throw anywhere should be
    // fixed, not partially rendered; the caller still has the raw rows to act on.
    return { view: null, error: e instanceof Error ? e.message : String(e) };
  }
}
