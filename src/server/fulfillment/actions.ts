"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { isAllowedRequestOrigin } from "@/features/auth/validation";
import {
  advanceShipmentSchema,
  createShipmentSchema,
  type FulfillmentState,
} from "@/features/fulfillment/validation";
import { authClient } from "@/server/auth/client";
import { requirePermission } from "@/server/permissions/staff";
async function authorized() {
  if (
    !isAllowedRequestOrigin(
      (await headers()).get("origin"),
      process.env.APP_ORIGIN,
    )
  )
    throw new Error("Request origin rejected");
  await requirePermission("orders.fulfill");
  return authClient(true);
}
export async function createShipment(
  _s: FulfillmentState,
  f: FormData,
): Promise<FulfillmentState> {
  const i = createShipmentSchema.safeParse({
    orderId: f.get("orderId"),
    notes: f.get("notes"),
  });
  if (!i.success) return { ok: false, message: "Revisa les dades." };
  const c = await authorized();
  const { error } = await c.rpc("create_shipment", {
    target_order: i.data.orderId,
    new_notes: i.data.notes,
  });
  if (error)
    return {
      ok: false,
      message: "Només es poden preparar comandes pagades sense expedició.",
    };
  revalidatePath("/admin/enviaments");
  return { ok: true, message: "Expedició creada." };
}
export async function advanceShipment(
  _s: FulfillmentState,
  f: FormData,
): Promise<FulfillmentState> {
  const i = advanceShipmentSchema.safeParse({
    shipmentId: f.get("shipmentId"),
    status: f.get("status"),
    carrier: f.get("carrier"),
    tracking: f.get("tracking"),
    note: f.get("note"),
  });
  if (!i.success) return { ok: false, message: "Revisa les dades." };
  const c = await authorized();
  const d = i.data;
  const { error } = await c.rpc("advance_shipment", {
    target_shipment: d.shipmentId,
    new_status: d.status,
    new_carrier: d.carrier,
    new_tracking_number: d.tracking,
    event_note: d.note,
  });
  if (error)
    return { ok: false, message: "Transició no vàlida o seguiment incomplet." };
  revalidatePath("/admin/enviaments");
  return { ok: true, message: "Estat actualitzat." };
}
