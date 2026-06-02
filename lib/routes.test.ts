import { describe, it, expect, vi, beforeEach } from "vitest";
import { shortlistCommodities, getTopRoutes } from "@/lib/routes";
import type { CommodityPriceRecord, CommodityRoute } from "@/lib/uex";

vi.mock("@/lib/uex", () => ({
  getCommodityPricesAll: vi.fn(),
  getCommodityRoutes: vi.fn(),
}));

function rec(
  overrides: Pick<CommodityPriceRecord, "id_commodity" | "price_buy" | "price_sell">
): CommodityPriceRecord {
  return {
    id: 0,
    id_commodity: overrides.id_commodity,
    id_terminal: 0,
    commodity_name: "",
    terminal_name: "",
    price_buy: overrides.price_buy,
    price_sell: overrides.price_sell,
    price_buy_avg: 0,
    price_sell_avg: 0,
    scu_buy: 0,
    scu_sell: 0,
    scu_buy_avg: 0,
    scu_sell_avg: 0,
    scu_sell_stock: 0,
    scu_sell_stock_avg: 0,
    status_buy: 0,
    status_sell: 0,
    quality: 0,
    container_sizes: "",
    date_modified: 0,
    date_added: 0,
  };
}

describe("shortlistCommodities", () => {
  // Case 1: commodities are ranked by margin (max_sell - min_buy) descending
  it("ranks commodities by margin descending", () => {
    const records = [
      // Commodity 1: margin = 150 - 100 = 50
      rec({ id_commodity: 1, price_buy: 100, price_sell: 0 }),
      rec({ id_commodity: 1, price_buy: 0, price_sell: 150 }),
      // Commodity 2: margin = 250 - 50 = 200
      rec({ id_commodity: 2, price_buy: 50, price_sell: 0 }),
      rec({ id_commodity: 2, price_buy: 0, price_sell: 250 }),
      // Commodity 3: margin = 100 - 90 = 10
      rec({ id_commodity: 3, price_buy: 90, price_sell: 0 }),
      rec({ id_commodity: 3, price_buy: 0, price_sell: 100 }),
    ];
    const result = shortlistCommodities(records, 10);
    expect(result).toEqual([2, 1, 3]);
  });

  // Case 2: returns at most n id_commodity values
  it("returns at most n results", () => {
    const records = [
      rec({ id_commodity: 1, price_buy: 100, price_sell: 0 }),
      rec({ id_commodity: 1, price_buy: 0, price_sell: 200 }),
      rec({ id_commodity: 2, price_buy: 50, price_sell: 0 }),
      rec({ id_commodity: 2, price_buy: 0, price_sell: 300 }),
      rec({ id_commodity: 3, price_buy: 80, price_sell: 0 }),
      rec({ id_commodity: 3, price_buy: 0, price_sell: 120 }),
    ];
    const result = shortlistCommodities(records, 2);
    expect(result).toHaveLength(2);
  });

  // Case 3: uses max price_sell and min price_buy across multiple terminals per commodity
  it("picks max price_sell and min price_buy when multiple terminals exist", () => {
    // Commodity 1 has three terminals. Best buy = 80, best sell = 300. Margin = 220.
    // Commodity 2 has one pair. Margin = 500 - 400 = 100.
    const records = [
      rec({ id_commodity: 1, price_buy: 100, price_sell: 0 }),
      rec({ id_commodity: 1, price_buy: 80, price_sell: 200 }),
      rec({ id_commodity: 1, price_buy: 0, price_sell: 300 }),
      rec({ id_commodity: 2, price_buy: 400, price_sell: 0 }),
      rec({ id_commodity: 2, price_buy: 0, price_sell: 500 }),
    ];
    const result = shortlistCommodities(records, 10);
    // Commodity 1 margin 220 > commodity 2 margin 100
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(2);
  });

  // Case 4: excludes commodities with no valid buy (all price_buy <= 0)
  it("excludes commodities where all price_buy values are <= 0", () => {
    const records = [
      rec({ id_commodity: 1, price_buy: 0, price_sell: 200 }),
      rec({ id_commodity: 1, price_buy: 0, price_sell: 300 }),
      // Commodity 2 has a valid buy
      rec({ id_commodity: 2, price_buy: 50, price_sell: 0 }),
      rec({ id_commodity: 2, price_buy: 0, price_sell: 150 }),
    ];
    const result = shortlistCommodities(records, 10);
    expect(result).not.toContain(1);
    expect(result).toContain(2);
  });

  // Case 5: excludes commodities with no valid sell (all price_sell <= 0)
  it("excludes commodities where all price_sell values are <= 0", () => {
    const records = [
      rec({ id_commodity: 1, price_buy: 100, price_sell: 0 }),
      rec({ id_commodity: 1, price_buy: 50, price_sell: 0 }),
      // Commodity 2 has a valid sell
      rec({ id_commodity: 2, price_buy: 60, price_sell: 0 }),
      rec({ id_commodity: 2, price_buy: 0, price_sell: 180 }),
    ];
    const result = shortlistCommodities(records, 10);
    expect(result).not.toContain(1);
    expect(result).toContain(2);
  });

  // Case 6: ignores price_buy <= 0 and price_sell <= 0 cells when computing margin
  it("ignores zero-price cells and uses only valid prices for margin", () => {
    // Commodity 1: the zero buy/sell records must be skipped.
    // Valid buy = 120, valid sell = 400. Margin = 280.
    // Commodity 2: margin = 200 - 100 = 100.
    const records = [
      rec({ id_commodity: 1, price_buy: 0, price_sell: 400 }),   // buy=0 ignored for buy-side
      rec({ id_commodity: 1, price_buy: 120, price_sell: 0 }),   // sell=0 ignored for sell-side
      rec({ id_commodity: 2, price_buy: 100, price_sell: 0 }),
      rec({ id_commodity: 2, price_buy: 0, price_sell: 200 }),
    ];
    const result = shortlistCommodities(records, 10);
    // Commodity 1 margin 280 > commodity 2 margin 100
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(2);
  });

  // Case 7: return values are id_commodity numbers, not route or terminal objects
  it("returns an array of id_commodity numbers", () => {
    const records = [
      rec({ id_commodity: 42, price_buy: 10, price_sell: 0 }),
      rec({ id_commodity: 42, price_buy: 0, price_sell: 20 }),
    ];
    const result = shortlistCommodities(records, 10);
    expect(result).toEqual([42]);
    expect(typeof result[0]).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// getTopRoutes — mocked UEX layer
// ---------------------------------------------------------------------------

import { getCommodityPricesAll, getCommodityRoutes } from "@/lib/uex";

const mockGetPrices = getCommodityPricesAll as ReturnType<typeof vi.fn>;
const mockGetRoutes = getCommodityRoutes as ReturnType<typeof vi.fn>;

function priceRec(
  id_commodity: number,
  commodity_name: string,
  price_buy: number,
  price_sell: number
): CommodityPriceRecord {
  return {
    id: 0,
    id_commodity,
    id_terminal: 0,
    commodity_name,
    terminal_name: "",
    price_buy,
    price_sell,
    price_buy_avg: 0,
    price_sell_avg: 0,
    scu_buy: 0,
    scu_sell: 0,
    scu_buy_avg: 0,
    scu_sell_avg: 0,
    scu_sell_stock: 0,
    scu_sell_stock_avg: 0,
    status_buy: 0,
    status_sell: 0,
    quality: 0,
    container_sizes: "",
    date_modified: 0,
    date_added: 0,
  };
}

function route(id: number, id_commodity: number, profit: number): CommodityRoute {
  return {
    id,
    id_commodity,
    origin_terminal_name: `Origin-${id}`,
    destination_terminal_name: `Dest-${id}`,
    id_terminal_origin: 0,
    id_terminal_destination: 0,
    price_margin: 0,
    price_origin: 0,
    price_destination: 0,
    price_roi: 0,
    profit,
    investment: 0,
    distance: 1,
    scu_origin: 100,
    scu_destination: 100,
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
    scu_reachable: 100,
    container_sizes_origin: "1",
    container_sizes_destination: "1",
  };
}

// Two commodities with valid buy/sell so both are shortlisted.
const basePrices: CommodityPriceRecord[] = [
  priceRec(1, "Agricium", 100, 0),
  priceRec(1, "Agricium", 0, 300),
  priceRec(2, "Laranite", 50, 0),
  priceRec(2, "Laranite", 0, 200),
];

// Default opts: wide system allowlist + generous capacity so realizable profit
// is supply-bounded and ordering matches raw-profit expectations.
const OPTS_ALL = { allowedSystems: ["Stanton", "Pyro", "Nyx"], shipCapacity: 100000 };

describe("getTopRoutes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns one group per commodity with no duplicates", async () => {
    mockGetPrices.mockResolvedValue(basePrices);
    mockGetRoutes.mockImplementation((id: number) =>
      Promise.resolve(id === 1 ? [route(101, 1, 500)] : [route(201, 2, 300)])
    );

    const groups = await getTopRoutes(OPTS_ALL);
    const ids = groups.map((g) => g.id_commodity);
    expect(ids).toHaveLength(new Set(ids).size);
    expect(ids).toContain(1);
    expect(ids).toContain(2);
  });

  it("sorts each group's routes by profit descending and caps at 3", async () => {
    mockGetPrices.mockResolvedValue(basePrices);
    // Commodity 1 gets 4 routes in arbitrary order; expect top-3 sorted desc.
    mockGetRoutes.mockImplementation((id: number) =>
      Promise.resolve(
        id === 1
          ? [route(101, 1, 200), route(102, 1, 500), route(103, 1, 100), route(104, 1, 400)]
          : [route(201, 2, 50)]
      )
    );

    const groups = await getTopRoutes(OPTS_ALL);
    const g1 = groups.find((g) => g.id_commodity === 1)!;
    expect(g1.routes).toHaveLength(3);
    expect(g1.routes[0].profit).toBe(500);
    expect(g1.routes[1].profit).toBe(400);
    expect(g1.routes[2].profit).toBe(200);
  });

  it("sorts groups by best route profit descending", async () => {
    mockGetPrices.mockResolvedValue(basePrices);
    // Commodity 2 has a better best route than commodity 1.
    mockGetRoutes.mockImplementation((id: number) =>
      Promise.resolve(
        id === 1 ? [route(101, 1, 300)] : [route(201, 2, 700)]
      )
    );

    const groups = await getTopRoutes(OPTS_ALL);
    expect(groups[0].id_commodity).toBe(2);
    expect(groups[1].id_commodity).toBe(1);
  });

  it("caps output at 10 groups", async () => {
    // Build 12 commodities, each with a valid buy/sell so they all shortlist.
    const manyPrices: CommodityPriceRecord[] = [];
    for (let i = 1; i <= 12; i++) {
      manyPrices.push(priceRec(i, `Commodity ${i}`, 100, 0));
      manyPrices.push(priceRec(i, `Commodity ${i}`, 0, 200));
    }
    mockGetPrices.mockResolvedValue(manyPrices);
    mockGetRoutes.mockImplementation((id: number) =>
      Promise.resolve([route(id * 100, id, id * 10)])
    );

    const groups = await getTopRoutes(OPTS_ALL);
    expect(groups.length).toBeLessThanOrEqual(10);
  });

  it("populates commodityName from prices feed", async () => {
    mockGetPrices.mockResolvedValue(basePrices);
    mockGetRoutes.mockImplementation((id: number) =>
      Promise.resolve([route(id * 100, id, 100)])
    );

    const groups = await getTopRoutes(OPTS_ALL);
    const g1 = groups.find((g) => g.id_commodity === 1)!;
    expect(g1.commodityName).toBe("Agricium");
    const g2 = groups.find((g) => g.id_commodity === 2)!;
    expect(g2.commodityName).toBe("Laranite");
  });

  it("falls back to `Commodity ${id}` when commodity_name is absent", async () => {
    // Price records for id 3 have no commodity_name.
    const prices = [
      priceRec(3, "", 100, 0),
      priceRec(3, "", 0, 250),
    ];
    mockGetPrices.mockResolvedValue(prices);
    mockGetRoutes.mockResolvedValue([route(301, 3, 100)]);

    const groups = await getTopRoutes(OPTS_ALL);
    expect(groups[0].commodityName).toBe("Commodity 3");
  });

  it("produces no group for a commodity whose routes array is empty", async () => {
    mockGetPrices.mockResolvedValue(basePrices);
    // Commodity 1 returns routes; commodity 2 returns none.
    mockGetRoutes.mockImplementation((id: number) =>
      Promise.resolve(id === 1 ? [route(101, 1, 500)] : [])
    );

    const groups = await getTopRoutes(OPTS_ALL);
    const ids = groups.map((g) => g.id_commodity);
    expect(ids).toContain(1);
    expect(ids).not.toContain(2);
  });

  // ---------------------------------------------------------------------------
  // Route-count guard (quarantine)
  // ---------------------------------------------------------------------------

  it("marks a commodity with exactly 1 route as quarantined", async () => {
    mockGetPrices.mockResolvedValue(basePrices);
    // Commodity 1: single route → quarantined. Commodity 2: two routes → healthy.
    mockGetRoutes.mockImplementation((id: number) =>
      Promise.resolve(
        id === 1
          ? [route(101, 1, 500)]
          : [route(201, 2, 300), route(202, 2, 200)]
      )
    );

    const groups = await getTopRoutes(OPTS_ALL);
    const g1 = groups.find((g) => g.id_commodity === 1)!;
    expect(g1.quarantined).toBe(true);
  });

  it("marks a commodity with 2 or more routes as not quarantined", async () => {
    mockGetPrices.mockResolvedValue(basePrices);
    // Commodity 1: two routes → healthy. Commodity 2: single route → quarantined.
    mockGetRoutes.mockImplementation((id: number) =>
      Promise.resolve(
        id === 1
          ? [route(101, 1, 500), route(102, 1, 300)]
          : [route(201, 2, 200)]
      )
    );

    const groups = await getTopRoutes(OPTS_ALL);
    const g1 = groups.find((g) => g.id_commodity === 1)!;
    expect(g1.quarantined).toBe(false);
  });

  it("quarantined group sorts below all non-quarantined groups even when its profit is highest", async () => {
    // Three commodities: commodity 1 has a single route with the highest profit
    // of all (9999) but must still land after both healthy groups.
    const prices = [
      priceRec(1, "Osoian Hides", 100, 0),
      priceRec(1, "Osoian Hides", 0, 500),
      priceRec(2, "Agricium", 100, 0),
      priceRec(2, "Agricium", 0, 400),
      priceRec(3, "Laranite", 100, 0),
      priceRec(3, "Laranite", 0, 300),
    ];
    mockGetPrices.mockResolvedValue(prices);
    mockGetRoutes.mockImplementation((id: number) => {
      if (id === 1) return Promise.resolve([route(101, 1, 9999)]);
      if (id === 2) return Promise.resolve([route(201, 2, 500), route(202, 2, 400)]);
      return Promise.resolve([route(301, 3, 300), route(302, 3, 200), route(303, 3, 100)]);
    });

    const groups = await getTopRoutes(OPTS_ALL);
    const quarantinedIdx = groups.findIndex((g) => g.id_commodity === 1);
    const healthy2Idx = groups.findIndex((g) => g.id_commodity === 2);
    const healthy3Idx = groups.findIndex((g) => g.id_commodity === 3);

    expect(groups[quarantinedIdx].quarantined).toBe(true);
    expect(quarantinedIdx).toBeGreaterThan(healthy2Idx);
    expect(quarantinedIdx).toBeGreaterThan(healthy3Idx);
  });

  it("sorts non-quarantined groups by best-route profit descending within their partition", async () => {
    // Commodity 3 has a single route (→ quarantined). Commodities 1 and 2 are
    // healthy; commodity 1's best profit (700) exceeds commodity 2's (400).
    const prices = [
      priceRec(1, "Agricium", 100, 0),
      priceRec(1, "Agricium", 0, 400),
      priceRec(2, "Laranite", 100, 0),
      priceRec(2, "Laranite", 0, 300),
      priceRec(3, "Gold", 100, 0),
      priceRec(3, "Gold", 0, 200),
    ];
    mockGetPrices.mockResolvedValue(prices);
    mockGetRoutes.mockImplementation((id: number) => {
      if (id === 1) return Promise.resolve([route(101, 1, 700), route(102, 1, 600)]);
      if (id === 2) return Promise.resolve([route(201, 2, 400), route(202, 2, 300)]);
      return Promise.resolve([route(301, 3, 900)]);
    });

    const groups = await getTopRoutes(OPTS_ALL);
    const healthy = groups.filter((g) => !g.quarantined);
    expect(healthy[0].id_commodity).toBe(1);
    expect(healthy[1].id_commodity).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // Runnable filter and realizable-profit ranking
  // ---------------------------------------------------------------------------

  it("produces no group for a commodity with only non-runnable routes (origin system excluded)", async () => {
    mockGetPrices.mockResolvedValue(basePrices);
    // Commodity 1's route has origin in "Fringe" which is not in allowedSystems.
    mockGetRoutes.mockImplementation((id: number) =>
      Promise.resolve(
        id === 1
          ? [{ ...route(101, 1, 500), origin_star_system_name: "Fringe" }]
          : [route(201, 2, 300)]
      )
    );
    const groups = await getTopRoutes({ allowedSystems: ["Stanton"], shipCapacity: 100000 });
    expect(groups.map((g) => g.id_commodity)).not.toContain(1);
    expect(groups.map((g) => g.id_commodity)).toContain(2);
  });

  it("excludes a cross-system route but keeps the all-Stanton route for the same commodity", async () => {
    mockGetPrices.mockResolvedValue(basePrices);
    // Commodity 1: Stanton→Stanton (kept) + Stanton→Pyro (excluded under Stanton-only).
    mockGetRoutes.mockImplementation((id: number) =>
      Promise.resolve(
        id === 1
          ? [
              route(101, 1, 500),
              { ...route(102, 1, 600), destination_star_system_name: "Pyro" },
            ]
          : [route(201, 2, 300)]
      )
    );
    const groups = await getTopRoutes({ allowedSystems: ["Stanton"], shipCapacity: 100000 });
    const g1 = groups.find((g) => g.id_commodity === 1)!;
    expect(g1).toBeDefined();
    expect(g1.routes).toHaveLength(1);
    expect(g1.routes[0].id).toBe(101);
  });

  it("ranks groups by realizable profit, not raw profit: high-raw-low-SCU ranks below low-raw-ample-SCU", async () => {
    mockGetPrices.mockResolvedValue(basePrices);
    // Commodity 1: profit=1000, scu=200 → profitPerScu=5, realizableProfit(50)=round(5×50)=250
    // Commodity 2: profit=500,  scu=50  → profitPerScu=10, realizableProfit(50)=round(10×50)=500
    // Raw-profit order: 1>2. Realizable order at shipCapacity=50: 2>1.
    mockGetRoutes.mockImplementation((id: number) =>
      Promise.resolve(
        id === 1
          ? [{ ...route(101, 1, 1000), scu_origin: 200, scu_destination: 200 }]
          : [{ ...route(201, 2, 500), scu_origin: 50, scu_destination: 50 }]
      )
    );
    const groups = await getTopRoutes({ allowedSystems: ["Stanton", "Pyro", "Nyx"], shipCapacity: 50 });
    expect(groups[0].id_commodity).toBe(2);
    expect(groups[1].id_commodity).toBe(1);
  });

  it("quarantine counts only runnable routes: 2-route commodity with 1 excluded is quarantined", async () => {
    mockGetPrices.mockResolvedValue(basePrices);
    // Commodity 1: 2 routes total; second has destination "Pyro" (excluded under Stanton-only).
    // Only 1 runnable → quarantined even though total route count is 2.
    mockGetRoutes.mockImplementation((id: number) =>
      Promise.resolve(
        id === 1
          ? [
              route(101, 1, 500),
              { ...route(102, 1, 400), destination_star_system_name: "Pyro" },
            ]
          : [route(201, 2, 300), route(202, 2, 200)]
      )
    );
    const groups = await getTopRoutes({ allowedSystems: ["Stanton"], shipCapacity: 100000 });
    const g1 = groups.find((g) => g.id_commodity === 1)!;
    expect(g1.quarantined).toBe(true);
  });
});
