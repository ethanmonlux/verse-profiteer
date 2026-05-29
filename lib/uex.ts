export type CommodityPrice = Record<string, unknown>;

export async function getCommodityPricesAll(): Promise<CommodityPrice[]> {
  const baseUrl = process.env.UEX_BASE_URL;
  const token = process.env.UEX_API_TOKEN;

  if (!baseUrl) {
    throw new Error("UEX_BASE_URL is not set");
  }

  const url = `${baseUrl}/commodities_prices_all`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token ?? ""}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`UEX responded with status ${res.status}`);
  }

  const json = (await res.json()) as { status: string; data: CommodityPrice[] };
  return json.data;
}
