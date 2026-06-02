// TEMPORARY DEBUG SURFACE — remove before this work is done. Tracked in TODO debug-surface strip list. Created to inspect /vehicles field names.

import { getVehicles } from "@/lib/uex";

const DEBUG_KEY = "vehinspect";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("key") !== DEBUG_KEY) {
    return new Response(null, { status: 404 });
  }

  const vehicles = await getVehicles();
  const sample = vehicles.slice(0, 3);

  return Response.json({
    count: vehicles.length,
    sampleKeys: vehicles.length > 0 ? Object.keys(vehicles[0] as object) : [],
    sample,
  });
}
