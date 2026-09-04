import "server-only";
import { z } from "zod";
import {
  catalogPageSchema,
  catalogProductSchema,
  publicCategorySchema,
  productSlugSchema,
  type CatalogQuery,
} from "@/features/catalog/product";
import { publicCatalogConfig } from "@/server/integrations/supabase/public-config";

const pageSize = 12;
const projection =
  "id,slug,name,description,product_variants(id,size,color,price_minor,currency),product_categories(categories(id,slug,name)),product_images(id,alt_text,sort_order)";

async function readProducts(filters: Record<string, string>) {
  try {
    const config = publicCatalogConfig(process.env);
    const query = new URLSearchParams({
      select: projection,
      status: "eq.published",
      "product_variants.is_active": "eq.true",
      "product_variants.order": "id.asc",
      "product_categories.categories.is_active": "eq.true",
      "product_categories.order": "category_id.asc",
      "product_images.order": "sort_order.asc,id.asc",
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

export async function listCatalog(filters: CatalogQuery) {
  const validPage = catalogPageSchema.parse(filters.page);
  const relationFilters = filters.category
    ? { "category_filter.categories.slug": `eq.${filters.category}` }
    : {};
  const searchFilter = filters.query
    ? { name: `ilike.*${filters.query}*` }
    : {};
  const selectedProjection = filters.category
    ? `${projection},category_filter:product_categories!inner(categories!inner(slug))`
    : projection;
  const products = await readProducts({
    select: selectedProjection,
    limit: String(pageSize + 1),
    offset: String((validPage - 1) * pageSize),
    order:
      filters.sort === "name-desc" ? "name.desc,id.desc" : "name.asc,id.asc",
    ...searchFilter,
    ...relationFilters,
  });
  return {
    products: products.slice(0, pageSize),
    hasNext: validPage < 1000 && products.length > pageSize,
  };
}

export async function listCatalogCategories() {
  try {
    const config = publicCatalogConfig(process.env);
    const query = new URLSearchParams({
      select: "id,slug,name",
      is_active: "eq.true",
      order: "name.asc,id.asc",
      limit: "200",
    });
    const response = await fetch(`${config.url}/rest/v1/categories?${query}`, {
      headers: { apikey: config.key },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      redirect: "error",
    });
    if (!response.ok) throw new Error("Category request failed");
    return z
      .array(publicCategorySchema)
      .max(200)
      .parse(await response.json());
  } catch {
    throw new Error("Catalog temporarily unavailable");
  }
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
