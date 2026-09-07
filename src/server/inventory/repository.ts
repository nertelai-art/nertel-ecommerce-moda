import "server-only";
import { z } from "zod";
import { staffSnapshot } from "@/server/repositories/staff-snapshot";
import type { InventoryRow } from "@/features/inventory/validation";

const inventoryRowSchema = z.object({
  variant_id: z.uuid(),
  location_id: z.uuid(),
  product_id: z.uuid(),
  product_slug: z.string().min(1).max(160),
  product_name: z.string(),
  product_image_id: z.uuid().nullable(),
  sku: z.string(),
  size: z.string(),
  color: z.string(),
  location_name: z.string(),
  on_hand: z.number().int().nonnegative(),
  reserved: z.number().int().nonnegative(),
});

export async function staffInventory(): Promise<InventoryRow[]> {
  const data = await staffSnapshot("inventory");
  return z.array(inventoryRowSchema).parse(data);
}
