import { z } from "zod";

const orderItemSchema = z.object({
  id: z.uuid(),
  variantId: z.uuid(),
  sku: z.string(),
  productName: z.string(),
  size: z.string(),
  color: z.string(),
  unitPriceMinor: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  lineTotalMinor: z.number().int().nonnegative(),
  currency: z.string().length(3),
  productImageId: z.uuid().nullable(),
});

export const staffOrderSchema = z.object({
  id: z.uuid(),
  status: z.enum(["pending_payment", "paid", "cancelled", "expired"]),
  email: z.email(),
  shipping_address: z.object({
    recipient: z.string().optional().default(""),
    line1: z.string().optional().default(""),
    line2: z.string().optional().default(""),
    city: z.string().optional().default(""),
    region: z.string().optional().default(""),
    postalCode: z.string().optional().default(""),
    countryCode: z.string().optional().default(""),
  }),
  amount_minor: z.number().int().nonnegative(),
  currency: z.string().length(3),
  payment_status: z
    .enum([
      "requires_provider",
      "processing",
      "succeeded",
      "failed",
      "cancelled",
    ])
    .nullable(),
  expires_at: z.iso.datetime({ offset: true }),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  items: z.array(orderItemSchema),
});

export type StaffOrder = z.infer<typeof staffOrderSchema>;

export const orderStatusCopy: Record<StaffOrder["status"], string> = {
  pending_payment: "Pendent de pagament",
  paid: "Pagada",
  cancelled: "Cancel·lada",
  expired: "Caducada",
};

export const paymentStatusCopy: Record<
  NonNullable<StaffOrder["payment_status"]>,
  string
> = {
  requires_provider: "Pendent de passarel·la",
  processing: "Processant",
  succeeded: "Confirmat",
  failed: "Fallat",
  cancelled: "Cancel·lat",
};
