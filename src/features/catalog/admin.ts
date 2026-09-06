import { z } from "zod";
import { currencyCodeSchema } from "../shop/settings";
import { productSlugSchema } from "./product";

export const catalogStatusSchema = z.enum(["draft", "published", "archived"]);
export const catalogEditSchema = z.object({
  id: z.uuid(),
  slug: productSlugSchema,
  name: z.string().trim().min(1).max(160),
  description: z.string().max(10000),
  status: catalogStatusSchema,
});
export const staffCatalogRowSchema = catalogEditSchema;
const variantFields = {
  sku: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[A-Z0-9][A-Z0-9._-]*$/),
  size: z.string().trim().min(1).max(40),
  color: z.string().trim().min(1).max(80),
  priceMinor: z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
};
export const catalogCreateSchema = z.object({
  slug: productSlugSchema,
  name: z.string().trim().min(1).max(160),
  description: z.string().max(10000),
  ...variantFields,
  locationId: z.uuid(),
});
export const catalogVariantCreateSchema = z.object({
  productId: z.uuid(),
  ...variantFields,
  locationId: z.uuid(),
});
export const catalogVariantEditSchema = z.object({
  id: z.uuid(),
  ...variantFields,
  isActive: z.enum(["true", "false"]).transform((value) => value === "true"),
});
export const staffCatalogVariantSchema = z.object({
  id: z.uuid(),
  product_id: z.uuid(),
  sku: variantFields.sku,
  size: variantFields.size,
  color: variantFields.color,
  price_minor: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  currency: currencyCodeSchema,
  is_active: z.boolean(),
});
export const catalogCategoryCreateSchema = z.object({
  slug: productSlugSchema,
  name: z.string().trim().min(1).max(120),
});
export const catalogCategoryEditSchema = catalogCategoryCreateSchema.extend({
  id: z.uuid(),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true"),
});
export const staffCategorySchema = z.object({
  id: z.uuid(),
  slug: productSlugSchema,
  name: z.string().min(1).max(120),
  is_active: z.boolean(),
});
export const staffProductCategorySchema = z.object({
  product_id: z.uuid(),
  category_id: z.uuid(),
});
export const productCategoriesEditSchema = z.object({
  productId: z.uuid(),
  categoryIds: z.array(z.uuid()).max(100),
});
export type StaffCatalogRow = z.infer<typeof staffCatalogRowSchema>;
export type StaffCatalogVariant = z.infer<typeof staffCatalogVariantSchema>;
export type StaffCategory = z.infer<typeof staffCategorySchema>;
export type CatalogActionState = { ok: boolean; message: string };
