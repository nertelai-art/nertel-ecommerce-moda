import "server-only";
import { z } from "zod";
import {
  staffCustomerSchema,
  type StaffCustomer,
} from "@/features/customers/admin";
import { authClient } from "@/server/auth/client";

export async function staffCustomers(): Promise<StaffCustomer[]> {
  const client = await authClient();
  const { data, error } = await client.rpc("staff_customers");
  if (error) throw new Error("Unable to load customers");
  return z.array(staffCustomerSchema).parse(data);
}
