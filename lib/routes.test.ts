import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTopRoutes } from "@/lib/routes";
import type { CommodityPriceRecord, CommodityRoute } from "@/lib/uex";

vi.mock("@/lib/uex", () => ({
  getCommodityPricesAll: vi.fn(),
  getTerminals: vi.fn(),
}));

vi.mock("@/lib/routesRepo", () => ({
  getAllMirroredRoutes: vi.fn(),
}));

// ---------------------------------------------------------------------------
// getTopRoutes — mocked UEX layer
// ---------------------------------------------------------------------------

import { getCommodityPricesAll, getTerminals } from "@/lib/uex";
import { getAllMirroredRoutes } from "@/lib/routesRepo";

const mockGetPrices = getCommodityPricesAll as ReturnType<typeof vi.fn>;
const mockGetAllRoutes = getAllMirroredRoutes as ReturnType<typeof vi.fn>;
const mockGetTerminals = getTerminals as ReturnType<typeof vi.fn>;

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
    mockGetTerminals.mockResolvedValue([]);
  });

  it("returns one group per commodity with no duplicates", async () => {
    mockGetPrices.mockResolvedValue(basePrices);
    mockGetAllRoutes.mockResolvedValue([route(101, 1, 500), route(201, 2, 300)]);

    const groups = await getTopRoutes(OPTS_ALL);
    const ids = groups.map((g) => g.id_commodity);
    expect(ids).toHaveLength(new Set(ids).size);
    expect(ids).toContain(1);
    expect(ids).toContain(2);
  });

  it("sorts each group's routes by profit descending and caps at 3", async () => {
    mockGetPrices.mockResolvedValue(basePrices);
    // Commodity 1 gets 4 routes in arbitrary order; expect top-3 sorted desc.
    mockGetAllRoutes.mockResolvedValue([
      route(101, 1, 200),
      route(102, 1, 500),
      route(103, 1, 100),
      route(104, 1, 400),
      route(201, 2, 50),
    ]);

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
    mockGetAllRoutes.mockResolvedValue([route(101, 1, 300), route(201, 2, 700)]);

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
    const manyRoutes: CommodityRoute[] = [];
    for (let i = 1; i <= 12; i++) {
      manyRoutes.push(route(i * 100, i, i * 10));
    }
    mockGetAllRoutes.mockResolvedValue(manyRoutes);

    const groups = await getTopRoutes(OPTS_ALL);
    expect(groups.length).toBeLessThanOrEqual(10);
  });

  it("populates commodityName from prices feed", async () => {
    mockGetPrices.mockResolvedValue(basePrices);
    mockGetAllRoutes.mockResolvedValue([route(100, 1, 100), route(200, 2, 100)]);

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
    mockGetAllRoutes.mockResolvedValue([route(301, 3, 100)]);

    const groups = await getTopRoutes(OPTS_ALL);
    expect(groups[0].commodityName).toBe("Commodity 3");
  });

  it("produces no group for a commodity whose routes array is empty", async () => {
    mockGetPrices.mockResolvedValue(basePrices);
    // Commodity 1 has a route in the mirror; commodity 2 has none.
    mockGetAllRoutes.mockResolvedValue([route(101, 1, 500)]);

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
    mockGetAllRoutes.mockResolvedValue([
      route(101, 1, 500),
      route(201, 2, 300),
      route(202, 2, 200),
    ]);

    const groups = await getTopRoutes(OPTS_ALL);
    const g1 = groups.find((g) => g.id_commodity === 1)!;
    expect(g1.quarantined).toBe(true);
  });

  it("marks a commodity with 2 or more routes as not quarantined", async () => {
    mockGetPrices.mockResolvedValue(basePrices);
    // Commodity 1: two routes → healthy. Commodity 2: single route → quarantined.
    mockGetAllRoutes.mockResolvedValue([
      route(101, 1, 500),
      route(102, 1, 300),
      route(201, 2, 200),
    ]);

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
    mockGetAllRoutes.mockResolvedValue([
      route(101, 1, 9999),
      route(201, 2, 500),
      route(202, 2, 400),
      route(301, 3, 300),
      route(302, 3, 200),
      route(303, 3, 100),
    ]);

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
    mockGetAllRoutes.mockResolvedValue([
      route(101, 1, 700),
      route(102, 1, 600),
      route(201, 2, 400),
      route(202, 2, 300),
      route(301, 3, 900),
    ]);

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
    mockGetAllRoutes.mockResolvedValue([
      { ...route(101, 1, 500), origin_star_system_name: "Fringe" },
      route(201, 2, 300),
    ]);
    const groups = await getTopRoutes({ allowedSystems: ["Stanton"], shipCapacity: 100000 });
    expect(groups.map((g) => g.id_commodity)).not.toContain(1);
    expect(groups.map((g) => g.id_commodity)).toContain(2);
  });

  it("excludes a cross-system route but keeps the all-Stanton route for the same commodity", async () => {
    mockGetPrices.mockResolvedValue(basePrices);
    // Commodity 1: Stanton→Stanton (kept) + Stanton→Pyro (excluded under Stanton-only).
    mockGetAllRoutes.mockResolvedValue([
      route(101, 1, 500),
      { ...route(102, 1, 600), destination_star_system_name: "Pyro" },
      route(201, 2, 300),
    ]);
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
    mockGetAllRoutes.mockResolvedValue([
      { ...route(101, 1, 1000), scu_origin: 200, scu_destination: 200 },
      { ...route(201, 2, 500), scu_origin: 50, scu_destination: 50 },
    ]);
    const groups = await getTopRoutes({ allowedSystems: ["Stanton", "Pyro", "Nyx"], shipCapacity: 50 });
    expect(groups[0].id_commodity).toBe(2);
    expect(groups[1].id_commodity).toBe(1);
  });

  it("quarantine counts only runnable routes: 2-route commodity with 1 excluded is quarantined", async () => {
    mockGetPrices.mockResolvedValue(basePrices);
    // Commodity 1: 2 routes total; second has destination "Pyro" (excluded under Stanton-only).
    // Only 1 runnable → quarantined even though total route count is 2.
    mockGetAllRoutes.mockResolvedValue([
      route(101, 1, 500),
      { ...route(102, 1, 400), destination_star_system_name: "Pyro" },
      route(201, 2, 300),
      route(202, 2, 200),
    ]);
    const groups = await getTopRoutes({ allowedSystems: ["Stanton"], shipCapacity: 100000 });
    const g1 = groups.find((g) => g.id_commodity === 1)!;
    expect(g1.quarantined).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // D3 regression guard: the shortlist no longer gates results
  // ---------------------------------------------------------------------------

  it("surfaces a commodity that would have fallen outside the top-35 margin shortlist but ranks high on realizable profit", async () => {
    // 35 filler commodities each have a fat price-feed margin (≥101), so a
    // top-35 margin shortlist would be entirely filled by them. Their routes are
    // low-profit (realizable 200). The target commodity (id 999) has a tiny
    // margin (10) — margin-rank 36, outside any top-35 shortlist — but its route
    // carries a huge realizable profit. Under the old shortlist+fan-out path 999
    // was never fetched and could never appear. Under the mirror read every
    // commodity is ranked, so 999 surfaces (in fact at the top).
    const prices: CommodityPriceRecord[] = [];
    const mirrorRoutes: CommodityRoute[] = [];
    for (let i = 1; i <= 35; i++) {
      prices.push(priceRec(i, `Filler ${i}`, 100, 0));
      prices.push(priceRec(i, `Filler ${i}`, 0, 200 + i)); // margin = 100 + i
      mirrorRoutes.push(route(i * 10, i, 200));
    }
    prices.push(priceRec(999, "Deep Cut", 100, 0));
    prices.push(priceRec(999, "Deep Cut", 0, 110)); // margin = 10 → rank 36
    mirrorRoutes.push(route(99900, 999, 100000));

    mockGetPrices.mockResolvedValue(prices);
    mockGetAllRoutes.mockResolvedValue(mirrorRoutes);

    const groups = await getTopRoutes(OPTS_ALL);
    const ids = groups.map((g) => g.id_commodity);
    expect(ids).toContain(999);
    expect(groups[0].id_commodity).toBe(999);
  });
});
