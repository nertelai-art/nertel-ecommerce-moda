import "server-only";
import { z } from "zod";
import {
  catalogPageSchema,
  catalogProductSchema,
  productSlugSchema,
} from "@/features/catalog/product";
import { publicCatalogConfig } from "@/server/integrations/supabase/public-config";

const pageSize = 12;
const projection =
  "id,slug,name,description,product_variants(id,size,color,price_minor,currency)";

async function readProducts(filters: Record<string, string>) {
  try {
    const config = publicCatalogConfig(process.env);
    const query = new URLSearchParams({
      select: projection,
      status: "eq.published",
      "product_variants.is_active": "eq.true",
      "product_variants.order": "id.asc",
      order: "name.asc,id.asc",
      ...filters,
    });
    const response = await fetch(`${config.url}/rest/v1/products?${query}`, {
      headers: { apikey: config.key },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      redirect: "error",
    });
    if (!response.ok) throw new Error("Catalog request failed");
    return z
      .array(catalogProductSchema)
      .max(pageSize + 1)
      .parse(await response.json());
  } catch {
    // Never forward provider responses, headers, keys or validation payloads to logs/UI.
    throw new Error("Catalog temporarily unavailable");
  }
}

export async function listCatalog(page: number) {
  const validPage = catalogPageSchema.parse(page);
  const products = await readProducts({
    limit: String(pageSize + 1),
    offset: String((validPage - 1) * pageSize),
  });
  return {
    products: products.slice(0, pageSize),
    hasNext: validPage < 1000 && products.length > pageSize,
  };
}

export async function findCatalogProduct(slug: string) {
  const parsed = productSlugSchema.safeParse(slug);
  if (!parsed.success) return null;
  const products = await readProducts({
    slug: `eq.${parsed.data}`,
    limit: "1",
  });
  return products[0] ?? null;
}
