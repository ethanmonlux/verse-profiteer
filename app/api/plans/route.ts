// Spine write-path: plan create + list. Thin handler — validation lives in
// spineValidate, persistence in spineRepo, derivation on read elsewhere.
// UNGATED (sole-user); must be gated before public traffic — see TODO.
import { createPlan, listPlans } from "@/lib/spineRepo";
import { parsePlanInput, SpineValidationError } from "@/lib/spineValidate";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  try {
    const { title, shipCapacityScu, allowedSystems, startTerminalId } =
      parsePlanInput(body);
    // tenantId ('operator') and status ('draft') come from DB defaults, never
    // the request body; createdAt/updatedAt default too.
    const plan = await createPlan({
      title,
      shipCapacityScu,
      allowedSystems,
      startTerminalId,
    });
    return Response.json(plan, { status: 201 });
  } catch (e) {
    if (e instanceof SpineValidationError) {
      return Response.json({ error: e.message }, { status: 400 });
    }
    return Response.json({ error: "failed to create plan" }, { status: 500 });
  }
}

export async function GET() {
  try {
    // tenant fixed to 'operator' until auth exists.
    return Response.json(await listPlans("operator"));
  } catch {
    return Response.json({ error: "failed to list plans" }, { status: 500 });
  }
}
