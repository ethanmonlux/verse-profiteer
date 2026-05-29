import { getCommodityPricesAll } from "@/lib/uex";

export async function GET() {
  try {
    const data = await getCommodityPricesAll();
    return Response.json(data);
  } catch {
    return Response.json(
      { error: "Failed to fetch commodity prices" },
      { status: 502 }
    );
  }
}
