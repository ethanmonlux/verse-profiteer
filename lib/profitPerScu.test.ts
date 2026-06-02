import { describe, it, expect } from "vitest";
import type { CommodityRoute } from "@/lib/uex";
import { profitPerScu } from "@/lib/profitPerScu";

function makeRoute(overrides: { profit?: number; scu_origin?: number } = {}): CommodityRoute {
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
    scu_destination: 0,
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
  };
}

describe("profitPerScu", () => {
  it("returns 9091 for profit 609097 and scu_origin 67", () => {
    expect(profitPerScu(makeRoute({ profit: 609097, scu_origin: 67 }))).toBe(9091);
  });

  it("returns 6705 for profit 147510 and scu_origin 22 (confirms scu_origin basis)", () => {
    expect(profitPerScu(makeRoute({ profit: 147510, scu_origin: 22 }))).toBe(6705);
  });

  it("returns 0 when scu_origin is 0", () => {
    expect(profitPerScu(makeRoute({ profit: 100000, scu_origin: 0 }))).toBe(0);
  });

  it("returns 0 when scu_origin is NaN", () => {
    expect(profitPerScu(makeRoute({ profit: 100000, scu_origin: NaN }))).toBe(0);
  });

  it("result is an integer for a normal route", () => {
    expect(Number.isInteger(profitPerScu(makeRoute({ profit: 609097, scu_origin: 67 })))).toBe(true);
  });
});
