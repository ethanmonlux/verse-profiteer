import { getCommodityPricesAll } from "@/lib/uex";

export async function GET() {
  try {
    const data = await getCommodityPricesAll();
    return Response.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 502 });
  }
}
