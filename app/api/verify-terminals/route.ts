// TEMPORARY DEBUG SURFACE — ungated raw UEX passthrough. Strip or gate before public launch / monetization unpause. See TODO.
import { getTerminals } from "@/lib/uex";

export async function GET() {
  try {
    const terminals = await getTerminals();
    return Response.json(terminals);
  } catch {
    return Response.json({ error: "Failed to load terminals" }, { status: 502 });
  }
}
