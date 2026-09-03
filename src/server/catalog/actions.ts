"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { isAllowedRequestOrigin } from "@/features/auth/validation";
import {
  catalogEditSchema,
  catalogCreateSchema,
  type CatalogActionState,
} from "@/features/catalog/admin";
import { requirePermission } from "@/server/permissions/staff";
import { authClient } from "@/server/auth/client";

export async function updateCatalogProduct(
  _previous: CatalogActionState,
  form: FormData,
): Promise<CatalogActionState> {
  if (
    !isAllowedRequestOrigin(
      (await headers()).get("origin"),
      process.env.APP_ORIGIN,
    )
  )
    throw new Error("Request origin rejected");
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
  revalidatePath("/admin");
  revalidatePath("/cataleg");
  return { ok: true, message: "Producte desat." };
}

export async function createCatalogProduct(
  _previous: CatalogActionState,
  form: FormData,
): Promise<CatalogActionState> {
  if (
    !isAllowedRequestOrigin(
      (await headers()).get("origin"),
      process.env.APP_ORIGIN,
    )
  )
    throw new Error("Request origin rejected");
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
