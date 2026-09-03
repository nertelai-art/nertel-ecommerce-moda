"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  inventoryAdjustmentSchema,
  type InventoryActionState,
} from "@/features/inventory/validation";
import { isAllowedRequestOrigin } from "@/features/auth/validation";
import { authClient } from "@/server/auth/client";
import { requirePermission } from "@/server/permissions/staff";

export async function adjustInventory(
  _previous: InventoryActionState,
  form: FormData,
): Promise<InventoryActionState> {
  if (
    !isAllowedRequestOrigin(
      (await headers()).get("origin"),
      process.env.APP_ORIGIN,
    )
  )
    throw new Error("Request origin rejected");

  const input = inventoryAdjustmentSchema.safeParse({
    variantId: form.get("variantId"),
    locationId: form.get("locationId"),
    quantity: form.get("quantity"),
    reason: form.get("reason"),
    idempotencyKey: form.get("idempotencyKey"),
  });
  if (!input.success)
    return { ok: false, message: "Revisa la quantitat i el motiu." };

  await requirePermission("inventory.manage");
  const client = await authClient(true);
  const { error } = await client.rpc("adjust_inventory", {
    target_variant: input.data.variantId,
    target_location: input.data.locationId,
    quantity_change: input.data.quantity,
    movement_reason: input.data.reason,
    idempotency_key: input.data.idempotencyKey,
  });
  if (error)
    return {
      ok: false,
      message: "No s’ha pogut ajustar l’estoc. Comprova la disponibilitat.",
    };
  revalidatePath("/admin");
  return { ok: true, message: "Estoc actualitzat i moviment registrat." };
}
