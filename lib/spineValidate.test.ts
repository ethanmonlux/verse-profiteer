import { describe, it, expect } from "vitest";
import {
  parsePlanInput,
  parseLegInput,
  parseItemInput,
  SpineValidationError,
} from "@/lib/spineValidate";

describe("parsePlanInput", () => {
  it("accepts a full input and trims the title", () => {
    expect(
      parsePlanInput({
        title: "  Tuesday run  ",
        shipCapacityScu: 100,
        allowedSystems: ["Stanton"],
        startTerminalId: 10,
      }),
    ).toEqual({
      title: "Tuesday run",
      shipCapacityScu: 100,
      allowedSystems: ["Stanton"],
      startTerminalId: 10,
    });
  });

  it("accepts minimal input, leaving optionals null", () => {
    expect(
      parsePlanInput({ shipCapacityScu: 64, allowedSystems: ["Stanton"] }),
    ).toEqual({
      title: null,
      shipCapacityScu: 64,
      allowedSystems: ["Stanton"],
      startTerminalId: null,
    });
  });

  it("normalizes a whitespace-only title to null", () => {
    expect(
      parsePlanInput({
        title: "   ",
        shipCapacityScu: 64,
        allowedSystems: ["Stanton"],
      }),
    ).toEqual({
      title: null,
      shipCapacityScu: 64,
      allowedSystems: ["Stanton"],
      startTerminalId: null,
    });
  });

  it("ignores server-owned tenantId and status fields", () => {
    const result = parsePlanInput({
      shipCapacityScu: 64,
      allowedSystems: ["Stanton"],
      tenantId: "someone",
      status: "active",
    });
    expect("tenantId" in result).toBe(false);
    expect("status" in result).toBe(false);
  });

  it("rejects a null body", () => {
    expect(() => parsePlanInput(null)).toThrow(SpineValidationError);
  });

  it("rejects an array body", () => {
    expect(() => parsePlanInput([])).toThrow(SpineValidationError);
  });

  it("rejects a number body", () => {
    expect(() => parsePlanInput(5)).toThrow(SpineValidationError);
  });

  it("rejects missing shipCapacityScu", () => {
    expect(() => parsePlanInput({ allowedSystems: ["Stanton"] })).toThrow(
      SpineValidationError,
    );
  });

  it("rejects shipCapacityScu = 0", () => {
    expect(() =>
      parsePlanInput({ shipCapacityScu: 0, allowedSystems: ["Stanton"] }),
    ).toThrow(SpineValidationError);
  });

  it("rejects shipCapacityScu = -3", () => {
    expect(() =>
      parsePlanInput({ shipCapacityScu: -3, allowedSystems: ["Stanton"] }),
    ).toThrow(SpineValidationError);
  });

  it("rejects non-integer shipCapacityScu = 1.5", () => {
    expect(() =>
      parsePlanInput({ shipCapacityScu: 1.5, allowedSystems: ["Stanton"] }),
    ).toThrow(SpineValidationError);
  });

  it("rejects string shipCapacityScu = \"100\"", () => {
    expect(() =>
      parsePlanInput({ shipCapacityScu: "100", allowedSystems: ["Stanton"] }),
    ).toThrow(SpineValidationError);
  });

  it("rejects missing allowedSystems", () => {
    expect(() => parsePlanInput({ shipCapacityScu: 64 })).toThrow(
      SpineValidationError,
    );
  });

  it("rejects non-array allowedSystems", () => {
    expect(() =>
      parsePlanInput({ shipCapacityScu: 64, allowedSystems: "Stanton" }),
    ).toThrow(SpineValidationError);
  });

  it("rejects empty allowedSystems array", () => {
    expect(() =>
      parsePlanInput({ shipCapacityScu: 64, allowedSystems: [] }),
    ).toThrow(SpineValidationError);
  });

  it("rejects allowedSystems containing a whitespace string", () => {
    expect(() =>
      parsePlanInput({
        shipCapacityScu: 64,
        allowedSystems: ["Stanton", "  "],
      }),
    ).toThrow(SpineValidationError);
  });

  it("rejects allowedSystems containing a non-string", () => {
    expect(() =>
      parsePlanInput({ shipCapacityScu: 64, allowedSystems: [1] }),
    ).toThrow(SpineValidationError);
  });

  it("rejects startTerminalId = 0", () => {
    expect(() =>
      parsePlanInput({
        shipCapacityScu: 64,
        allowedSystems: ["Stanton"],
        startTerminalId: 0,
      }),
    ).toThrow(SpineValidationError);
  });

  it("rejects startTerminalId = -1", () => {
    expect(() =>
      parsePlanInput({
        shipCapacityScu: 64,
        allowedSystems: ["Stanton"],
        startTerminalId: -1,
      }),
    ).toThrow(SpineValidationError);
  });

  it("rejects non-integer startTerminalId = 2.5", () => {
    expect(() =>
      parsePlanInput({
        shipCapacityScu: 64,
        allowedSystems: ["Stanton"],
        startTerminalId: 2.5,
      }),
    ).toThrow(SpineValidationError);
  });

  it("rejects a non-string title", () => {
    expect(() =>
      parsePlanInput({
        shipCapacityScu: 64,
        allowedSystems: ["Stanton"],
        title: 5,
      }),
    ).toThrow(SpineValidationError);
  });
});

describe("parseLegInput", () => {
  it("accepts a full input", () => {
    expect(
      parseLegInput({
        idTerminalOrigin: 1,
        idTerminalDestination: 2,
        idCommodity: 53,
        sourceActivity: "mining",
      }),
    ).toEqual({
      idTerminalOrigin: 1,
      idTerminalDestination: 2,
      idCommodity: 53,
      sourceActivity: "mining",
    });
  });

  it("accepts minimal input: deadhead commodity and default activity", () => {
    expect(
      parseLegInput({ idTerminalOrigin: 1, idTerminalDestination: 2 }),
    ).toEqual({
      idTerminalOrigin: 1,
      idTerminalDestination: 2,
      idCommodity: null,
      sourceActivity: "trade",
    });
  });

  it("ignores server-owned planId and seq fields", () => {
    const result = parseLegInput({
      idTerminalOrigin: 1,
      idTerminalDestination: 2,
      planId: 9,
      seq: 5,
    });
    expect("planId" in result).toBe(false);
    expect("seq" in result).toBe(false);
  });

  it("rejects missing idTerminalOrigin", () => {
    expect(() => parseLegInput({ idTerminalDestination: 2 })).toThrow(
      SpineValidationError,
    );
  });

  it("rejects idTerminalOrigin = 0", () => {
    expect(() =>
      parseLegInput({ idTerminalOrigin: 0, idTerminalDestination: 2 }),
    ).toThrow(SpineValidationError);
  });

  it("rejects idTerminalOrigin = -2", () => {
    expect(() =>
      parseLegInput({ idTerminalOrigin: -2, idTerminalDestination: 2 }),
    ).toThrow(SpineValidationError);
  });

  it("rejects non-integer idTerminalOrigin = 1.5", () => {
    expect(() =>
      parseLegInput({ idTerminalOrigin: 1.5, idTerminalDestination: 2 }),
    ).toThrow(SpineValidationError);
  });

  it("rejects missing idTerminalDestination", () => {
    expect(() => parseLegInput({ idTerminalOrigin: 1 })).toThrow(
      SpineValidationError,
    );
  });

  it("rejects non-integer idTerminalDestination", () => {
    expect(() =>
      parseLegInput({ idTerminalOrigin: 1, idTerminalDestination: 2.5 }),
    ).toThrow(SpineValidationError);
  });

  it("rejects idCommodity = 0", () => {
    expect(() =>
      parseLegInput({
        idTerminalOrigin: 1,
        idTerminalDestination: 2,
        idCommodity: 0,
      }),
    ).toThrow(SpineValidationError);
  });

  it("rejects idCommodity = -1", () => {
    expect(() =>
      parseLegInput({
        idTerminalOrigin: 1,
        idTerminalDestination: 2,
        idCommodity: -1,
      }),
    ).toThrow(SpineValidationError);
  });

  it("rejects a whitespace-only sourceActivity", () => {
    expect(() =>
      parseLegInput({
        idTerminalOrigin: 1,
        idTerminalDestination: 2,
        sourceActivity: "  ",
      }),
    ).toThrow(SpineValidationError);
  });
});

describe("parseItemInput", () => {
  it("accepts a full acquire", () => {
    expect(
      parseItemInput({
        idCommodity: 53,
        movement: "acquire",
        scu: 8,
        unitPrice: "2700",
        fee: "500",
        idTerminal: 1,
        legId: 101,
      }),
    ).toEqual({
      legId: 101,
      idCommodity: 53,
      movement: "acquire",
      disposition: null,
      scu: 8,
      unitPrice: "2700",
      fee: "500",
      idTerminal: 1,
    });
  });

  it("accepts a dispose sale, normalizing a number price to a string", () => {
    expect(
      parseItemInput({
        idCommodity: 53,
        movement: "dispose",
        disposition: "sale",
        scu: 6,
        unitPrice: 3200,
      }),
    ).toEqual({
      legId: null,
      idCommodity: 53,
      movement: "dispose",
      disposition: "sale",
      scu: 6,
      unitPrice: "3200",
      fee: null,
      idTerminal: null,
    });
  });

  it("accepts a dispose loss with no price", () => {
    expect(
      parseItemInput({
        idCommodity: 53,
        movement: "dispose",
        disposition: "loss",
        scu: 2,
      }),
    ).toEqual({
      legId: null,
      idCommodity: 53,
      movement: "dispose",
      disposition: "loss",
      scu: 2,
      unitPrice: null,
      fee: null,
      idTerminal: null,
    });
  });

  it("normalizes a padded price string", () => {
    const result = parseItemInput({
      idCommodity: 53,
      movement: "dispose",
      disposition: "sale",
      scu: 6,
      unitPrice: "  3200  ",
    });
    expect(result.unitPrice).toBe("3200");
  });

  it("ignores server-owned planId and occurredAt fields", () => {
    const result = parseItemInput({
      idCommodity: 53,
      movement: "acquire",
      scu: 1,
      planId: 9,
      occurredAt: "2026-01-01",
    });
    expect("planId" in result).toBe(false);
    expect("occurredAt" in result).toBe(false);
  });

  it("rejects missing movement", () => {
    expect(() => parseItemInput({ idCommodity: 53, scu: 1 })).toThrow(
      SpineValidationError,
    );
  });

  it("rejects an unknown movement value", () => {
    expect(() =>
      parseItemInput({ idCommodity: 53, movement: "buy", scu: 1 }),
    ).toThrow(SpineValidationError);
  });

  it("rejects a disposition on an acquire", () => {
    expect(() =>
      parseItemInput({
        idCommodity: 53,
        movement: "acquire",
        scu: 1,
        disposition: "sale",
      }),
    ).toThrow(SpineValidationError);
  });

  it("rejects a dispose with a missing disposition", () => {
    expect(() =>
      parseItemInput({ idCommodity: 53, movement: "dispose", scu: 1 }),
    ).toThrow(SpineValidationError);
  });

  it("rejects a dispose with an unknown disposition", () => {
    expect(() =>
      parseItemInput({
        idCommodity: 53,
        movement: "dispose",
        disposition: "foo",
        scu: 1,
      }),
    ).toThrow(SpineValidationError);
  });

  it("rejects missing scu", () => {
    expect(() =>
      parseItemInput({ idCommodity: 53, movement: "acquire" }),
    ).toThrow(SpineValidationError);
  });

  it("rejects scu = 0", () => {
    expect(() =>
      parseItemInput({ idCommodity: 53, movement: "acquire", scu: 0 }),
    ).toThrow(SpineValidationError);
  });

  it("rejects scu = -5", () => {
    expect(() =>
      parseItemInput({ idCommodity: 53, movement: "acquire", scu: -5 }),
    ).toThrow(SpineValidationError);
  });

  it("rejects non-integer scu = 2.5", () => {
    expect(() =>
      parseItemInput({ idCommodity: 53, movement: "acquire", scu: 2.5 }),
    ).toThrow(SpineValidationError);
  });

  it("rejects missing idCommodity", () => {
    expect(() => parseItemInput({ movement: "acquire", scu: 1 })).toThrow(
      SpineValidationError,
    );
  });

  it("rejects idCommodity = 0", () => {
    expect(() =>
      parseItemInput({ idCommodity: 0, movement: "acquire", scu: 1 }),
    ).toThrow(SpineValidationError);
  });

  it("rejects a non-numeric unitPrice string \"abc\"", () => {
    expect(() =>
      parseItemInput({
        idCommodity: 53,
        movement: "acquire",
        scu: 1,
        unitPrice: "abc",
      }),
    ).toThrow(SpineValidationError);
  });

  it("rejects an empty unitPrice string", () => {
    expect(() =>
      parseItemInput({
        idCommodity: 53,
        movement: "acquire",
        scu: 1,
        unitPrice: "",
      }),
    ).toThrow(SpineValidationError);
  });

  it("rejects unitPrice = NaN", () => {
    expect(() =>
      parseItemInput({
        idCommodity: 53,
        movement: "acquire",
        scu: 1,
        unitPrice: NaN,
      }),
    ).toThrow(SpineValidationError);
  });

  it("rejects unitPrice = Infinity", () => {
    expect(() =>
      parseItemInput({
        idCommodity: 53,
        movement: "acquire",
        scu: 1,
        unitPrice: Infinity,
      }),
    ).toThrow(SpineValidationError);
  });

  it("rejects an object unitPrice", () => {
    expect(() =>
      parseItemInput({
        idCommodity: 53,
        movement: "acquire",
        scu: 1,
        unitPrice: {},
      }),
    ).toThrow(SpineValidationError);
  });

  it("rejects a non-numeric fee \"x\"", () => {
    expect(() =>
      parseItemInput({
        idCommodity: 53,
        movement: "acquire",
        scu: 1,
        fee: "x",
      }),
    ).toThrow(SpineValidationError);
  });

  it("rejects idTerminal = 0", () => {
    expect(() =>
      parseItemInput({
        idCommodity: 53,
        movement: "acquire",
        scu: 1,
        idTerminal: 0,
      }),
    ).toThrow(SpineValidationError);
  });

  it("rejects legId = -1", () => {
    expect(() =>
      parseItemInput({
        idCommodity: 53,
        movement: "acquire",
        scu: 1,
        legId: -1,
      }),
    ).toThrow(SpineValidationError);
  });
});
