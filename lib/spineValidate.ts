// Pure input validation/normalization for the spine write endpoints; throws
// SpineValidationError on bad input so handlers can map it to HTTP 400. No DB
// access, no I/O — mirrors lib/spineDerive.ts / lib/realizableProfit.ts (pure,
// thin route handlers consume them).

export class SpineValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpineValidationError";
  }
}

export interface ParsedPlanInput {
  title: string | null;
  shipCapacityScu: number;
  allowedSystems: string[];
  startTerminalId: number | null;
}

export interface ParsedLegInput {
  idTerminalOrigin: number;
  idTerminalDestination: number;
  idCommodity: number | null;
  sourceActivity: string;
}

export interface ParsedItemInput {
  legId: number | null;
  idCommodity: number;
  movement: "acquire" | "dispose";
  disposition: "sale" | "dump" | "loss" | null;
  scu: number;
  unitPrice: string | null;
  fee: string | null;
  idTerminal: number | null;
}

// --- internal helpers (not exported) ---

// Narrows unknown to a plain record; rejects null and arrays.
function asObject(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new SpineValidationError("body must be a JSON object");
  }
  return body as Record<string, unknown>;
}

// Required positive integer: Number.isInteger && > 0.
function requirePositiveInt(v: unknown, field: string): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v <= 0) {
    throw new SpineValidationError(`${field} must be a positive integer`);
  }
  return v;
}

// Optional positive integer: null when absent (undefined/null), else required.
function optionalPositiveInt(v: unknown, field: string): number | null {
  if (v === undefined || v === null) return null;
  return requirePositiveInt(v, field);
}

// Optional numeric field -> string|null. The DB column is Postgres numeric,
// which Drizzle reads/writes as string, so we normalize to a string here. This
// is the gate that stops a non-numeric price from ever reaching the ledger.
function optionalNumericField(v: unknown, field: string): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v === "number") {
    if (!Number.isFinite(v)) {
      throw new SpineValidationError(`${field} must be a finite number`);
    }
    return String(v);
  }
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (trimmed === "" || !Number.isFinite(Number(trimmed))) {
      throw new SpineValidationError(`${field} must be a numeric string`);
    }
    return trimmed;
  }
  throw new SpineValidationError(`${field} must be a number or numeric string`);
}

// --- parsers ---

export function parsePlanInput(body: unknown): ParsedPlanInput {
  const obj = asObject(body);

  const shipCapacityScu = requirePositiveInt(
    obj.shipCapacityScu,
    "shipCapacityScu",
  );

  const rawSystems = obj.allowedSystems;
  if (!Array.isArray(rawSystems) || rawSystems.length < 1) {
    throw new SpineValidationError(
      "allowedSystems must be a non-empty array of system names",
    );
  }
  const allowedSystems = rawSystems.map((s) => {
    if (typeof s !== "string" || s.trim() === "") {
      throw new SpineValidationError(
        "allowedSystems must contain only non-empty strings",
      );
    }
    return s.trim();
  });

  const startTerminalId = optionalPositiveInt(
    obj.startTerminalId,
    "startTerminalId",
  );

  let title: string | null = null;
  if (obj.title !== undefined && obj.title !== null) {
    if (typeof obj.title !== "string") {
      throw new SpineValidationError("title must be a string");
    }
    const trimmed = obj.title.trim();
    title = trimmed === "" ? null : trimmed;
  }

  return { title, shipCapacityScu, allowedSystems, startTerminalId };
}

export function parseLegInput(body: unknown): ParsedLegInput {
  const obj = asObject(body);

  const idTerminalOrigin = requirePositiveInt(
    obj.idTerminalOrigin,
    "idTerminalOrigin",
  );
  const idTerminalDestination = requirePositiveInt(
    obj.idTerminalDestination,
    "idTerminalDestination",
  );
  const idCommodity = optionalPositiveInt(obj.idCommodity, "idCommodity");

  let sourceActivity = "trade";
  if (obj.sourceActivity !== undefined && obj.sourceActivity !== null) {
    if (typeof obj.sourceActivity !== "string" || obj.sourceActivity.trim() === "") {
      throw new SpineValidationError("sourceActivity must be a non-empty string");
    }
    sourceActivity = obj.sourceActivity.trim();
  }

  return { idTerminalOrigin, idTerminalDestination, idCommodity, sourceActivity };
}

export function parseItemInput(body: unknown): ParsedItemInput {
  const obj = asObject(body);

  const idCommodity = requirePositiveInt(obj.idCommodity, "idCommodity");

  if (obj.movement !== "acquire" && obj.movement !== "dispose") {
    throw new SpineValidationError(
      'movement must be exactly "acquire" or "dispose"',
    );
  }
  const movement = obj.movement;

  let disposition: "sale" | "dump" | "loss" | null = null;
  if (movement === "dispose") {
    if (
      obj.disposition !== "sale" &&
      obj.disposition !== "dump" &&
      obj.disposition !== "loss"
    ) {
      throw new SpineValidationError(
        'disposition must be exactly "sale", "dump", or "loss" on dispose items',
      );
    }
    disposition = obj.disposition;
  } else {
    if (obj.disposition !== undefined && obj.disposition !== null) {
      throw new SpineValidationError(
        "disposition is only valid on dispose items",
      );
    }
  }

  const scu = requirePositiveInt(obj.scu, "scu");
  const unitPrice = optionalNumericField(obj.unitPrice, "unitPrice");
  const fee = optionalNumericField(obj.fee, "fee");
  const idTerminal = optionalPositiveInt(obj.idTerminal, "idTerminal");
  const legId = optionalPositiveInt(obj.legId, "legId");

  return {
    legId,
    idCommodity,
    movement,
    disposition,
    scu,
    unitPrice,
    fee,
    idTerminal,
  };
}
