import { describe, it, expect } from "vitest";
import { shortlistCommodities } from "@/lib/routes";
import type { CommodityPriceRecord } from "@/lib/uex";

function rec(
  overrides: Pick<CommodityPriceRecord, "id_commodity" | "price_buy" | "price_sell">
): CommodityPriceRecord {
  return {
    id: 0,
    id_commodity: overrides.id_commodity,
    id_terminal: 0,
    commodity_name: "",
    terminal_name: "",
    price_buy: overrides.price_buy,
    price_sell: overrides.price_sell,
    price_buy_avg: 0,
    price_sell_avg: 0,
    scu_buy: 0,
    scu_sell: 0,
    scu_buy_avg: 0,
    scu_sell_avg: 0,
    scu_sell_stock: 0,
    scu_sell_stock_avg: 0,
    status_buy: 0,
    status_sell: 0,
    quality: 0,
    container_sizes: "",
    date_modified: 0,
    date_added: 0,
  };
}

describe("shortlistCommodities", () => {
  // Case 1: commodities are ranked by margin (max_sell - min_buy) descending
  it("ranks commodities by margin descending", () => {
    const records = [
      // Commodity 1: margin = 150 - 100 = 50
      rec({ id_commodity: 1, price_buy: 100, price_sell: 0 }),
      rec({ id_commodity: 1, price_buy: 0, price_sell: 150 }),
      // Commodity 2: margin = 250 - 50 = 200
      rec({ id_commodity: 2, price_buy: 50, price_sell: 0 }),
      rec({ id_commodity: 2, price_buy: 0, price_sell: 250 }),
      // Commodity 3: margin = 100 - 90 = 10
      rec({ id_commodity: 3, price_buy: 90, price_sell: 0 }),
      rec({ id_commodity: 3, price_buy: 0, price_sell: 100 }),
    ];
    const result = shortlistCommodities(records, 10);
    expect(result).toEqual([2, 1, 3]);
  });

  // Case 2: returns at most n id_commodity values
  it("returns at most n results", () => {
    const records = [
      rec({ id_commodity: 1, price_buy: 100, price_sell: 0 }),
      rec({ id_commodity: 1, price_buy: 0, price_sell: 200 }),
      rec({ id_commodity: 2, price_buy: 50, price_sell: 0 }),
      rec({ id_commodity: 2, price_buy: 0, price_sell: 300 }),
      rec({ id_commodity: 3, price_buy: 80, price_sell: 0 }),
      rec({ id_commodity: 3, price_buy: 0, price_sell: 120 }),
    ];
    const result = shortlistCommodities(records, 2);
    expect(result).toHaveLength(2);
  });

  // Case 3: uses max price_sell and min price_buy across multiple terminals per commodity
  it("picks max price_sell and min price_buy when multiple terminals exist", () => {
    // Commodity 1 has three terminals. Best buy = 80, best sell = 300. Margin = 220.
    // Commodity 2 has one pair. Margin = 500 - 400 = 100.
    const records = [
      rec({ id_commodity: 1, price_buy: 100, price_sell: 0 }),
      rec({ id_commodity: 1, price_buy: 80, price_sell: 200 }),
      rec({ id_commodity: 1, price_buy: 0, price_sell: 300 }),
      rec({ id_commodity: 2, price_buy: 400, price_sell: 0 }),
      rec({ id_commodity: 2, price_buy: 0, price_sell: 500 }),
    ];
    const result = shortlistCommodities(records, 10);
    // Commodity 1 margin 220 > commodity 2 margin 100
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(2);
  });

  // Case 4: excludes commodities with no valid buy (all price_buy <= 0)
  it("excludes commodities where all price_buy values are <= 0", () => {
    const records = [
      rec({ id_commodity: 1, price_buy: 0, price_sell: 200 }),
      rec({ id_commodity: 1, price_buy: 0, price_sell: 300 }),
      // Commodity 2 has a valid buy
      rec({ id_commodity: 2, price_buy: 50, price_sell: 0 }),
      rec({ id_commodity: 2, price_buy: 0, price_sell: 150 }),
    ];
    const result = shortlistCommodities(records, 10);
    expect(result).not.toContain(1);
    expect(result).toContain(2);
  });

  // Case 5: excludes commodities with no valid sell (all price_sell <= 0)
  it("excludes commodities where all price_sell values are <= 0", () => {
    const records = [
      rec({ id_commodity: 1, price_buy: 100, price_sell: 0 }),
      rec({ id_commodity: 1, price_buy: 50, price_sell: 0 }),
      // Commodity 2 has a valid sell
      rec({ id_commodity: 2, price_buy: 60, price_sell: 0 }),
      rec({ id_commodity: 2, price_buy: 0, price_sell: 180 }),
    ];
    const result = shortlistCommodities(records, 10);
    expect(result).not.toContain(1);
    expect(result).toContain(2);
  });

  // Case 6: ignores price_buy <= 0 and price_sell <= 0 cells when computing margin
  it("ignores zero-price cells and uses only valid prices for margin", () => {
    // Commodity 1: the zero buy/sell records must be skipped.
    // Valid buy = 120, valid sell = 400. Margin = 280.
    // Commodity 2: margin = 200 - 100 = 100.
    const records = [
      rec({ id_commodity: 1, price_buy: 0, price_sell: 400 }),   // buy=0 ignored for buy-side
      rec({ id_commodity: 1, price_buy: 120, price_sell: 0 }),   // sell=0 ignored for sell-side
      rec({ id_commodity: 2, price_buy: 100, price_sell: 0 }),
      rec({ id_commodity: 2, price_buy: 0, price_sell: 200 }),
    ];
    const result = shortlistCommodities(records, 10);
    // Commodity 1 margin 280 > commodity 2 margin 100
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(2);
  });

  // Case 7: return values are id_commodity numbers, not route or terminal objects
  it("returns an array of id_commodity numbers", () => {
    const records = [
      rec({ id_commodity: 42, price_buy: 10, price_sell: 0 }),
      rec({ id_commodity: 42, price_buy: 0, price_sell: 20 }),
    ];
    const result = shortlistCommodities(records, 10);
    expect(result).toEqual([42]);
    expect(typeof result[0]).toBe("number");
  });
});
