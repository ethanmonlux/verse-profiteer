export interface CommodityPriceRecord {
  id: number;
  id_commodity: number;
  id_terminal: number;
  commodity_name: string;
  terminal_name: string;
  price_buy: number;
  price_sell: number;
  price_buy_avg: number;
  price_sell_avg: number;
  scu_buy: number;
  scu_sell: number;
  scu_buy_avg: number;
  scu_sell_avg: number;
  scu_sell_stock: number;
  scu_sell_stock_avg: number;
  status_buy: number;
  status_sell: number;
  quality: number;
  container_sizes: string;
  date_modified: number;
  date_added: number;
}

export interface CommodityRoute {
  id: number;
  id_commodity: number;
  origin_terminal_name: string | null;
  destination_terminal_name: string | null;
  id_terminal_origin: number;
  id_terminal_destination: number;
  price_margin: number;
  price_origin: number;
  price_destination: number;
  price_roi: number;
  profit: number;
  investment: number;
  distance: number;
  scu_origin: number;
  scu_destination: number;
  scu_margin: number;
  volatility_origin: number;
  volatility_destination: number;
  status_origin: number;
  status_destination: number;
  score: number;
  date_added: number;
  origin_star_system_name: string | null;
  destination_star_system_name: string | null;
  id_star_system_origin: number;
  id_star_system_destination: number;
  scu_reachable: number;
  container_sizes_origin: string;
  container_sizes_destination: string;
}

export async function getCommodityRoutes(idCommodity: number): Promise<CommodityRoute[]> {
  const base = process.env.UEX_BASE_URL;
  const token = process.env.UEX_API_TOKEN;

  if (!base || !token) {
    throw new Error("UEX not configured");
  }

  const res = await fetch(`${base}/commodities_routes?id_commodity=${idCommodity}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`UEX request failed: ${res.status}`);
  }

  const json = await res.json();

  if (json.status !== "ok" || !Array.isArray(json.data)) {
    throw new Error("UEX returned unexpected response");
  }

  return json.data as CommodityRoute[];
}

export interface Category {
  id: number;
  name: string;
  [key: string]: unknown;
}

export interface ItemAttribute {
  attribute_name: string;
  value: string | number;
  unit: string;
  [key: string]: unknown;
}

export async function getCategories(): Promise<Category[]> {
  const base = process.env.UEX_BASE_URL;
  const token = process.env.UEX_API_TOKEN;

  if (!base || !token) {
    throw new Error("UEX not configured");
  }

  const res = await fetch(`${base}/categories`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    throw new Error(`UEX request failed: ${res.status}`);
  }

  const json = await res.json();

  if (json.status !== "ok" || !Array.isArray(json.data)) {
    throw new Error("UEX returned unexpected response");
  }

  return json.data as Category[];
}

export async function getItemsAttributes(idCategory: number): Promise<ItemAttribute[]> {
  const base = process.env.UEX_BASE_URL;
  const token = process.env.UEX_API_TOKEN;

  if (!base || !token) {
    throw new Error("UEX not configured");
  }

  const res = await fetch(`${base}/items_attributes?id_category=${idCategory}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    throw new Error(`UEX request failed: ${res.status}`);
  }

  const json = await res.json();

  if (json.status !== "ok" || !Array.isArray(json.data)) {
    throw new Error("UEX returned unexpected response");
  }

  return json.data as ItemAttribute[];
}

export interface Vehicle {
  id: number;
  name: string;
  scu: number;
  container_sizes: string;
  game_version: string;
}

export async function getCommodityPricesAll(): Promise<CommodityPriceRecord[]> {
  const base = process.env.UEX_BASE_URL;
  const token = process.env.UEX_API_TOKEN;

  if (!base || !token) {
    throw new Error("UEX not configured");
  }

  const res = await fetch(`${base}/commodities_prices_all`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`UEX request failed: ${res.status}`);
  }

  const json = await res.json();

  if (json.status !== "ok" || !Array.isArray(json.data)) {
    throw new Error("UEX returned unexpected response");
  }

  return json.data as CommodityPriceRecord[];
}

export async function getVehicles(): Promise<Vehicle[]> {
  const base = process.env.UEX_BASE_URL;
  const token = process.env.UEX_API_TOKEN;

  if (!base || !token) {
    throw new Error("UEX not configured");
  }

  const res = await fetch(`${base}/vehicles`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    throw new Error(`UEX request failed: ${res.status}`);
  }

  const json = await res.json();

  if (json.status !== "ok" || !Array.isArray(json.data)) {
    throw new Error("UEX returned unexpected response");
  }

  return json.data as Vehicle[];
}
