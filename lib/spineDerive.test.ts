import { describe, it, expect } from "vitest";
import type { Item, Leg, Plan } from "@/lib/spineRepo";
import {
  carryState,
  avgUnitCost,
  planRealizedProfit,
  legProfit,
  unrealizedInventoryValue,
  currentPositionTerminalId,
  executedLegIds,
  lockedLegIds,
} from "@/lib/spineDerive";

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 1,
    planId: 1,
    legId: 101,
    idCommodity: 53,
    movement: "acquire",
    disposition: null,
    scu: 1,
    unitPrice: null,
    fee: null,
    idTerminal: null,
    occurredAt: new Date("2026-06-09T00:00:00Z"),
    note: null,
    ...overrides,
  };
}

function makeLeg(overrides: Partial<Leg> = {}): Leg {
  return {
    id: 101,
    planId: 1,
    seq: 1,
    idTerminalOrigin: 1,
    idTerminalDestination: 2,
    sourceActivity: "trade",
    idCommodity: 53,
    createdAt: new Date("2026-06-09T00:00:00Z"),
    updatedAt: new Date("2026-06-09T00:00:00Z"),
    ...overrides,
  };
}

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 1,
    tenantId: "operator",
    title: null,
    shipCapacityScu: 100,
    allowedSystems: ["Stanton"],
    startTerminalId: 10,
    status: "active",
    createdAt: new Date("2026-06-09T00:00:00Z"),
    updatedAt: new Date("2026-06-09T00:00:00Z"),
    ...overrides,
  };
}

// Canonical trip: commodity 53, leg 101 then 102, terminals 1 -> 2 -> 3.
const i1 = makeItem({
  id: 1,
  movement: "acquire",
  scu: 8,
  unitPrice: "2700",
  fee: "500",
  legId: 101,
  idTerminal: 1,
  occurredAt: new Date("2026-06-09T01:00:00Z"),
});
const i2 = makeItem({
  id: 2,
  movement: "dispose",
  disposition: "sale",
  scu: 6,
  unitPrice: "3200",
  fee: "0",
  legId: 101,
  idTerminal: 2,
  occurredAt: new Date("2026-06-09T02:00:00Z"),
});
const i3 = makeItem({
  id: 3,
  movement: "dispose",
  disposition: "sale",
  scu: 2,
  unitPrice: "3400",
  fee: "0",
  legId: 102,
  idTerminal: 3,
  occurredAt: new Date("2026-06-09T03:00:00Z"),
});

describe("carryState", () => {
  it("returns an empty map when the trip is fully disposed (8 - 6 - 2 = 0)", () => {
    const m = carryState([i1, i2, i3]);
    expect(m.size).toBe(0);
  });

  it("tracks net held mid-trip (8 - 6 = 2)", () => {
    const m = carryState([i1, i2]);
    expect(m.get(53)).toBe(2);
    expect(m.size).toBe(1);
  });

  it("does NOT clamp negatives when over-sold", () => {
    const acquire = makeItem({ id: 10, movement: "acquire", scu: 6, idCommodity: 53 });
    const dispose = makeItem({
      id: 11,
      movement: "dispose",
      disposition: "sale",
      scu: 8,
      idCommodity: 53,
    });
    const m = carryState([acquire, dispose]);
    expect(m.get(53)).toBe(-2);
  });
});

describe("avgUnitCost", () => {
  it("capitalizes the acquire fee into the basis ((8*2700 + 500) / 8)", () => {
    const m = avgUnitCost([i1]);
    expect(m.get(53)).toBe(2762.5);
  });

  it("weights across multiple buys", () => {
    const a = makeItem({ id: 20, movement: "acquire", scu: 4, unitPrice: "2700", fee: "0", idCommodity: 53 });
    const b = makeItem({ id: 21, movement: "acquire", scu: 4, unitPrice: "2800", fee: "0", idCommodity: 53 });
    const m = avgUnitCost([a, b]);
    expect(m.get(53)).toBe(2750);
  });

  it("omits commodities that were only disposed (no acquire)", () => {
    const m = avgUnitCost([i2]);
    expect(m.has(53)).toBe(false);
    expect(m.size).toBe(0);
  });
});

describe("planRealizedProfit", () => {
  it("returns 3900 for the full canonical trip", () => {
    expect(planRealizedProfit([i1, i2, i3])).toBe(3900);
  });

  it("returns 2625 mid-trip with 2 still held", () => {
    expect(planRealizedProfit([i1, i2])).toBe(2625);
  });

  it("realizes a loss disposition at cost basis (-2900)", () => {
    const loss = makeItem({
      id: 30,
      movement: "dispose",
      disposition: "loss",
      scu: 2,
      idCommodity: 53,
      unitPrice: null,
      fee: "0",
      legId: 102,
    });
    expect(planRealizedProfit([i1, i2, loss])).toBe(-2900);
  });

  it("throws on a dispose of a commodity with no acquisitions", () => {
    const orphan = makeItem({
      id: 40,
      movement: "dispose",
      disposition: "sale",
      scu: 1,
      idCommodity: 99,
    });
    expect(() => planRealizedProfit([orphan])).toThrow();
  });

  it("throws on a non-numeric unit price", () => {
    const bad = makeItem({ id: 41, movement: "acquire", scu: 8, unitPrice: "abc", idCommodity: 53 });
    expect(() => planRealizedProfit([bad])).toThrow();
  });
});

describe("legProfit", () => {
  it("returns 2625 for leg 101", () => {
    expect(legProfit([i1, i2, i3], 101)).toBe(2625);
  });

  it("returns 1275 for leg 102 using plan-wide avg cost", () => {
    expect(legProfit([i1, i2, i3], 102)).toBe(1275);
  });

  it("reconciles per-leg profits to the plan total", () => {
    const all = [i1, i2, i3];
    expect(legProfit(all, 101) + legProfit(all, 102)).toBe(planRealizedProfit(all));
    expect(planRealizedProfit(all)).toBe(3900);
  });
});

describe("unrealizedInventoryValue", () => {
  it("values held cargo at cost basis (2 * 2762.5)", () => {
    expect(unrealizedInventoryValue([i1, i2])).toBe(5525);
  });

  it("returns 0 when the hold is empty", () => {
    expect(unrealizedInventoryValue([i1, i2, i3])).toBe(0);
  });

  it("throws on negative carry", () => {
    const acquire = makeItem({ id: 50, movement: "acquire", scu: 6, idCommodity: 53 });
    const dispose = makeItem({
      id: 51,
      movement: "dispose",
      disposition: "sale",
      scu: 8,
      idCommodity: 53,
    });
    expect(() => unrealizedInventoryValue([acquire, dispose])).toThrow();
  });
});

describe("currentPositionTerminalId", () => {
  const plan = makePlan({ startTerminalId: 10 });

  it("returns the terminal of the latest item by occurredAt", () => {
    expect(currentPositionTerminalId(plan, [i1, i2, i3])).toBe(3);
  });

  it("falls back to the start terminal with no items", () => {
    expect(currentPositionTerminalId(plan, [])).toBe(10);
  });

  it("falls back to the start terminal when all items have a null terminal", () => {
    const a = makeItem({ id: 60, idTerminal: null });
    const b = makeItem({ id: 61, idTerminal: null });
    expect(currentPositionTerminalId(plan, [a, b])).toBe(10);
  });

  it("is order-independent", () => {
    expect(currentPositionTerminalId(plan, [i3, i1, i2])).toBe(3);
  });
});

describe("executedLegIds", () => {
  it("returns the sorted set of leg ids touched", () => {
    expect(executedLegIds([i1, i2, i3])).toEqual([101, 102]);
  });

  it("returns only the touched leg mid-trip", () => {
    expect(executedLegIds([i1, i2])).toEqual([101]);
  });

  it("excludes items with a null leg id", () => {
    const orphan = makeItem({ id: 70, legId: null });
    expect(executedLegIds([i1, i2, orphan])).toEqual([101]);
  });
});

describe("lockedLegIds", () => {
  const legA = makeLeg({ id: 101, idCommodity: 53 });
  const legB = makeLeg({ id: 102, idCommodity: 53 });

  it("locks legs whose commodity is still held", () => {
    expect(lockedLegIds([legA, legB], [i1, i2])).toEqual([101, 102]);
  });

  it("locks nothing once the hold is empty", () => {
    expect(lockedLegIds([legA, legB], [i1, i2, i3])).toEqual([]);
  });

  it("never locks a deadhead leg (null commodity)", () => {
    const deadhead = makeLeg({ id: 103, idCommodity: null });
    expect(lockedLegIds([legA, legB, deadhead], [i1, i2])).toEqual([101, 102]);
  });

  it("excludes a leg whose commodity is not held", () => {
    const other = makeLeg({ id: 103, idCommodity: 99 });
    expect(lockedLegIds([legA, legB, other], [i1, i2])).toEqual([101, 102]);
  });
});
