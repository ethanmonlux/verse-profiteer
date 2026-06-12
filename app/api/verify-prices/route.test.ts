import { describe, it, expect, vi, beforeEach } from "vitest";
import { afterEach } from "vitest";
import type { CommodityPriceRecord } from "@/lib/uex";

vi.mock("@/lib/uex", () => ({
  getCommodityPricesAll: vi.fn(),
}));

import { getCommodityPricesAll } from "@/lib/uex";
import { GET } from "@/app/api/verify-prices/route";

const mockGetPricesAll = getCommodityPricesAll as ReturnType<typeof vi.fn>;

const fixturePrices: CommodityPriceRecord[] = [
  {
    id: 1,
    id_commodity: 5,
    id_terminal: 10,
    commodity_name: "Gold",
    terminal_name: "Terminal-A",
    price_buy: 100,
    price_sell: 120,
    price_buy_avg: 105,
    price_sell_avg: 115,
    scu_buy: 50,
    scu_sell: 40,
    scu_buy_avg: 45,
    scu_sell_avg: 38,
    scu_sell_stock: 200,
    scu_sell_stock_avg: 180,
    status_buy: 1,
    status_sell: 1,
    quality: 0,
    container_sizes: "1,2,4",
    date_modified: 1700000000,
    date_added: 1700000000,
  },
];

describe("GET /api/verify-prices", () => {
  beforeEach(() => {
  process.env.DEBUG_ROUTES = "on";
    vi.clearAllMocks();
  });

  it("returns 200 and the raw array exactly as getCommodityPricesAll returned it", async () => {
    mockGetPricesAll.mockResolvedValue(fixturePrices);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(fixturePrices);
    expect(mockGetPricesAll).toHaveBeenCalledOnce();
  });

  it("returns 502 when getCommodityPricesAll throws", async () => {
    mockGetPricesAll.mockRejectedValue(new Error("UEX not configured"));

    const res = await GET();

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "Failed to load prices" });
  });
});

afterEach(() => {
  delete process.env.DEBUG_ROUTES;
});

describe("debug gate", () => {
  it("returns 404 when DEBUG_ROUTES is not enabled", async () => {
    delete process.env.DEBUG_ROUTES;
    const res = await GET();
    expect(res.status).toBe(404);
  });
});
