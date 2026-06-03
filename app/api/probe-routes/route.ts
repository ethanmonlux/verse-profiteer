import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.UEX_BASE_URL;
  const token = process.env.UEX_API_TOKEN;

  const headers = { Authorization: `Bearer ${token}` };

  type CallResult = {
    httpStatus: number | string;
    apiStatus: unknown;
    isArray: boolean | null;
    rowCount: number | null;
    firstRowKeys: string[] | null;
  };

  let noParam: CallResult = {
    httpStatus: "not_run",
    apiStatus: null,
    isArray: null,
    rowCount: null,
    firstRowKeys: null,
  };

  let withParam: CallResult = {
    httpStatus: "not_run",
    apiStatus: null,
    isArray: null,
    rowCount: null,
    firstRowKeys: null,
  };

  let sampleRow: unknown = null;

  try {
    const res = await fetch(`${base}/commodities_routes`, { headers });
    let json: { status?: unknown; data?: unknown } = {};
    try {
      json = await res.json();
    } catch {
      json = {};
    }
    noParam = {
      httpStatus: res.status,
      apiStatus: json.status ?? null,
      isArray: Array.isArray(json.data),
      rowCount: Array.isArray(json.data) ? json.data.length : null,
      firstRowKeys:
        Array.isArray(json.data) && json.data.length > 0
          ? Object.keys(json.data[0] as object)
          : null,
    };
  } catch (err) {
    noParam = {
      httpStatus: "fetch_error",
      apiStatus: err instanceof Error ? err.message : String(err),
      isArray: null,
      rowCount: null,
      firstRowKeys: null,
    };
  }

  try {
    const res = await fetch(`${base}/commodities_routes?id_commodity=18`, {
      headers,
    });
    let json: { status?: unknown; data?: unknown } = {};
    try {
      json = await res.json();
    } catch {
      json = {};
    }
    withParam = {
      httpStatus: res.status,
      apiStatus: json.status ?? null,
      isArray: Array.isArray(json.data),
      rowCount: Array.isArray(json.data) ? json.data.length : null,
      firstRowKeys:
        Array.isArray(json.data) && json.data.length > 0
          ? Object.keys(json.data[0] as object)
          : null,
    };
    sampleRow =
      Array.isArray(json.data) && json.data.length > 0 ? json.data[0] : null;
  } catch (err) {
    withParam = {
      httpStatus: "fetch_error",
      apiStatus: err instanceof Error ? err.message : String(err),
      isArray: null,
      rowCount: null,
      firstRowKeys: null,
    };
    sampleRow = null;
  }

  return NextResponse.json({ noParam, withParam, sampleRow });
}
