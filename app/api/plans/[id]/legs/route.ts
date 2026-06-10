// Spine write-path: append a leg to a plan. Thin handler — validation lives in
// spineValidate, persistence in spineRepo. seq is server-assigned (append
// semantics); planId comes from the URL, never the body.
import { getPlan, appendLeg, listLegsByPlan } from "@/lib/spineRepo";
import { parseLegInput, SpineValidationError } from "@/lib/spineValidate";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

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

    const { idTerminalOrigin, idTerminalDestination, idCommodity, sourceActivity } =
      parseLegInput(body);

    // seq via count+1 has a race under concurrent appends; acceptable for the
    // current sole-user model.
    const seq = (await listLegsByPlan(id)).length + 1;

    const leg = await appendLeg({
      planId: id,
      seq,
      idTerminalOrigin,
      idTerminalDestination,
      idCommodity,
      sourceActivity,
    });
    return Response.json(leg, { status: 201 });
  } catch (e) {
    if (e instanceof SpineValidationError) {
      return Response.json({ error: e.message }, { status: 400 });
    }
    return Response.json({ error: "failed to append leg" }, { status: 500 });
  }
}
