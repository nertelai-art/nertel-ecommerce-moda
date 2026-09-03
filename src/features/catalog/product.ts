import { z } from "zod";

export type ProductStatus = "draft" | "published" | "archived";
export const productSlugSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const catalogPageSchema = z.coerce.number().int().min(1).max(1000);

export const catalogProductSchema = z
  .object({
    id: z.uuid(),
    slug: productSlugSchema,
    name: z.string().min(1).max(240),
    description: z.string().max(20000),
    product_variants: z
      .array(
        z.object({
          id: z.uuid(),
          size: z.string(),
          color: z.string(),
          price_minor: z
            .number()
            .int()
            .nonnegative()
            .max(Number.MAX_SAFE_INTEGER),
          currency: z.literal("EUR"),
        }),
      )
      .max(200),
  })
  .transform(({ product_variants, ...product }) => ({
    ...product,
    variants: product_variants.map((variant) => ({
      id: variant.id,
      size: variant.size,
      color: variant.color,
      price: { amountMinor: variant.price_minor, currency: variant.currency },
    })),
  }));

/** DTO públic validat: sense SKU interns, costos, estoc ni notes. */
export type CatalogProduct = z.output<typeof catalogProductSchema>;

export function displayPrice(product: CatalogProduct): string {
  if (product.variants.length === 0) return "Preu pendent";
  const amount = Math.min(
    ...product.variants.map((variant) => variant.price.amountMinor),
  );
  const formatted = new Intl.NumberFormat("ca-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount / 100);
  return product.variants.some(
    (variant) => variant.price.amountMinor !== amount,
  )
    ? `Des de ${formatted}`
    : formatted;
}
