import "server-only";
import { z } from "zod";
import { cache } from "react";
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
const catalogFiltersSchema = z.object({
  sizes: z.array(z.string()),
  colors: z.array(z.string()),
  categories: z.array(publicCategorySchema),
});
const catalogRequestTimeoutMs = 10_000;

async function fetchCatalogResource(url: string, key: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { apikey: key },
        cache: "no-store",
        signal: AbortSignal.timeout(catalogRequestTimeoutMs),
        redirect: "error",
      });
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === 1) return response;
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }
  throw new Error("Catalog request unavailable");
}

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
    const response = await fetchCatalogResource(
      `${config.url}/rest/v1/products?${query}`,
      config.key,
    );
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
  const variantFilters = {
    ...(filters.size ? { "variant_filter.size": `eq.${filters.size}` } : {}),
    ...(filters.color ? { "variant_filter.color": `eq.${filters.color}` } : {}),
    ...(filters.price === "under-60"
      ? { "variant_filter.price_minor": "lt.6000" }
      : filters.price === "60-80"
        ? {
            "variant_filter.and": "(price_minor.gte.6000,price_minor.lte.8000)",
          }
        : filters.price === "over-80"
          ? { "variant_filter.price_minor": "gt.8000" }
          : {}),
  };
  const hasVariantFilter = Boolean(
    filters.size || filters.color || filters.price,
  );
  const selectedProjection = [
    projection,
    filters.category
      ? "category_filter:product_categories!inner(categories!inner(slug))"
      : "",
    hasVariantFilter ? "variant_filter:product_variants!inner(id)" : "",
  ]
    .filter(Boolean)
    .join(",");
  const products = await readProducts({
    select: selectedProjection,
    limit: String(pageSize + 1),
    offset: String((validPage - 1) * pageSize),
    order:
      filters.sort === "name-desc" ? "name.desc,id.desc" : "name.asc,id.asc",
    ...searchFilter,
    ...relationFilters,
    ...variantFilters,
  });
  return {
    products: products.slice(0, pageSize),
    hasNext: validPage < 1000 && products.length > pageSize,
  };
}

const readCatalogFilters = cache(async function readCatalogFilters() {
  const config = publicCatalogConfig(process.env);
  const response = await fetchCatalogResource(
    `${config.url}/rest/v1/rpc/catalog_filters`,
    config.key,
  );
  if (!response.ok) throw new Error("Catalog filters unavailable");
  return catalogFiltersSchema.parse(await response.json());
});

export async function listCatalogFacets() {
  const { sizes, colors } = await readCatalogFilters();
  return { sizes, colors };
}

export async function listCatalogCategories() {
  return (await readCatalogFilters()).categories;
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
