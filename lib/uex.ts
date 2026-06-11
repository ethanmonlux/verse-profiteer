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

  const url = `${base}/commodities_routes?id_commodity=${idCommodity}`;
  const headers = { Authorization: `Bearer ${token}` };

  // 30 s per-call timeout, 3 total attempts, 1 s/3 s backoff — operator-approved, escalation-gated.
  const BACKOFFS_MS = [1_000, 3_000];

  async function attempt(): Promise<CommodityRoute[]> {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(30_000),
      headers,
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      throw Object.assign(new Error(`UEX request failed: ${res.status}`), {
        retryable: res.status >= 500,
      });
    }

    const json = await res.json();

    if (json.status !== "ok" || !Array.isArray(json.data)) {
      throw Object.assign(new Error("UEX returned unexpected response"), { retryable: false });
    }

    return json.data as CommodityRoute[];
  }

  let lastErr: unknown;
  for (let i = 0; i <= BACKOFFS_MS.length; i++) {
    try {
      return await attempt();
    } catch (err) {
      lastErr = err;
      const retryable =
        !(err instanceof Error) ||
        (err as Error & { retryable?: boolean }).retryable !== false;
      if (!retryable || i === BACKOFFS_MS.length) throw err;
      await new Promise<void>((r) => setTimeout(r, BACKOFFS_MS[i]));
    }
  }

  throw lastErr;
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
  is_cargo: number;
  is_ground_vehicle: number;
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

export interface Terminal {
  id: number;
  name: string;
  is_auto_load: number;
  is_cargo_center: number;
  has_freight_elevator: number;
  has_loading_dock: number;
  has_docking_port: number;
  star_system_name: string | null;
  planet_name: string | null;
  moon_name: string | null;
  outpost_name: string | null;
}

export async function getTerminals(): Promise<Terminal[]> {
  const base = process.env.UEX_BASE_URL;
  const token = process.env.UEX_API_TOKEN;

  if (!base || !token) {
    throw new Error("UEX not configured");
  }

  const res = await fetch(`${base}/terminals`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    next: { revalidate: 43200 },
  });

  if (!res.ok) {
    throw new Error(`UEX request failed: ${res.status}`);
  }

  const json = await res.json();

  if (json.status !== "ok" || !Array.isArray(json.data)) {
    throw new Error("UEX returned unexpected response");
  }

  return json.data as Terminal[];
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
