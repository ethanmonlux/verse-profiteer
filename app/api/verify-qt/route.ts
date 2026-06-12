// DEBUG SURFACE — gated by DEBUG_ROUTES=on (see lib/debugGate.ts). Returns 404 when disabled.
import { debugGate } from "@/lib/debugGate";
import { getCategories, getItemsAttributes } from "@/lib/uex";

export async function GET(request: Request) {
  const gated = debugGate();
  if (gated) return gated;

  const { searchParams } = new URL(request.url);
  const idCategoryParam = searchParams.get("id_category");
  const idCategory = idCategoryParam !== null ? Number(idCategoryParam) : NaN;

  try {
    const categories = await getCategories();
    const attributes =
      !isNaN(idCategory) && idCategoryParam !== null
        ? await getItemsAttributes(idCategory)
        : [];
    return Response.json({ categories, attributes });
  } catch {
    return Response.json({ error: "Failed to load QT data" }, { status: 502 });
  }
}
