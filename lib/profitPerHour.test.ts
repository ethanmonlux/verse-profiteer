import { describe, it, expect } from "vitest";
import type { CommodityRoute } from "@/lib/uex";
import { profitPerHour } from "@/lib/profitPerHour";
import { estimateTravelMinutes } from "@/lib/travelTime";
import { realizableProfit } from "@/lib/realizableProfit";

function makeRoute(
  overrides: {
    profit?: number;
    scu_origin?: number;
    scu_destination?: number;
    distance?: number;
  } = {}
): CommodityRoute {
  return {
    id: 0,
    id_commodity: 0,
    origin_terminal_name: null,
    destination_terminal_name: null,
    id_terminal_origin: 0,
    id_terminal_destination: 0,
    price_margin: 0,
    price_roi: 0,
    profit: overrides.profit ?? 600000,
    investment: 0,
    distance: overrides.distance ?? 100,
    scu_origin: overrides.scu_origin ?? 67,
    scu_destination: overrides.scu_destination ?? 67,
    scu_margin: 0,
    volatility_origin: 0,
    volatility_destination: 0,
    status_origin: 0,
    status_destination: 0,
    score: 0,
    date_added: 0,
  };
}

describe("profitPerHour", () => {
  it("consistency: equals Math.round(realizableProfit / (estimateTravelMinutes / 60))", () => {
    // Values from the E'tam verification run (id 29, 121 Gm, 67 SCU).
    const route = makeRoute({ profit: 609097, scu_origin: 67, scu_destination: 67, distance: 121 });
    const capacity = 30;
    const expected = Math.round(
      realizableProfit(route, capacity) / (estimateTravelMinutes(route) / 60)
    );
    expect(profitPerHour(route, capacity)).toBe(expected);
  });

  it("recompute on distance: longer route has lower per-hour (same profit, more time)", () => {
    // Only distance differs — confirms the time term flows through the live constants.
    const base = { profit: 609097, scu_origin: 67, scu_destination: 67 };
    const shortRoute = makeRoute({ ...base, distance: 50 });
    const longRoute = makeRoute({ ...base, distance: 500 });
    const capacity = 696;
    expect(profitPerHour(longRoute, capacity)).toBeLessThan(profitPerHour(shortRoute, capacity));
  });

  it("capacity scales per-hour: higher capacity yields higher per-hour when capacity binds", () => {
    // Bottleneck is 100 SCU; both test capacities (10, 50) are below it, so
    // capacity binds and a larger capacity raises realizableProfit while time is unchanged.
    const route = makeRoute({ profit: 1000000, scu_origin: 100, scu_destination: 100, distance: 100 });
    expect(profitPerHour(route, 50)).toBeGreaterThan(profitPerHour(route, 10));
  });

  it("scu_origin 0: does not throw and returns 0", () => {
    // profitPerScu guards the divide-by-zero, so realizableProfit returns 0, and so does profitPerHour.
    const route = makeRoute({ profit: 100000, scu_origin: 0, scu_destination: 67, distance: 100 });
    expect(() => profitPerHour(route, 100)).not.toThrow();
    expect(profitPerHour(route, 100)).toBe(0);
  });

  it("zero-time guard: result is finite and >= 0 for a normal route", () => {
    // SPOOL_CALIBRATE_MIN (0.5) and TERMINAL_OVERHEAD_MIN (5) are both non-zero seed constants,
    // so estimateTravelMinutes always returns > 0 — the zero-time branch in profitPerHour is a
    // defensive invariant, not reachable under current constants. Confirm the reachable path
    // stays well-behaved rather than forcing an artificially zero-time scenario.
    const route = makeRoute({ profit: 609097, scu_origin: 67, scu_destination: 67, distance: 121 });
    const result = profitPerHour(route, 696);
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("result is always an integer for a normal route", () => {
    const route = makeRoute({ profit: 609097, scu_origin: 67, scu_destination: 67, distance: 121 });
    expect(Number.isInteger(profitPerHour(route, 30))).toBe(true);
    expect(Number.isInteger(profitPerHour(route, 696))).toBe(true);
  });
});
