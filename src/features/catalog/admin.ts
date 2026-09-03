import { z } from "zod";
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
export const catalogCreateSchema = z.object({
  slug: productSlugSchema,
  name: z.string().trim().min(1).max(160),
  description: z.string().max(10000),
  sku: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[A-Z0-9][A-Z0-9._-]*$/),
  size: z.string().trim().min(1).max(40),
  color: z.string().trim().min(1).max(80),
  priceMinor: z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  locationId: z.uuid(),
});
export type StaffCatalogRow = z.infer<typeof staffCatalogRowSchema>;
export type CatalogActionState = { ok: boolean; message: string };
