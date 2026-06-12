// DEBUG SURFACE — gated by DEBUG_ROUTES=on (see lib/debugGate.ts). Returns 404 when disabled.
import { debugGate } from "@/lib/debugGate";
import { getMirroredRoutesByCommodity } from "@/lib/routesRepo";

export async function GET(request: Request) {
  const gated = debugGate();
  if (gated) return gated;

  const { searchParams } = new URL(request.url);
  const idCommodity = searchParams.get("id_commodity");

  if (!idCommodity || isNaN(Number(idCommodity))) {
    return Response.json({ error: "id_commodity required" }, { status: 400 });
  }

  try {
    const routes = await getMirroredRoutesByCommodity(Number(idCommodity));
    return Response.json(routes);
  } catch {
    return Response.json({ error: "Failed to load routes" }, { status: 502 });
  }
}
