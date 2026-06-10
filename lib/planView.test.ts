import { describe, it, expect } from "vitest";
import type { Item, Leg, Plan } from "@/lib/spineRepo";
import { derivePlanView } from "@/lib/planView";

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

const legA = makeLeg({ id: 101, seq: 1, idCommodity: 53 });
const legB = makeLeg({ id: 102, seq: 2, idCommodity: 53 });

describe("derivePlanView — full canonical trip", () => {
  const r = derivePlanView(makePlan(), [legA, legB], [i1, i2, i3]);

  it("succeeds with no error", () => {
    expect(r.error).toBeNull();
    expect(r.view).not.toBeNull();
  });

  it("reports an empty hold once everything is sold", () => {
    expect(r.view!.carry).toEqual([]);
  });

  it("has zero unrealized inventory value", () => {
    expect(r.view!.unrealizedInventoryValue).toBe(0);
  });

  it("realizes the full plan profit (3900)", () => {
    expect(r.view!.planRealizedProfit).toBe(3900);
  });

  it("returns per-leg profits in the order legs are passed in", () => {
    expect(r.view!.legProfits).toEqual([
      { legId: 101, profit: 2625 },
      { legId: 102, profit: 1275 },
    ]);
  });

  it("positions at the latest terminal (3)", () => {
    expect(r.view!.currentPositionTerminalId).toBe(3);
  });

  it("lists the executed legs", () => {
    expect(r.view!.executedLegIds).toEqual([101, 102]);
  });

  it("locks nothing once the hold is empty", () => {
    expect(r.view!.lockedLegIds).toEqual([]);
  });
});

describe("derivePlanView — mid-trip, 2 SCU held", () => {
  const r = derivePlanView(makePlan(), [legA, legB], [i1, i2]);

  it("succeeds with no error", () => {
    expect(r.error).toBeNull();
    expect(r.view).not.toBeNull();
  });

  it("reports the 2 SCU still held", () => {
    expect(r.view!.carry).toEqual([{ idCommodity: 53, scu: 2 }]);
  });

  it("values the held cargo at cost basis (5525)", () => {
    expect(r.view!.unrealizedInventoryValue).toBe(5525);
  });

  it("realizes only the sold portion (2625)", () => {
    expect(r.view!.planRealizedProfit).toBe(2625);
  });

  it("attributes profit to the leg that sold and zero to the untouched leg", () => {
    expect(r.view!.legProfits).toEqual([
      { legId: 101, profit: 2625 },
      { legId: 102, profit: 0 },
    ]);
  });

  it("positions at the latest terminal (2)", () => {
    expect(r.view!.currentPositionTerminalId).toBe(2);
  });

  it("locks both legs carrying the held commodity", () => {
    expect(r.view!.lockedLegIds).toEqual([101, 102]);
  });
});

describe("derivePlanView — resilience (never throws)", () => {
  it("returns an error result on over-sell without throwing", () => {
    const oversellAcquire = makeItem({ id: 80, movement: "acquire", scu: 6, idCommodity: 53 });
    const oversellDispose = makeItem({
      id: 81,
      movement: "dispose",
      disposition: "sale",
      scu: 8,
      idCommodity: 53,
    });
    expect(() =>
      derivePlanView(makePlan(), [legA], [oversellAcquire, oversellDispose]),
    ).not.toThrow();
    const r = derivePlanView(makePlan(), [legA], [oversellAcquire, oversellDispose]);
    expect(r.view).toBeNull();
    expect(r.error).toBeTruthy();
    expect(typeof r.error).toBe("string");
  });

  it("returns an error result on a dispose with no acquisition without throwing", () => {
    const orphan = makeItem({
      id: 82,
      movement: "dispose",
      disposition: "sale",
      scu: 1,
      idCommodity: 99,
    });
    expect(() => derivePlanView(makePlan(), [legA], [orphan])).not.toThrow();
    const r = derivePlanView(makePlan(), [legA], [orphan]);
    expect(r.view).toBeNull();
    expect(r.error).toBeTruthy();
    expect(typeof r.error).toBe("string");
  });

  it("returns an error result on a non-numeric price without throwing", () => {
    const bad = makeItem({ id: 83, movement: "acquire", scu: 8, unitPrice: "abc", idCommodity: 53 });
    expect(() => derivePlanView(makePlan(), [legA], [bad])).not.toThrow();
    const r = derivePlanView(makePlan(), [legA], [bad]);
    expect(r.view).toBeNull();
    expect(r.error).toBeTruthy();
    expect(typeof r.error).toBe("string");
  });
});

describe("derivePlanView — empty plan", () => {
  const r = derivePlanView(makePlan({ startTerminalId: 10 }), [], []);

  it("succeeds with no error", () => {
    expect(r.error).toBeNull();
    expect(r.view).not.toBeNull();
  });

  it("returns empty/zero derived fields", () => {
    expect(r.view!.carry).toEqual([]);
    expect(r.view!.unrealizedInventoryValue).toBe(0);
    expect(r.view!.planRealizedProfit).toBe(0);
    expect(r.view!.legProfits).toEqual([]);
    expect(r.view!.executedLegIds).toEqual([]);
    expect(r.view!.lockedLegIds).toEqual([]);
  });

  it("falls back to the start terminal for position", () => {
    expect(r.view!.currentPositionTerminalId).toBe(10);
  });
});
