export type CommodityPrice = Record<string, unknown>;

export async function getCommodityPricesAll(): Promise<CommodityPrice[]> {
  const base = process.env.UEX_BASE_URL;
  const token = process.env.UEX_API_TOKEN;

  if (!base || !token) {
    throw new Error("UEX not configured");
  }

  const res = await fetch(`${base}/commodities_prices_all`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`UEX request failed: ${res.status}`);
  }

  const json = await res.json();

  if (json.status !== "ok" || !Array.isArray(json.data)) {
    throw new Error("UEX returned unexpected response");
  }

  return json.data as CommodityPrice[];
}
