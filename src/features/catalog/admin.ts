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
export type StaffCatalogRow = z.infer<typeof staffCatalogRowSchema>;
export type CatalogActionState = { ok: boolean; message: string };
