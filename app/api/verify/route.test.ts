import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CommodityRoute } from "@/lib/uex";

vi.mock("@/lib/uex", () => ({
  getCommodityRoutes: vi.fn(),
}));

import { getCommodityRoutes } from "@/lib/uex";
import { GET } from "@/app/api/verify/route";

const mockGetRoutes = getCommodityRoutes as ReturnType<typeof vi.fn>;

const fixtureRoutes: CommodityRoute[] = [
  {
    id: 1,
    id_commodity: 5,
    origin_terminal_name: "Origin-A",
    destination_terminal_name: "Dest-B",
    id_terminal_origin: 10,
    id_terminal_destination: 20,
    price_margin: 100,
    price_roi: 0.1,
    profit: 500,
    investment: 5000,
    distance: 2,
    scu_origin: 10,
    scu_destination: 10,
    scu_margin: 0,
    volatility_origin: 0,
    volatility_destination: 0,
    status_origin: 1,
    status_destination: 1,
    score: 80,
    date_added: 1700000000,
  },
];

describe("GET /api/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 and the raw route array when id_commodity is valid", async () => {
    mockGetRoutes.mockResolvedValue(fixtureRoutes);

    const req = new Request("http://test/api/verify?id_commodity=5");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(fixtureRoutes);
    expect(mockGetRoutes).toHaveBeenCalledWith(5);
  });

  it("returns 400 when id_commodity is missing", async () => {
    const req = new Request("http://test/api/verify");
    const res = await GET(req);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "id_commodity required" });
  });

  it("returns 400 when id_commodity is not a number", async () => {
    const req = new Request("http://test/api/verify?id_commodity=abc");
    const res = await GET(req);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "id_commodity required" });
  });

  it("returns 502 when getCommodityRoutes throws", async () => {
    mockGetRoutes.mockRejectedValue(new Error("UEX not configured"));

    const req = new Request("http://test/api/verify?id_commodity=5");
    const res = await GET(req);

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "Failed to load routes" });
  });
});
