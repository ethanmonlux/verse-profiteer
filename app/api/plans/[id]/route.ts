// Spine read-path: aggregate plan fetch (plan + legs + items) plus the derived
// view (carry, profit, position, locks) computed here via derivePlanView, which
// never throws — on corrupt data it returns { view: null, error } so the raw
// rows still serve and the bad entry can be seen and fixed.
import { getPlan, listLegsByPlan, listItemsByPlan } from "@/lib/spineRepo";
import { derivePlanView } from "@/lib/planView";

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
    const { view, error } = derivePlanView(plan, legs, items);
    return Response.json({ plan, legs, items, derived: view, derivedError: error });
  } catch {
    return Response.json({ error: "failed to load plan" }, { status: 500 });
  }
}
