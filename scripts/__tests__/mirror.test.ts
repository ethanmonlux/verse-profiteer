import { describe, it, expect } from "vitest";

// lib/mirror imports lib/db, which throws at module-load time if DATABASE_URL
// is unset. We are only allowed to create this test file (not modify lib/mirror,
// lib/db, or the vitest config), so we stub the env BEFORE importing the module
// and use a dynamic import so the assignment runs first. The Pool is created but
// never connects (parseContainerSizes is pure and runs no query), so this test
// touches neither the network nor a database.
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
const { parseContainerSizes } = await import("@/lib/mirror");

describe("parseContainerSizes", () => {
  describe("valid input returns the int array", () => {
    it('"1,2,4,8" returns [1, 2, 4, 8]', () => {
      expect(parseContainerSizes("1,2,4,8")).toEqual([1, 2, 4, 8]);
    });

    it('"1" returns [1]', () => {
      expect(parseContainerSizes("1")).toEqual([1]);
    });

    it('" 1 , 2 , 4 " trims tokens and returns [1, 2, 4]', () => {
      expect(parseContainerSizes(" 1 , 2 , 4 ")).toEqual([1, 2, 4]);
    });

    it('"32,16" preserves order (not sorted) and returns [32, 16]', () => {
      expect(parseContainerSizes("32,16")).toEqual([32, 16]);
    });
  });

  describe("invalid input returns null (never a partial or garbage array)", () => {
    it('"" (empty string) returns null', () => {
      expect(parseContainerSizes("")).toBeNull();
    });

    it('"   " (whitespace only) returns null', () => {
      expect(parseContainerSizes("   ")).toBeNull();
    });

    it('"1,,4" (empty token in the middle) returns null', () => {
      expect(parseContainerSizes("1,,4")).toBeNull();
    });

    it('"1-8" (range) returns null', () => {
      expect(parseContainerSizes("1-8")).toBeNull();
    });

    it('"1,abc,4" (non-numeric token) returns null', () => {
      expect(parseContainerSizes("1,abc,4")).toBeNull();
    });

    it('"1.5,2" (non-integer) returns null', () => {
      expect(parseContainerSizes("1.5,2")).toBeNull();
    });

    it('"0,4" (zero is not a positive integer) returns null', () => {
      expect(parseContainerSizes("0,4")).toBeNull();
    });

    it('"-1,4" (negative) returns null', () => {
      expect(parseContainerSizes("-1,4")).toBeNull();
    });

    it('"1, ,4" (whitespace-only token) returns null', () => {
      expect(parseContainerSizes("1, ,4")).toBeNull();
    });
  });

  it("contract: non-clean input is strictly null, never an array (not [] or [NaN])", () => {
    expect(Array.isArray(parseContainerSizes("1,abc"))).toBe(false);
  });
});
