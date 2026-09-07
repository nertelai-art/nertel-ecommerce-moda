import "server-only";
import { z } from "zod";
import { staffSnapshot } from "@/server/repositories/staff-snapshot";
import {
  staffCatalogRowSchema,
  staffCatalogVariantSchema,
  staffCategorySchema,
  staffProductCategorySchema,
} from "@/features/catalog/admin";
import { staffCatalogImageSchema } from "@/features/catalog/image";

export async function staffCatalog() {
  const data = await staffSnapshot("catalog");
  return z.array(staffCatalogRowSchema).parse(data);
}

export async function staffCatalogDetails() {
  const [variants, categories, assignments, images] = await Promise.all([
    staffSnapshot("variants"),
    staffSnapshot("categories"),
    staffSnapshot("assignments"),
    staffSnapshot("images"),
  ]);
  return {
    variants: z.array(staffCatalogVariantSchema).parse(variants),
    categories: z.array(staffCategorySchema).parse(categories),
    assignments: z.array(staffProductCategorySchema).parse(assignments),
    images: z.array(staffCatalogImageSchema).parse(images),
  };
}
