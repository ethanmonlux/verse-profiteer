// TEMPORARY DEBUG SURFACE — ungated raw UEX passthrough. Strip or gate before public launch / monetization unpause. See TODO.
import { getCommodityRoutes } from "@/lib/uex";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idCommodity = searchParams.get("id_commodity");

  if (!idCommodity || isNaN(Number(idCommodity))) {
    return Response.json({ error: "id_commodity required" }, { status: 400 });
  }

  try {
    const routes = await getCommodityRoutes(Number(idCommodity));
    return Response.json(routes);
  } catch {
    return Response.json({ error: "Failed to load routes" }, { status: 502 });
  }
}
