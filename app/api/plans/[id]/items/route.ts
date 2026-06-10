// Spine write-path: append a ledger item to a plan. Thin handler — validation
// lives in spineValidate, persistence in spineRepo. planId comes from the URL,
// occurredAt from the DB default; neither is read from the body.
import { getPlan, appendItem, listLegsByPlan } from "@/lib/spineRepo";
import { parseItemInput, SpineValidationError } from "@/lib/spineValidate";

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

    const { legId, idCommodity, movement, disposition, scu, unitPrice, fee, idTerminal } =
      parseItemInput(body);

    // Cross-plan integrity guard: an item's leg must belong to THIS plan.
    if (legId !== null) {
      const legs = await listLegsByPlan(id);
      if (!legs.some((leg) => leg.id === legId)) {
        return Response.json(
          { error: "legId does not belong to this plan" },
          { status: 400 },
        );
      }
    }

    // Per the store-and-flag decision, this handler does NOT validate cross-row
    // ledger invariants (e.g. over-sell vs current carry) — that guard is
    // deliberately deferred; the read view surfaces negative carry.
    const item = await appendItem({
      planId: id,
      legId,
      idCommodity,
      movement,
      disposition,
      scu,
      unitPrice,
      fee,
      idTerminal,
    });
    return Response.json(item, { status: 201 });
  } catch (e) {
    if (e instanceof SpineValidationError) {
      return Response.json({ error: e.message }, { status: 400 });
    }
    return Response.json({ error: "failed to append item" }, { status: 500 });
  }
}
