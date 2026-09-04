"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { isAllowedRequestOrigin } from "@/features/auth/validation";
import {
  catalogEditSchema,
  catalogCreateSchema,
  catalogVariantCreateSchema,
  catalogVariantEditSchema,
  catalogCategoryCreateSchema,
  catalogCategoryEditSchema,
  productCategoriesEditSchema,
  type CatalogActionState,
} from "@/features/catalog/admin";
import { requirePermission } from "@/server/permissions/staff";
import { authClient } from "@/server/auth/client";

async function verifyOrigin() {
  if (
    !isAllowedRequestOrigin(
      (await headers()).get("origin"),
      process.env.APP_ORIGIN,
    )
  )
    throw new Error("Request origin rejected");
}

function refreshCatalog() {
  revalidatePath("/admin");
  revalidatePath("/cataleg");
}

export async function updateCatalogProduct(
  _previous: CatalogActionState,
  form: FormData,
): Promise<CatalogActionState> {
  await verifyOrigin();
  const input = catalogEditSchema.safeParse({
    id: form.get("id"),
    slug: form.get("slug"),
    name: form.get("name"),
    description: form.get("description"),
    status: form.get("status"),
  });
  if (!input.success)
    return {
      ok: false,
      message: "Revisa el nom, l’adreça i l’estat del producte.",
    };
  await requirePermission("catalog.manage");
  const client = await authClient(true);
  const { error } = await client.rpc("update_catalog_product", {
    target_id: input.data.id,
    new_slug: input.data.slug,
    new_name: input.data.name,
    new_description: input.data.description,
    new_status: input.data.status,
  });
  if (error) return { ok: false, message: "No s’ha pogut desar el producte." };
  refreshCatalog();
  return { ok: true, message: "Producte desat." };
}

export async function createCatalogProduct(
  _previous: CatalogActionState,
  form: FormData,
): Promise<CatalogActionState> {
  await verifyOrigin();
  const input = catalogCreateSchema.safeParse({
    slug: form.get("slug"),
    name: form.get("name"),
    description: form.get("description"),
    sku: form.get("sku"),
    size: form.get("size"),
    color: form.get("color"),
    priceMinor: form.get("priceMinor"),
    locationId: form.get("locationId"),
  });
  if (!input.success)
    return {
      ok: false,
      message: "Revisa les dades del producte i la variant.",
    };
  await requirePermission("catalog.manage");
  await requirePermission("inventory.manage");
  const client = await authClient(true);
  const { error } = await client.rpc("create_catalog_product", {
    product_slug: input.data.slug,
    product_name: input.data.name,
    product_description: input.data.description,
    variant_sku: input.data.sku,
    variant_size: input.data.size,
    variant_color: input.data.color,
    variant_price_minor: input.data.priceMinor,
    inventory_location: input.data.locationId,
  });
  if (error)
    return {
      ok: false,
      message: "No s’ha pogut crear. Comprova que slug i SKU siguin únics.",
    };
  revalidatePath("/admin");
  return { ok: true, message: "Producte i variant creats com a esborrany." };
}

export async function createCatalogVariant(
  _previous: CatalogActionState,
  form: FormData,
): Promise<CatalogActionState> {
  await verifyOrigin();
  const input = catalogVariantCreateSchema.safeParse({
    productId: form.get("productId"),
    sku: form.get("sku"),
    size: form.get("size"),
    color: form.get("color"),
    priceMinor: form.get("priceMinor"),
    locationId: form.get("locationId"),
  });
  if (!input.success)
    return { ok: false, message: "Revisa les dades de la variant." };
  await requirePermission("catalog.manage");
  await requirePermission("inventory.manage");
  const client = await authClient(true);
  const { error } = await client.rpc("create_catalog_variant", {
    target_product: input.data.productId,
    variant_sku: input.data.sku,
    variant_size: input.data.size,
    variant_color: input.data.color,
    variant_price_minor: input.data.priceMinor,
    inventory_location: input.data.locationId,
  });
  if (error)
    return {
      ok: false,
      message: "No s’ha pogut crear. Comprova l’SKU i la combinació.",
    };
  refreshCatalog();
  return {
    ok: true,
    message: "Variant creada inactiva i amb estoc inicial zero.",
  };
}

export async function updateCatalogVariant(
  _previous: CatalogActionState,
  form: FormData,
): Promise<CatalogActionState> {
  await verifyOrigin();
  const input = catalogVariantEditSchema.safeParse({
    id: form.get("id"),
    sku: form.get("sku"),
    size: form.get("size"),
    color: form.get("color"),
    priceMinor: form.get("priceMinor"),
    isActive: form.get("isActive") ?? "false",
  });
  if (!input.success)
    return { ok: false, message: "Revisa les dades de la variant." };
  await requirePermission("catalog.manage");
  const client = await authClient(true);
  const { error } = await client.rpc("update_catalog_variant", {
    target_id: input.data.id,
    new_sku: input.data.sku,
    new_size: input.data.size,
    new_color: input.data.color,
    new_price_minor: input.data.priceMinor,
    new_is_active: input.data.isActive,
  });
  if (error) return { ok: false, message: "No s’ha pogut desar la variant." };
  refreshCatalog();
  return { ok: true, message: "Variant desada." };
}

export async function createCatalogCategory(
  _previous: CatalogActionState,
  form: FormData,
): Promise<CatalogActionState> {
  await verifyOrigin();
  const input = catalogCategoryCreateSchema.safeParse({
    slug: form.get("slug"),
    name: form.get("name"),
  });
  if (!input.success)
    return { ok: false, message: "Revisa el nom i l’adreça de la categoria." };
  await requirePermission("catalog.manage");
  const client = await authClient(true);
  const { error } = await client.rpc("create_catalog_category", {
    category_slug: input.data.slug,
    category_name: input.data.name,
  });
  if (error)
    return {
      ok: false,
      message: "No s’ha pogut crear. Comprova que l’adreça sigui única.",
    };
  refreshCatalog();
  return { ok: true, message: "Categoria creada inactiva." };
}

export async function updateCatalogCategory(
  _previous: CatalogActionState,
  form: FormData,
): Promise<CatalogActionState> {
  await verifyOrigin();
  const input = catalogCategoryEditSchema.safeParse({
    id: form.get("id"),
    slug: form.get("slug"),
    name: form.get("name"),
    isActive: form.get("isActive") ?? "false",
  });
  if (!input.success)
    return { ok: false, message: "Revisa les dades de la categoria." };
  await requirePermission("catalog.manage");
  const client = await authClient(true);
  const { error } = await client.rpc("update_catalog_category", {
    target_id: input.data.id,
    new_slug: input.data.slug,
    new_name: input.data.name,
    new_is_active: input.data.isActive,
  });
  if (error) return { ok: false, message: "No s’ha pogut desar la categoria." };
  refreshCatalog();
  return { ok: true, message: "Categoria desada." };
}

export async function updateProductCategories(
  _previous: CatalogActionState,
  form: FormData,
): Promise<CatalogActionState> {
  await verifyOrigin();
  const input = productCategoriesEditSchema.safeParse({
    productId: form.get("productId"),
    categoryIds: form.getAll("categoryIds"),
  });
  if (!input.success)
    return { ok: false, message: "Selecció de categories no vàlida." };
  await requirePermission("catalog.manage");
  const client = await authClient(true);
  const { error } = await client.rpc("set_product_categories", {
    target_product: input.data.productId,
    target_categories: input.data.categoryIds,
  });
  if (error)
    return { ok: false, message: "No s’han pogut assignar les categories." };
  refreshCatalog();
  return { ok: true, message: "Categories assignades." };
}
