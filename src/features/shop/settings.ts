import { z } from "zod";

/** Codi ISO 4217. La moneda és dada de la instància, mai una constant del codi. */
export const currencyCodeSchema = z.string().regex(/^[A-Z]{3}$/);

export const shopSettingsSchema = z.object({
  shop_name: z.string().trim().min(1).max(120),
  currency: currencyCodeSchema,
  country_code: z.string().regex(/^[A-Z]{2}$/),
});

export type ShopSettings = z.infer<typeof shopSettingsSchema>;

/**
 * Format de preu a partir de la moneda de la instància. La localització es
 * manté en català perquè és la llengua de la interfície, no del mercat.
 */
export function formatPrice(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat("ca-ES", {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}
