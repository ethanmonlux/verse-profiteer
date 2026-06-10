import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CommodityRoute } from "@/lib/uex";

const getAllMirroredRoutes = vi.fn<() => Promise<CommodityRoute[]>>();

vi.mock("@/lib/routesRepo", () => ({
  getAllMirroredRoutes: () => getAllMirroredRoutes(),
}));

import { suggestNextLegs } from "@/lib/legSuggest";

function makeRoute(
  overrides: Partial<CommodityRoute> = {},
): CommodityRoute {
  return {
    id: 0,
    id_commodity: 0,
    origin_terminal_name: "Origin",
    destination_terminal_name: "Destination",
    id_terminal_origin: 1,
    id_terminal_destination: 2,
    price_margin: 0,
    price_origin: 0,
    price_destination: 0,
    price_roi: 0,
    profit: 0,
    investment: 0,
    distance: 0,
    scu_origin: 1,
    scu_destination: 1,
    scu_margin: 0,
    volatility_origin: 0,
    volatility_destination: 0,
    status_origin: 0,
    status_destination: 0,
    score: 0,
    date_added: 0,
    origin_star_system_name: "Stanton",
    destination_star_system_name: "Stanton",
    id_star_system_origin: 0,
    id_star_system_destination: 0,
    scu_reachable: 0,
    container_sizes_origin: "",
    container_sizes_destination: "",
    ...overrides,
  };
}

beforeEach(() => {
  getAllMirroredRoutes.mockReset();
});

describe("suggestNextLegs", () => {
  it("sorts results by realizableProfit descending", async () => {
    getAllMirroredRoutes.mockResolvedValue([
      makeRoute({ id_commodity: 1, profit: 100000, scu_origin: 50, scu_destination: 50 }),
      makeRoute({ id_commodity: 2, profit: 500000, scu_origin: 50, scu_destination: 50 }),
      makeRoute({ id_commodity: 3, profit: 300000, scu_origin: 50, scu_destination: 50 }),
    ]);

    const result = await suggestNextLegs({
      originTerminal: 1,
      shipCapacity: 696,
      allowedSystems: ["Stanton"],
    });

    expect(result.map((r) => r.realizableProfit)).toEqual([500000, 300000, 100000]);
  });

  it("excludes routes whose id_terminal_origin differs from originTerminal", async () => {
    getAllMirroredRoutes.mockResolvedValue([
      makeRoute({ id_commodity: 1, id_terminal_origin: 1, profit: 100000, scu_origin: 50, scu_destination: 50 }),
      makeRoute({ id_commodity: 2, id_terminal_origin: 99, profit: 999999, scu_origin: 50, scu_destination: 50 }),
    ]);

    const result = await suggestNextLegs({
      originTerminal: 1,
      shipCapacity: 696,
      allowedSystems: ["Stanton"],
    });

    expect(result).toHaveLength(1);
    expect(result[0].idCommodity).toBe(1);
  });

  it("excludes routes whose origin or destination system is outside allowedSystems", async () => {
    getAllMirroredRoutes.mockResolvedValue([
      makeRoute({ id_commodity: 1, origin_star_system_name: "Stanton", destination_star_system_name: "Stanton", profit: 100000, scu_origin: 50, scu_destination: 50 }),
      makeRoute({ id_commodity: 2, origin_star_system_name: "Pyro", destination_star_system_name: "Stanton", profit: 200000, scu_origin: 50, scu_destination: 50 }),
      makeRoute({ id_commodity: 3, origin_star_system_name: "Stanton", destination_star_system_name: "Pyro", profit: 300000, scu_origin: 50, scu_destination: 50 }),
    ]);

    const result = await suggestNextLegs({
      originTerminal: 1,
      shipCapacity: 696,
      allowedSystems: ["Stanton"],
    });

    expect(result).toHaveLength(1);
    expect(result[0].idCommodity).toBe(1);
  });

  it("excludes routes with a null origin or destination star_system_name", async () => {
    getAllMirroredRoutes.mockResolvedValue([
      makeRoute({ id_commodity: 1, origin_star_system_name: "Stanton", destination_star_system_name: "Stanton", profit: 100000, scu_origin: 50, scu_destination: 50 }),
      makeRoute({ id_commodity: 2, origin_star_system_name: null, destination_star_system_name: "Stanton", profit: 200000, scu_origin: 50, scu_destination: 50 }),
      makeRoute({ id_commodity: 3, origin_star_system_name: "Stanton", destination_star_system_name: null, profit: 300000, scu_origin: 50, scu_destination: 50 }),
    ]);

    const result = await suggestNextLegs({
      originTerminal: 1,
      shipCapacity: 696,
      allowedSystems: ["Stanton"],
    });

    expect(result).toHaveLength(1);
    expect(result[0].idCommodity).toBe(1);
  });

  it("caps the result count at limit", async () => {
    getAllMirroredRoutes.mockResolvedValue(
      Array.from({ length: 25 }, (_, i) =>
        makeRoute({ id_commodity: i, profit: (i + 1) * 1000, scu_origin: 50, scu_destination: 50 }),
      ),
    );

    const result = await suggestNextLegs({
      originTerminal: 1,
      shipCapacity: 696,
      allowedSystems: ["Stanton"],
      limit: 5,
    });

    expect(result).toHaveLength(5);
  });

  it("defaults limit to 10", async () => {
    getAllMirroredRoutes.mockResolvedValue(
      Array.from({ length: 25 }, (_, i) =>
        makeRoute({ id_commodity: i, profit: (i + 1) * 1000, scu_origin: 50, scu_destination: 50 }),
      ),
    );

    const result = await suggestNextLegs({
      originTerminal: 1,
      shipCapacity: 696,
      allowedSystems: ["Stanton"],
    });

    expect(result).toHaveLength(10);
  });

  it("haulableScu equals min(capacity, bottleneck)", async () => {
    getAllMirroredRoutes.mockResolvedValue([
      // bottleneck = min(200, 50) = 50; capacity 696 → haulable 50
      makeRoute({ id_commodity: 1, profit: 100000, scu_origin: 200, scu_destination: 50 }),
      // bottleneck = min(80, 80) = 80; capacity 30 → haulable 30
      makeRoute({ id_commodity: 2, profit: 90000, scu_origin: 80, scu_destination: 80 }),
    ]);

    const result = await suggestNextLegs({
      originTerminal: 1,
      shipCapacity: 30,
      allowedSystems: ["Stanton"],
    });

    const byCommodity = Object.fromEntries(result.map((r) => [r.idCommodity, r]));
    expect(byCommodity[1].bottleneckScu).toBe(50);
    expect(byCommodity[1].haulableScu).toBe(30); // min(30, 50)
    expect(byCommodity[2].bottleneckScu).toBe(80);
    expect(byCommodity[2].haulableScu).toBe(30); // min(30, 80)
  });

  it("computes aUecPerHrHint but ranks by realizableProfit, not aUEC/hr", async () => {
    // routeA: higher realizable profit, but long distance → lower aUEC/hr.
    // routeB: lower realizable profit, but ~zero distance → much higher aUEC/hr.
    // realizable-profit ordering must win: routeA (id 1) ranks first.
    getAllMirroredRoutes.mockResolvedValue([
      makeRoute({ id_commodity: 1, profit: 1000000, scu_origin: 696, scu_destination: 696, distance: 2000 }),
      makeRoute({ id_commodity: 2, profit: 500000, scu_origin: 696, scu_destination: 696, distance: 0 }),
    ]);

    const result = await suggestNextLegs({
      originTerminal: 1,
      shipCapacity: 696,
      allowedSystems: ["Stanton"],
    });

    expect(result[0].idCommodity).toBe(1);
    expect(result[0].realizableProfit).toBeGreaterThan(result[1].realizableProfit);
    // The lower-profit route has the higher aUEC/hr hint, confirming the hint
    // did not drive the ordering.
    expect(result[1].aUecPerHrHint).toBeGreaterThan(result[0].aUecPerHrHint);
  });
});
