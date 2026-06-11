import { describe, it, expect } from "vitest";
import { pacedFanOut, exceedsFailureThreshold } from "@/lib/mirror";

describe("pacedFanOut", () => {
  it("collects every value and no failures when all calls succeed", async () => {
    const ids = [1, 2, 3, 4, 5];
    const { results, failures } = await pacedFanOut(
      ids,
      async (id) => id * 10,
      { batchSize: 2, delayMs: 0 },
    );

    expect(results).toEqual([10, 20, 30, 40, 50]);
    expect(failures).toEqual([]);
  });

  it("captures the rejected id in failures and keeps the other results", async () => {
    const ids = [1, 2, 3];
    const { results, failures } = await pacedFanOut(
      ids,
      async (id) => {
        if (id === 2) throw new Error("boom");
        return id * 10;
      },
      { batchSize: 2, delayMs: 0 },
    );

    expect(results).toEqual([10, 30]);
    expect(failures).toHaveLength(1);
    expect(failures[0].id).toBe(2);
    expect(failures[0].error).toBeInstanceOf(Error);
  });

  it("captures rejections in multiple batches with their correct ids", async () => {
    // batchSize 2 => batches [1,2], [3,4], [5,6]; reject 2 and 5 (different batches)
    const ids = [1, 2, 3, 4, 5, 6];
    const rejectIds = new Set([2, 5]);
    const { results, failures } = await pacedFanOut(
      ids,
      async (id) => {
        if (rejectIds.has(id)) throw new Error(`fail-${id}`);
        return id * 10;
      },
      { batchSize: 2, delayMs: 0 },
    );

    expect(results).toEqual([10, 30, 40, 60]);
    expect(failures.map((f) => f.id).sort((a, b) => a - b)).toEqual([2, 5]);
  });
});

describe("exceedsFailureThreshold", () => {
  it("is true when rowCount is 0 regardless of failures (no failures)", () => {
    expect(exceedsFailureThreshold(0, 121, 0)).toBe(true);
  });

  it("is true when rowCount is 0 even with some failures", () => {
    expect(exceedsFailureThreshold(5, 121, 0)).toBe(true);
  });

  it("is true when failureCount exceeds 10% of total", () => {
    expect(exceedsFailureThreshold(13, 121, 5000)).toBe(true);
  });

  it("is false just under the threshold", () => {
    expect(exceedsFailureThreshold(12, 121, 5000)).toBe(false);
  });

  it("is false with zero failures and rows present", () => {
    expect(exceedsFailureThreshold(0, 121, 5000)).toBe(false);
  });
});
