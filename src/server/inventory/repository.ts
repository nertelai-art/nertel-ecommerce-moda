import "server-only";
import { z } from "zod";
import { authClient } from "@/server/auth/client";
import type { InventoryRow } from "@/features/inventory/validation";

const inventoryRowSchema = z.object({
  variant_id: z.uuid(),
  location_id: z.uuid(),
  product_name: z.string(),
  sku: z.string(),
  size: z.string(),
  color: z.string(),
  location_name: z.string(),
  on_hand: z.number().int().nonnegative(),
  reserved: z.number().int().nonnegative(),
});

export async function staffInventory(): Promise<InventoryRow[]> {
  const client = await authClient();
  const { data, error } = await client.rpc("staff_inventory");
  if (error) throw new Error("Unable to load inventory");
  return z.array(inventoryRowSchema).parse(data);
}
