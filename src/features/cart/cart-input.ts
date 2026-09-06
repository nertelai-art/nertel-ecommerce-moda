import { z } from "zod";
import { currencyCodeSchema } from "../shop/settings";

// Límit tècnic provisional; el servidor també comprovarà el límit comercial i l'estoc.
export const cartItemInputSchema = z.strictObject({
  variantId: z.uuid(),
  quantity: z.number().int().min(1).max(99),
});

export const cartInputSchema = z
  .strictObject({
    items: z.array(cartItemInputSchema).min(1).max(100),
  })
  .superRefine(({ items }, context) => {
    const variants = new Set<string>();
    for (const item of items) {
      if (variants.has(item.variantId)) {
        context.addIssue({ code: "custom", message: "Duplicate variant" });
      }
      variants.add(item.variantId);
    }
  });

export type CartInput = z.infer<typeof cartInputSchema>;

export const cartQuoteSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.uuid(),
        slug: z.string(),
        name: z.string(),
        size: z.string(),
        color: z.string(),
        unitPriceMinor: z.number().int().nonnegative(),
        currency: currencyCodeSchema,
        quantity: z.number().int().min(1).max(99),
        lineTotalMinor: z.number().int().nonnegative(),
        available: z.boolean(),
      }),
    )
    .max(100),
  totalMinor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  currency: currencyCodeSchema,
});
export const reservationInputSchema = cartInputSchema.extend({
  requestKey: z.uuid(),
});
export const reservationResultSchema = z.object({
  status: z.enum(["open", "reserved", "cancelled", "converted", "expired"]),
  expiresAt: z.string().datetime({ offset: true }),
  items: z.array(cartItemInputSchema).max(100),
});
export type CartQuote = z.infer<typeof cartQuoteSchema>;

export const checkoutDetailsSchema = z.strictObject({
  email: z.email().max(320),
  recipient: z.string().trim().min(1).max(120),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200),
  city: z.string().trim().min(1).max(120),
  region: z.string().trim().max(120),
  postalCode: z.string().trim().min(1).max(32),
  countryCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/),
});

export const pendingOrderInputSchema = z.strictObject({
  requestKey: z.uuid(),
  details: checkoutDetailsSchema,
});

export const pendingOrderResultSchema = z.object({
  orderId: z.uuid(),
  paymentAttemptId: z.uuid(),
  status: z.enum(["pending_payment", "paid", "cancelled", "expired"]),
  paymentStatus: z.enum([
    "requires_provider",
    "processing",
    "succeeded",
    "failed",
    "cancelled",
  ]),
  amountMinor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  currency: currencyCodeSchema,
  expiresAt: z.string().datetime({ offset: true }),
});

export type PendingOrderResult = z.infer<typeof pendingOrderResultSchema>;
