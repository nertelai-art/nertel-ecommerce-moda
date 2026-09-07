import "server-only";
import { z } from "zod";
import { staffSnapshot } from "@/server/repositories/staff-snapshot";
import { supplierSchema, type Supplier } from "@/features/suppliers/validation";
export async function staffSuppliers(): Promise<Supplier[]> {
  const data = await staffSnapshot("suppliers");
  return z.array(supplierSchema).parse(data);
}
