import { z } from "zod";

export const inventoryAdjustmentSchema = z.object({
  variantId: z.uuid(),
  locationId: z.uuid(),
  quantity: z.coerce.number().int().min(-100000).max(100000).refine(Boolean),
  reason: z.string().trim().min(1).max(500),
  idempotencyKey: z.uuid(),
});

export type InventoryActionState = { ok: boolean; message: string };
export type InventoryRow = {
  variant_id: string;
  location_id: string;
  product_id: string;
  product_slug: string;
  product_name: string;
  product_image_id: string | null;
  sku: string;
  size: string;
  color: string;
  location_name: string;
  on_hand: number;
  reserved: number;
};
