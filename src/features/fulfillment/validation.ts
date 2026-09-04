import { z } from "zod";
export const shipmentStatusSchema = z.enum([
  "pending",
  "packing",
  "ready",
  "shipped",
  "delivered",
]);
const address = z.object({
  recipient: z.string().optional().default(""),
  line1: z.string().optional().default(""),
  line2: z.string().optional().default(""),
  city: z.string().optional().default(""),
  region: z.string().optional().default(""),
  postalCode: z.string().optional().default(""),
  countryCode: z.string().optional().default(""),
});
const item = z.object({
  name: z.string(),
  sku: z.string(),
  size: z.string(),
  color: z.string(),
  quantity: z.number().int().positive(),
});
const event = z.object({
  fromStatus: shipmentStatusSchema.nullable(),
  toStatus: shipmentStatusSchema,
  note: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
});
export const fulfillmentRowSchema = z.object({
  order_id: z.uuid(),
  email: z.email(),
  shipping_address: address,
  amount_minor: z.number().int().nonnegative(),
  currency: z.string().length(3),
  created_at: z.iso.datetime({ offset: true }),
  items: z.array(item),
  shipment_id: z.uuid().nullable(),
  shipment_status: shipmentStatusSchema.nullable(),
  carrier: z.string().nullable(),
  tracking_number: z.string().nullable(),
  notes: z.string().nullable(),
  events: z.array(event),
});
export type FulfillmentRow = z.infer<typeof fulfillmentRowSchema>;
export type FulfillmentState = { ok: boolean; message: string };
export const createShipmentSchema = z.object({
  orderId: z.uuid(),
  notes: z.string().trim().max(1000),
});
export const advanceShipmentSchema = z.object({
  shipmentId: z.uuid(),
  status: shipmentStatusSchema,
  carrier: z.string().trim().max(120),
  tracking: z.string().trim().max(160),
  note: z.string().trim().max(1000),
});
export const shipmentCopy: Record<
  z.infer<typeof shipmentStatusSchema>,
  string
> = {
  pending: "Pendent",
  packing: "Preparant",
  ready: "Llesta",
  shipped: "Enviada",
  delivered: "Entregada",
};
