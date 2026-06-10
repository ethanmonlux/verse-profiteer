// Spine read-path: aggregate plan fetch (plan + legs + items) — what the UI
// re-fetches after each write. Returns raw stored rows only; all derivation
// (carry, profit, position, locks) happens on read elsewhere, not here.
import { getPlan, listLegsByPlan, listItemsByPlan } from "@/lib/spineRepo";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await ctx.params;
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      return Response.json({ error: "invalid plan id" }, { status: 400 });
    }

    const plan = await getPlan(id);
    if (plan === null) {
      return Response.json({ error: "plan not found" }, { status: 404 });
    }

    const [legs, items] = await Promise.all([
      listLegsByPlan(id),
      listItemsByPlan(id),
    ]);
    return Response.json({ plan, legs, items });
  } catch {
    return Response.json({ error: "failed to load plan" }, { status: 500 });
  }
}
