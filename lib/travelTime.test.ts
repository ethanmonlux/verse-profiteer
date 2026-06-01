import { describe, it, expect } from "vitest";
import type { CommodityRoute } from "@/lib/uex";
import {
  estimateTravelMinutes,
  estimateTravelRange,
  QT_SPEED_GM_PER_MIN,
  SPOOL_CALIBRATE_MIN,
  TERMINAL_OVERHEAD_MIN,
  LOAD_UNLOAD_MIN_PER_SCU,
  ESTIMATE_BAND_PCT,
} from "@/lib/travelTime";

function makeRoute(overrides: { distance?: number; scu_origin?: number } = {}): CommodityRoute {
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
    profit: 0,
    investment: 0,
    distance: overrides.distance ?? 0,
    scu_origin: overrides.scu_origin ?? 0,
    scu_destination: 0,
    scu_margin: 0,
    volatility_origin: 0,
    volatility_destination: 0,
    status_origin: 0,
    status_destination: 0,
    score: 0,
    date_added: 0,
  };
}

describe("estimateTravelMinutes", () => {
  it("returns the correct point estimate for a known distance and scu_origin", () => {
    const distance = 100;
    const scu_origin = 200;
    const route = makeRoute({ distance, scu_origin });
    const expected =
      SPOOL_CALIBRATE_MIN +
      distance / QT_SPEED_GM_PER_MIN +
      TERMINAL_OVERHEAD_MIN +
      LOAD_UNLOAD_MIN_PER_SCU * scu_origin;
    expect(estimateTravelMinutes(route)).toBeCloseTo(expected);
  });

  it("returns SPOOL_CALIBRATE_MIN + TERMINAL_OVERHEAD_MIN when distance and scu_origin are 0", () => {
    const route = makeRoute({ distance: 0, scu_origin: 0 });
    expect(estimateTravelMinutes(route)).toBeCloseTo(SPOOL_CALIBRATE_MIN + TERMINAL_OVERHEAD_MIN);
  });

  it("is monotonic in distance", () => {
    const low = makeRoute({ distance: 10, scu_origin: 0 });
    const high = makeRoute({ distance: 20, scu_origin: 0 });
    expect(estimateTravelMinutes(high)).toBeGreaterThan(estimateTravelMinutes(low));
  });

  it("is monotonic in scu_origin", () => {
    const low = makeRoute({ distance: 10, scu_origin: 0 });
    const high = makeRoute({ distance: 10, scu_origin: 100 });
    expect(estimateTravelMinutes(high)).toBeGreaterThan(estimateTravelMinutes(low));
  });
});

describe("estimateTravelRange", () => {
  it("min is less than the point estimate and max is greater", () => {
    const route = makeRoute({ distance: 100, scu_origin: 200 });
    const point = estimateTravelMinutes(route);
    const { min, max } = estimateTravelRange(route);
    expect(min).toBeLessThan(point);
    expect(max).toBeGreaterThan(point);
  });

  it("min and max match the expected band formula", () => {
    const route = makeRoute({ distance: 100, scu_origin: 200 });
    const point = estimateTravelMinutes(route);
    const { min, max } = estimateTravelRange(route);
    expect(min).toBe(Math.round(point * (1 - ESTIMATE_BAND_PCT)));
    expect(max).toBe(Math.round(point * (1 + ESTIMATE_BAND_PCT)));
  });

  it("min and max are integers", () => {
    const route = makeRoute({ distance: 100, scu_origin: 200 });
    const { min, max } = estimateTravelRange(route);
    expect(Number.isInteger(min)).toBe(true);
    expect(Number.isInteger(max)).toBe(true);
  });
});
