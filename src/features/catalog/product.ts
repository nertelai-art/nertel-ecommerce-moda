import { z } from "zod";

export type ProductStatus = "draft" | "published" | "archived";
export const productSlugSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const catalogPageSchema = z.coerce.number().int().min(1).max(1000);
export const catalogSearchSchema = z
  .string()
  .trim()
  .max(80)
  .regex(/^[\p{L}\p{N} '\-]*$/u);
export const catalogSortSchema = z.enum(["name-asc", "name-desc"]);
export const catalogFacetSchema = z
  .string()
  .trim()
  .max(40)
  .regex(/^[\p{L}\p{N} .'-]*$/u);
export const catalogPriceSchema = z.enum(["", "under-60", "60-80", "over-80"]);
export const catalogQuerySchema = z.object({
  page: catalogPageSchema.default(1),
  query: catalogSearchSchema.default(""),
  category: z.union([productSlugSchema, z.literal("")]).default(""),
  size: catalogFacetSchema.default(""),
  color: catalogFacetSchema.default(""),
  price: catalogPriceSchema.default(""),
  sort: catalogSortSchema.default("name-asc"),
});

export const publicCategorySchema = z.object({
  id: z.uuid(),
  slug: productSlugSchema,
  name: z.string().min(1).max(120),
});

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
    product_categories: z
      .array(
        z.object({
          categories: publicCategorySchema,
        }),
      )
      .max(100),
    product_images: z
      .array(
        z.object({
          id: z.uuid(),
          alt_text: z.string().min(1).max(240),
          sort_order: z.number().int().min(0).max(99),
        }),
      )
      .max(20),
  })
  .transform(
    ({ product_variants, product_categories, product_images, ...product }) => ({
      ...product,
      variants: product_variants.map((variant) => ({
        id: variant.id,
        size: variant.size,
        color: variant.color,
        price: { amountMinor: variant.price_minor, currency: variant.currency },
      })),
      categories: product_categories.map(({ categories }) => categories),
      images: product_images.map((image) => ({
        id: image.id,
        altText: image.alt_text,
      })),
    }),
  );

/** DTO públic validat: sense SKU interns, costos, estoc ni notes. */
export type CatalogProduct = z.output<typeof catalogProductSchema>;
export type CatalogQuery = z.output<typeof catalogQuerySchema>;

export function demoProductImage(slug: string): string | undefined {
  return demoImages[slug as keyof typeof demoImages];
}

export function demoProductImageByName(name: string): string | undefined {
  return demoProductImage(
    name
      .toLocaleLowerCase("ca")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
  );
}

const demoImages = {
  "vestit-alba": "/products/vestit-alba.png",
  "camisa-brisa": "/products/camisa-brisa.png",
  "pantalons-ona": "/products/pantalons-ona.png",
  "jaqueta-terra": "/products/jaqueta-terra.png",
  "sobrecamisa-bosc": "/products/sobrecamisa-bosc.png",
  "pantalons-calc": "/products/pantalons-calc.png",
  "mocador-argila": "/products/mocador-argila.png",
  "bossa-nus": "/products/bossa-nus.png",
} as const;

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
