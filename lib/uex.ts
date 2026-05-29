export type CommodityPrice = Record<string, unknown>;

export async function getCommodityPricesAll(): Promise<CommodityPrice[]> {
  const base = process.env.UEX_BASE_URL;
  const token = process.env.UEX_API_TOKEN;

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
  return json.data as CommodityPrice[];
}
