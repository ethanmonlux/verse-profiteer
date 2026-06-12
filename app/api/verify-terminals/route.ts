// DEBUG SURFACE — gated by DEBUG_ROUTES=on (see lib/debugGate.ts). Returns 404 when disabled.
import { debugGate } from "@/lib/debugGate";
import { getTerminals } from "@/lib/uex";

export async function GET() {
  const gated = debugGate();
  if (gated) return gated;

  try {
    const terminals = await getTerminals();
    return Response.json(terminals);
  } catch {
    return Response.json({ error: "Failed to load terminals" }, { status: 502 });
  }
}
