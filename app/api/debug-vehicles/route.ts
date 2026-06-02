// TEMPORARY DEBUG SURFACE — raw vehicle field inspection. Delete after verify-first check.
import { getVehicles } from "@/lib/uex";

export async function GET() {
  try {
    const base = process.env.UEX_BASE_URL;
    const token = process.env.UEX_API_TOKEN;

    if (!base || !token) {
      return Response.json({ error: "UEX not configured" }, { status: 500 });
    }

    const res = await fetch(`${base}/vehicles`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return Response.json({ error: `UEX ${res.status}` }, { status: 502 });
    }

    const json = await res.json();

    if (json.status !== "ok" || !Array.isArray(json.data)) {
      return Response.json({ error: "unexpected UEX response", raw: json }, { status: 502 });
    }

    // Return first 5 records so we can inspect every field present in the raw response
    const sample = json.data.slice(0, 5);
    const total = json.data.length;
    return Response.json({ total, sample });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
