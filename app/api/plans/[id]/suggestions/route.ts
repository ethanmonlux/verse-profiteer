// Read-only next-leg suggestions for a plan (D7 Scope A). Thin handler: derives
// the plan's current position and carry, applies the empty-hold-first fork
// (D7 RC2), anchors on the chain tail while planning ahead (D7 RC1), and
// delegates ranking to lib/legSuggest. Writes nothing — all numbers are derived
// on read (Spine Rule).

// Soft cap on chain hops — informational, never blocks. Will be promoted to a
// per-plan field later.
const MAX_CHAIN_HOPS = 5;

import { getPlan, listItemsByPlan, listLegsByPlan } from "@/lib/spineRepo";
import { carryState, currentPositionTerminalId } from "@/lib/spineDerive";
import { suggestNextLegs, type LegSuggestion } from "@/lib/legSuggest";

interface SuggestionsResponse {
  originTerminalId: number | null;
  heldCargo: { idCommodity: number; scu: number }[];
  suggestions: LegSuggestion[];
  blockedReason: string | null;
  chainLength: number;
  softCapReached: boolean;
}

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

    const [items, legs] = await Promise.all([
      listItemsByPlan(id),
      listLegsByPlan(id),
    ]);
    const carry = carryState(items);
    const position = currentPositionTerminalId(plan, items);

    const chainLength = legs.length;
    const softCapReached = chainLength >= MAX_CHAIN_HOPS;

    // EMPTY-HOLD-FIRST FORK (D7 RC2): if anything is in the hold, suggesting a
    // new acquire would ignore the cargo we already carry. Surface the held
    // cargo and stop — selling-held-cargo suggestions are a later beat.
    if (carry.size > 0) {
      const heldCargo = [...carry.entries()]
        .map(([idCommodity, scu]) => ({ idCommodity, scu }))
        .sort((a, b) => a.idCommodity - b.idCommodity);
      const body: SuggestionsResponse = {
        originTerminalId: position,
        heldCargo,
        suggestions: [],
        blockedReason:
          "Holding cargo — suggestions for selling held cargo are a later beat.",
        chainLength,
        softCapReached,
      };
      return Response.json(body);
    }

    // ANCHOR SELECTION (D7 RC1 — couch-chaining): while planning ahead (no
    // items logged yet) but legs exist, originate from the chain tail so the
    // chain stays contiguous; once items exist (flying has begun) reality wins
    // and the anchor reverts to ledger position.
    let anchor: number | null;
    if (items.length === 0 && chainLength > 0) {
      anchor = legs[legs.length - 1].idTerminalDestination ?? position;
    } else {
      anchor = position;
    }

    if (anchor === null) {
      const body: SuggestionsResponse = {
        originTerminalId: null,
        heldCargo: [],
        suggestions: [],
        blockedReason: "Set a start terminal on the plan to get suggestions.",
        chainLength,
        softCapReached,
      };
      return Response.json(body);
    }

    const suggestions = await suggestNextLegs({
      originTerminal: anchor,
      shipCapacity: plan.shipCapacityScu,
      allowedSystems: plan.allowedSystems,
    });
    const body: SuggestionsResponse = {
      originTerminalId: anchor,
      heldCargo: [],
      suggestions,
      blockedReason: null,
      chainLength,
      softCapReached,
    };
    return Response.json(body);
  } catch {
    return Response.json({ error: "failed to build suggestions" }, { status: 500 });
  }
}
