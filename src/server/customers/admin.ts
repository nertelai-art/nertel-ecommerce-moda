import "server-only";
import { z } from "zod";
import {
  staffCustomerSchema,
  type StaffCustomer,
} from "@/features/customers/admin";
import { staffSnapshot } from "@/server/repositories/staff-snapshot";

export async function staffCustomers(): Promise<StaffCustomer[]> {
  const data = await staffSnapshot("customers");
  return z.array(staffCustomerSchema).parse(data);
}
