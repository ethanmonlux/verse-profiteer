// Debug surface gate. The verify-* routes and the Debug* panels are raw data
// passthroughs for manual verification runs (see VERIFICATIONS.md). They are
// OFF unless DEBUG_ROUTES=on is set in the environment. Default-deny: any
// other value, or unset, disables them. Disabled routes return 404 (not 401)
// so the surface is invisible, not advertised.

export function debugRoutesEnabled(): boolean {
  return process.env.DEBUG_ROUTES === "on";
}

export function debugGate(): Response | null {
  if (!debugRoutesEnabled()) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}
