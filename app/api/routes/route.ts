import { getTopRoutes } from "@/lib/routes";

export async function GET() {
  try {
    const routes = await getTopRoutes();
    return Response.json(routes);
  } catch {
    return Response.json({ error: "Failed to load routes" }, { status: 502 });
  }
}
