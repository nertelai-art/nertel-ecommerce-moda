"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { isAllowedRequestOrigin } from "@/features/auth/validation";
import {
  productImageDeleteSchema,
  productImageEditSchema,
} from "@/features/catalog/image";
import type { CatalogActionState } from "@/features/catalog/admin";
import { requirePermission } from "@/server/permissions/staff";
import { authClient } from "@/server/auth/client";

async function authorize() {
  if (
    !isAllowedRequestOrigin(
      (await headers()).get("origin"),
      process.env.APP_ORIGIN,
    )
  )
    throw new Error("Request origin rejected");
  await requirePermission("catalog.manage");
}

function refreshImages() {
  revalidatePath("/admin");
  revalidatePath("/cataleg");
}

export async function updateCatalogImage(
  _previous: CatalogActionState,
  form: FormData,
): Promise<CatalogActionState> {
  await authorize();
  const input = productImageEditSchema.safeParse({
    id: form.get("id"),
    altText: form.get("altText"),
    sortOrder: form.get("sortOrder"),
  });
  if (!input.success)
    return { ok: false, message: "Revisa el text alternatiu i l’ordre." };
  const client = await authClient(true);
  const { error } = await client.rpc("update_catalog_image", {
    target_id: input.data.id,
    new_alt_text: input.data.altText,
    new_sort_order: input.data.sortOrder,
  });
  if (error)
    return { ok: false, message: "No s’ha pogut desar la fotografia." };
  refreshImages();
  return { ok: true, message: "Fotografia actualitzada." };
}

export async function deleteCatalogImage(
  _previous: CatalogActionState,
  form: FormData,
): Promise<CatalogActionState> {
  await authorize();
  const input = productImageDeleteSchema.safeParse({ id: form.get("id") });
  if (!input.success) return { ok: false, message: "Fotografia no vàlida." };
  const client = await authClient(true);
  const { data: objectPath, error } = await client.rpc("delete_catalog_image", {
    target_id: input.data.id,
  });
  if (error || !objectPath)
    return { ok: false, message: "No s’ha pogut eliminar la fotografia." };
  const { error: storageError } = await client.storage
    .from("product-images")
    .remove([objectPath]);
  if (storageError)
    await client.rpc("queue_product_image_cleanup", {
      object_path: objectPath,
    });
  refreshImages();
  return storageError
    ? {
        ok: false,
        message: "Metadades eliminades; l’arxiu orfe requereix neteja.",
      }
    : { ok: true, message: "Fotografia eliminada." };
}
