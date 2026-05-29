import { getCommodityPricesAll } from "@/lib/uex";
import { planRoutes } from "@/lib/routePlanner";

export async function GET() {
  try {
    const data = await getCommodityPricesAll();
    const routes = planRoutes(data);
    return Response.json(routes);
  } catch {
    return Response.json(
      { error: "Failed to plan routes" },
      { status: 502 }
    );
  }
}
