import "server-only";
import { z } from "zod";
import { staffOrderSchema, type StaffOrder } from "@/features/orders/admin";
import { authClient } from "@/server/auth/client";

export async function staffOrders(): Promise<StaffOrder[]> {
  const client = await authClient();
  const { data, error } = await client.rpc("staff_orders");
  if (error) throw new Error("Unable to load orders");
  return z.array(staffOrderSchema).parse(data);
}
