// DEBUG SURFACE — gated by DEBUG_ROUTES=on (see lib/debugGate.ts). Returns 404 when disabled.
import { debugGate } from "@/lib/debugGate";
import { getCommodityPricesAll } from "@/lib/uex";

export async function GET() {
  const gated = debugGate();
  if (gated) return gated;

  try {
    const records = await getCommodityPricesAll();
    return Response.json(records);
  } catch {
    return Response.json({ error: "Failed to load prices" }, { status: 502 });
  }
}
