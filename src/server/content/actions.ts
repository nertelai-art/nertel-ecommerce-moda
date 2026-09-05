"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  contentFromForm,
  type ContentActionState,
} from "@/features/content/storefront";
import { isAllowedRequestOrigin } from "@/features/auth/validation";
import { authClient } from "@/server/auth/client";
import { requirePermission } from "@/server/permissions/staff";
async function authorize() {
  if (
    !isAllowedRequestOrigin(
      (await headers()).get("origin"),
      process.env.APP_ORIGIN,
    )
  )
    throw new Error("Request origin rejected");
  await requirePermission("content.manage");
}
export async function saveStorefrontDraft(
  _state: ContentActionState,
  form: FormData,
): Promise<ContentActionState> {
  await authorize();
  const input = contentFromForm(form);
  if (!input.success)
    return {
      ok: false,
      message: "Revisa els camps: hi ha text buit o massa llarg.",
    };
  const client = await authClient(true);
  const { error } = await client.rpc("save_storefront_draft", {
    new_content: input.data,
  });
  if (error) return { ok: false, message: "No s’ha pogut desar l’esborrany." };
  revalidatePath("/admin/contingut");
  return { ok: true, message: "Esborrany desat. Encara no és públic." };
}
export async function publishStorefrontContent(): Promise<void> {
  await authorize();
  const client = await authClient(true);
  const { error } = await client.rpc("publish_storefront_content");
  if (error) throw new Error("Unable to publish storefront content");
  revalidatePath("/");
  revalidatePath("/admin/contingut");
}
