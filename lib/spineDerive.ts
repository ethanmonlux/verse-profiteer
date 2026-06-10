// Pure derive-on-read layer for the spine; given rows, computes carry-state /
// profit / position / locks; nothing is persisted (Spine Rule); cost basis is
// plan-wide weighted-average with acquire fees capitalized.
import type { Plan, Leg, Item } from "@/lib/spineRepo";

// null prices/fees are legitimately 0 (mined acquire, dumped/lost dispose, no
// fee). A non-null string that won't parse is corrupt data — throw rather than
// fabricate a 0 into a profit figure.
function toNum(v: string | null): number {
  if (v === null) return 0;
  const n = Number(v);
  if (Number.isNaN(n)) {
    throw new Error(`spineDerive: non-numeric value "${v}" cannot be parsed`);
  }
  return n;
}

// Realized profit for a single dispose d of commodity c, given the avg-cost map.
function realizedForDispose(d: Item, map: Map<number, number>): number {
  const avg = map.get(d.idCommodity);
  if (avg === undefined) {
    throw new Error(
      `spineDerive: dispose of commodity ${d.idCommodity} with no acquisitions`,
    );
  }
  const proceeds =
    d.disposition === "sale" ? d.scu * toNum(d.unitPrice) : 0; // dump/loss yield 0 proceeds
  const cogs = d.scu * avg; // cost basis leaves inventory on ANY dispose
  const feeOut = toNum(d.fee); // dispose-side fee, expensed
  return proceeds - cogs - feeOut;
}

export function carryState(items: Item[]): Map<number, number> {
  const net = new Map<number, number>();
  for (const it of items) {
    const cur = net.get(it.idCommodity) ?? 0;
    if (it.movement === "acquire") {
      net.set(it.idCommodity, cur + it.scu);
    } else if (it.movement === "dispose") {
      net.set(it.idCommodity, cur - it.scu);
    }
  }
  // Drop zero-net entries; do NOT clamp negatives — a negative net means more
  // sold than bought (corrupt) and must surface.
  const out = new Map<number, number>();
  for (const [c, v] of net) {
    if (v !== 0) out.set(c, v);
  }
  return out;
}

export function avgUnitCost(items: Item[]): Map<number, number> {
  const num = new Map<number, number>();
  const den = new Map<number, number>();
  for (const it of items) {
    if (it.movement !== "acquire") continue; // disposes contribute nothing here
    const n = it.scu * toNum(it.unitPrice) + toNum(it.fee); // acquire fees capitalized (fee treatment A)
    num.set(it.idCommodity, (num.get(it.idCommodity) ?? 0) + n);
    den.set(it.idCommodity, (den.get(it.idCommodity) ?? 0) + it.scu);
  }
  const out = new Map<number, number>();
  for (const [c, d] of den) {
    if (d > 0) out.set(c, (num.get(c) ?? 0) / d);
  }
  return out;
}

export function planRealizedProfit(items: Item[]): number {
  const map = avgUnitCost(items);
  let total = 0;
  for (const d of items) {
    if (d.movement === "dispose") total += realizedForDispose(d, map);
  }
  return total;
}

export function legProfit(planItems: Item[], legId: number): number {
  const map = avgUnitCost(planItems); // basis is PLAN-WIDE, not leg-local
  let total = 0;
  for (const d of planItems) {
    if (d.movement === "dispose" && d.legId === legId) {
      total += realizedForDispose(d, map);
    }
  }
  return total;
}

export function unrealizedInventoryValue(items: Item[]): number {
  const carry = carryState(items);
  const avg = avgUnitCost(items);
  let total = 0;
  for (const [c, net] of carry) {
    if (net < 0) {
      throw new Error(`spineDerive: negative carry for commodity ${c}`);
    }
    if (net > 0) {
      const a = avg.get(c);
      if (a === undefined) {
        throw new Error(
          `spineDerive: held commodity ${c} with no acquisition cost basis`,
        );
      }
      total += net * a; // cost basis of cargo still in the hold — unrealized
    }
  }
  return total;
}

export function currentPositionTerminalId(
  plan: Plan,
  items: Item[],
): number | null {
  let best: Item | null = null;
  for (const it of items) {
    if (it.idTerminal === null) continue; // null terminal never moves position
    if (best === null || it.occurredAt.getTime() >= best.occurredAt.getTime()) {
      best = it; // on a tie, the later array element wins
    }
  }
  return best === null ? plan.startTerminalId : best.idTerminal;
}

export function executedLegIds(items: Item[]): number[] {
  const ids = new Set<number>();
  for (const it of items) {
    if (it.legId !== null) ids.add(it.legId);
  }
  return [...ids].sort((a, b) => a - b);
}

export function lockedLegIds(legs: Leg[], items: Item[]): number[] {
  const held = new Set<number>();
  for (const [c, net] of carryState(items)) {
    if (net > 0) held.add(c);
  }
  const ids = new Set<number>();
  for (const leg of legs) {
    if (leg.idCommodity !== null && held.has(leg.idCommodity)) {
      ids.add(leg.id);
    }
  }
  return [...ids].sort((a, b) => a - b);
}
