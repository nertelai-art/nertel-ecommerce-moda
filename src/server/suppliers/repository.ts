import "server-only";
import { z } from "zod";
import { authClient } from "@/server/auth/client";
import { supplierSchema, type Supplier } from "@/features/suppliers/validation";
export async function staffSuppliers(): Promise<Supplier[]> {
  const client = await authClient();
  const { data, error } = await client.rpc("staff_suppliers");
  if (error) throw new Error("Unable to load suppliers");
  return z.array(supplierSchema).parse(data);
}
