import { NextResponse } from "next/server";
import { getCommodityRoutes } from "@/lib/uex";

const SPIKE_COMMODITY_IDS = [53, 172, 56, 130, 24, 75];

export async function GET() {
  const results = await Promise.all(
    SPIKE_COMMODITY_IDS.map(async (id) => {
      const routes = await getCommodityRoutes(id);
      return [id, routes] as const;
    })
  );

  const data = Object.fromEntries(results);
  return NextResponse.json(data);
}
