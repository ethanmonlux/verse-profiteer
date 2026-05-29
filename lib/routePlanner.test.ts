import { describe, it, expect } from "vitest";
import { planRoutes } from "./routePlanner";
import type { CommodityPriceRecord } from "./uex";

function rec(
  overrides: Pick<
    CommodityPriceRecord,
    | "id_commodity"
    | "commodity_name"
    | "id_terminal"
    | "terminal_name"
    | "price_buy"
    | "price_sell"
    | "date_modified"
  >
): CommodityPriceRecord {
  return {
    id: 0,
    id_commodity: overrides.id_commodity,
    id_terminal: overrides.id_terminal,
    commodity_name: overrides.commodity_name,
    terminal_name: overrides.terminal_name,
    price_buy: overrides.price_buy,
    price_sell: overrides.price_sell,
    date_modified: overrides.date_modified,
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
    date_added: 0,
  };
}

describe("planRoutes", () => {
  // Case 1: one valid buy + one valid sell → one route with correct profitPerUnit
  it("produces one route with correct profitPerUnit for a simple buy/sell pair", () => {
    const records = [
      rec({ id_commodity: 1, commodity_name: "Gold", id_terminal: 10, terminal_name: "Station A", price_buy: 100, price_sell: 0, date_modified: 1000 }),
      rec({ id_commodity: 1, commodity_name: "Gold", id_terminal: 20, terminal_name: "Station B", price_buy: 0, price_sell: 150, date_modified: 2000 }),
    ];
    const routes = planRoutes(records);
    expect(routes).toHaveLength(1);
    expect(routes[0].profitPerUnit).toBe(50);
    expect(routes[0].buyTerminalId).toBe(10);
    expect(routes[0].sellTerminalId).toBe(20);
  });

  // Case 2: price_buy = 0 must not be used as a buy source
  it("ignores records with price_buy = 0 as buy sources", () => {
    const records = [
      rec({ id_commodity: 1, commodity_name: "Gold", id_terminal: 10, terminal_name: "Station A", price_buy: 0, price_sell: 0, date_modified: 1000 }),
      rec({ id_commodity: 1, commodity_name: "Gold", id_terminal: 20, terminal_name: "Station B", price_buy: 0, price_sell: 150, date_modified: 2000 }),
    ];
    const routes = planRoutes(records);
    expect(routes).toHaveLength(0);
  });

  // Case 3: price_sell = 0 must not be used as a sell destination
  it("ignores records with price_sell = 0 as sell destinations", () => {
    const records = [
      rec({ id_commodity: 1, commodity_name: "Gold", id_terminal: 10, terminal_name: "Station A", price_buy: 100, price_sell: 0, date_modified: 1000 }),
      rec({ id_commodity: 1, commodity_name: "Gold", id_terminal: 20, terminal_name: "Station B", price_buy: 0, price_sell: 0, date_modified: 2000 }),
    ];
    const routes = planRoutes(records);
    expect(routes).toHaveLength(0);
  });

  // Case 4: pair where price_sell - price_buy <= 0 is excluded
  it("excludes pairs where profitPerUnit <= 0", () => {
    const records = [
      // profit = 0
      rec({ id_commodity: 1, commodity_name: "Gold", id_terminal: 10, terminal_name: "Station A", price_buy: 100, price_sell: 0, date_modified: 1000 }),
      rec({ id_commodity: 1, commodity_name: "Gold", id_terminal: 20, terminal_name: "Station B", price_buy: 0, price_sell: 100, date_modified: 2000 }),
      // profit < 0
      rec({ id_commodity: 2, commodity_name: "Iron", id_terminal: 30, terminal_name: "Station C", price_buy: 200, price_sell: 0, date_modified: 1000 }),
      rec({ id_commodity: 2, commodity_name: "Iron", id_terminal: 40, terminal_name: "Station D", price_buy: 0, price_sell: 150, date_modified: 2000 }),
    ];
    const routes = planRoutes(records);
    expect(routes).toHaveLength(0);
  });

  // Case 5: oldestDateModified = the older (smaller) of buy and sell date_modified
  it("sets oldestDateModified to the older of the two date_modified values", () => {
    const records = [
      rec({ id_commodity: 1, commodity_name: "Gold", id_terminal: 10, terminal_name: "Station A", price_buy: 100, price_sell: 0, date_modified: 3000 }),
      rec({ id_commodity: 1, commodity_name: "Gold", id_terminal: 20, terminal_name: "Station B", price_buy: 0, price_sell: 200, date_modified: 1500 }),
    ];
    const routes = planRoutes(records);
    expect(routes).toHaveLength(1);
    expect(routes[0].oldestDateModified).toBe(1500);
  });

  // Case 6: results sorted descending by profitPerUnit across multiple commodities
  it("sorts results descending by profitPerUnit across commodities", () => {
    const records = [
      // Commodity 1: profit = 50
      rec({ id_commodity: 1, commodity_name: "Gold", id_terminal: 10, terminal_name: "A", price_buy: 100, price_sell: 0, date_modified: 1000 }),
      rec({ id_commodity: 1, commodity_name: "Gold", id_terminal: 20, terminal_name: "B", price_buy: 0, price_sell: 150, date_modified: 1000 }),
      // Commodity 2: profit = 200
      rec({ id_commodity: 2, commodity_name: "Iron", id_terminal: 30, terminal_name: "C", price_buy: 50, price_sell: 0, date_modified: 1000 }),
      rec({ id_commodity: 2, commodity_name: "Iron", id_terminal: 40, terminal_name: "D", price_buy: 0, price_sell: 250, date_modified: 1000 }),
      // Commodity 3: profit = 10
      rec({ id_commodity: 3, commodity_name: "Copper", id_terminal: 50, terminal_name: "E", price_buy: 90, price_sell: 0, date_modified: 1000 }),
      rec({ id_commodity: 3, commodity_name: "Copper", id_terminal: 60, terminal_name: "F", price_buy: 0, price_sell: 100, date_modified: 1000 }),
    ];
    const routes = planRoutes(records);
    expect(routes).toHaveLength(3);
    expect(routes[0].profitPerUnit).toBe(200);
    expect(routes[1].profitPerUnit).toBe(50);
    expect(routes[2].profitPerUnit).toBe(10);
  });

  // Case 7a: opts.limit truncates after sorting
  it("truncates results to opts.limit after sorting", () => {
    const records = [
      rec({ id_commodity: 1, commodity_name: "Gold", id_terminal: 10, terminal_name: "A", price_buy: 100, price_sell: 0, date_modified: 1000 }),
      rec({ id_commodity: 1, commodity_name: "Gold", id_terminal: 20, terminal_name: "B", price_buy: 0, price_sell: 150, date_modified: 1000 }),
      rec({ id_commodity: 2, commodity_name: "Iron", id_terminal: 30, terminal_name: "C", price_buy: 50, price_sell: 0, date_modified: 1000 }),
      rec({ id_commodity: 2, commodity_name: "Iron", id_terminal: 40, terminal_name: "D", price_buy: 0, price_sell: 250, date_modified: 1000 }),
      rec({ id_commodity: 3, commodity_name: "Copper", id_terminal: 50, terminal_name: "E", price_buy: 90, price_sell: 0, date_modified: 1000 }),
      rec({ id_commodity: 3, commodity_name: "Copper", id_terminal: 60, terminal_name: "F", price_buy: 0, price_sell: 100, date_modified: 1000 }),
    ];
    const routes = planRoutes(records, { limit: 2 });
    expect(routes).toHaveLength(2);
    // Should keep the top 2 by profit: 200 and 50
    expect(routes[0].profitPerUnit).toBe(200);
    expect(routes[1].profitPerUnit).toBe(50);
  });

  // Case 7b: omitting limit defaults to 50
  it("defaults to a limit of 50 when opts.limit is omitted", () => {
    // Build 60 commodities each with a profitable buy/sell pair
    const records: CommodityPriceRecord[] = [];
    for (let i = 1; i <= 60; i++) {
      records.push(rec({ id_commodity: i, commodity_name: `Commodity${i}`, id_terminal: i * 2, terminal_name: `Buy${i}`, price_buy: 10, price_sell: 0, date_modified: 1000 }));
      records.push(rec({ id_commodity: i, commodity_name: `Commodity${i}`, id_terminal: i * 2 + 1, terminal_name: `Sell${i}`, price_buy: 0, price_sell: 20, date_modified: 1000 }));
    }
    const routes = planRoutes(records);
    expect(routes).toHaveLength(50);
  });
});
