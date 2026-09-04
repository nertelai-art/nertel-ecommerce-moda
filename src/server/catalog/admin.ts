import "server-only";
import { z } from "zod";
import { authClient } from "@/server/auth/client";
import {
  staffCatalogRowSchema,
  staffCatalogVariantSchema,
  staffCategorySchema,
  staffProductCategorySchema,
} from "@/features/catalog/admin";
import { staffCatalogImageSchema } from "@/features/catalog/image";

export async function staffCatalog() {
  const client = await authClient();
  const { data, error } = await client.rpc("staff_catalog");
  if (error) throw new Error("Unable to load staff catalog");
  return z.array(staffCatalogRowSchema).parse(data);
}

export async function staffCatalogDetails() {
  const client = await authClient();
  const [variants, categories, assignments, images] = await Promise.all([
    client.rpc("staff_catalog_variants"),
    client.rpc("staff_categories"),
    client.rpc("staff_product_categories"),
    client.rpc("staff_catalog_images"),
  ]);
  if (variants.error || categories.error || assignments.error || images.error)
    throw new Error("Unable to load catalog details");
  return {
    variants: z.array(staffCatalogVariantSchema).parse(variants.data),
    categories: z.array(staffCategorySchema).parse(categories.data),
    assignments: z.array(staffProductCategorySchema).parse(assignments.data),
    images: z.array(staffCatalogImageSchema).parse(images.data),
  };
}
