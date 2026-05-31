// TEMPORARY DEBUG SURFACE — ungated raw commodities_prices_all passthrough (the cheap bulk call the shortlist is built from). Strip or gate before public launch / monetization unpause. See TODO.
import { getCommodityPricesAll } from "@/lib/uex";

export async function GET() {
  try {
    const records = await getCommodityPricesAll();
    return Response.json(records);
  } catch {
    return Response.json({ error: "Failed to load prices" }, { status: 502 });
  }
}
