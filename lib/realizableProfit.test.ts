import { describe, it, expect } from "vitest";
import type { CommodityRoute } from "@/lib/uex";
import { realizableProfit, routeBottleneck } from "@/lib/realizableProfit";

function makeRoute(
  overrides: { profit?: number; scu_origin?: number; scu_destination?: number } = {}
): CommodityRoute {
  return {
    id: 0,
    id_commodity: 0,
    origin_terminal_name: null,
    destination_terminal_name: null,
    id_terminal_origin: 0,
    id_terminal_destination: 0,
    price_margin: 0,
    price_origin: 0,
    price_destination: 0,
    price_roi: 0,
    profit: overrides.profit ?? 0,
    investment: 0,
    distance: 0,
    scu_origin: overrides.scu_origin ?? 1,
    scu_destination: overrides.scu_destination ?? 1,
    scu_margin: 0,
    volatility_origin: 0,
    volatility_destination: 0,
    status_origin: 0,
    status_destination: 0,
    score: 0,
    date_added: 0,
    origin_star_system_name: null,
    destination_star_system_name: null,
    id_star_system_origin: 0,
    id_star_system_destination: 0,
    scu_reachable: 0,
    container_sizes_origin: "",
    container_sizes_destination: "",
    has_freight_elevator_origin: 0,
  };
}

describe("realizableProfit", () => {
  it("ship larger than bottleneck: realizable equals total profit (within rounding)", () => {
    const route = makeRoute({ profit: 609097, scu_origin: 67, scu_destination: 67 });
    const result = realizableProfit(route, 696);
    expect(Math.abs(result - route.profit)).toBeLessThanOrEqual(1);
  });

  it("ship smaller than bottleneck: realizable is less than total profit", () => {
    const route = makeRoute({ profit: 609097, scu_origin: 67, scu_destination: 67 });
    // pps = round(609097/67) = 9091; haulable = 30; realizable = round(9091 × 30) = 272730
    expect(realizableProfit(route, 30)).toBe(272730);
    expect(realizableProfit(route, 30)).toBeLessThan(route.profit);
  });

  it("SAFETY INVARIANT: realizable is never greater than total profit across a range of capacities", () => {
    const route = makeRoute({ profit: 609097, scu_origin: 67, scu_destination: 67 });
    for (const capacity of [1, 30, 67, 200, 696]) {
      expect(realizableProfit(route, capacity)).toBeLessThanOrEqual(route.profit);
    }
  });

  it("destination binds: haulable uses scu_destination when it is smallest", () => {
    const route = makeRoute({ profit: 609097, scu_origin: 200, scu_destination: 50 });
    // pps = round(609097/200) = 3045; haulable = min(696,200,50) = 50; realizable = round(3045 × 50) = 152250
    expect(realizableProfit(route, 696)).toBe(152250);
  });

  it("capacity 0 falls back to bottleneck: realizable equals profit when origin equals destination", () => {
    const route = makeRoute({ profit: 609097, scu_origin: 67, scu_destination: 67 });
    expect(Math.abs(realizableProfit(route, 0) - route.profit)).toBeLessThanOrEqual(1);
  });

  it("capacity NaN falls back to bottleneck: realizable equals profit when origin equals destination", () => {
    const route = makeRoute({ profit: 609097, scu_origin: 67, scu_destination: 67 });
    expect(Math.abs(realizableProfit(route, NaN) - route.profit)).toBeLessThanOrEqual(1);
  });

  it("scu_origin 0: does not throw and returns 0", () => {
    const route = makeRoute({ profit: 100000, scu_origin: 0, scu_destination: 67 });
    expect(() => realizableProfit(route, 100)).not.toThrow();
    expect(realizableProfit(route, 100)).toBe(0);
  });
});

describe("routeBottleneck", () => {
  it("returns min when origin equals destination: (67, 67) → 67", () => {
    expect(routeBottleneck(makeRoute({ scu_origin: 67, scu_destination: 67 }))).toBe(67);
  });

  it("returns destination when it is smaller: (200, 50) → 50", () => {
    expect(routeBottleneck(makeRoute({ scu_origin: 200, scu_destination: 50 }))).toBe(50);
  });

  it("returns origin when it is smaller: (22, 205) → 22", () => {
    expect(routeBottleneck(makeRoute({ scu_origin: 22, scu_destination: 205 }))).toBe(22);
  });
});
