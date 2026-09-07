import "server-only";
import { z } from "zod";
import { staffOrderSchema, type StaffOrder } from "@/features/orders/admin";
import { staffSnapshot } from "@/server/repositories/staff-snapshot";

export async function staffOrders(): Promise<StaffOrder[]> {
  const data = await staffSnapshot("orders");
  return z.array(staffOrderSchema).parse(data);
}
