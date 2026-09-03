"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { isAllowedRequestOrigin } from "@/features/auth/validation";
import {
  catalogEditSchema,
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
