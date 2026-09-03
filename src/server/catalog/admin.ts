import "server-only";
import { z } from "zod";
import { authClient } from "@/server/auth/client";
import { staffCatalogRowSchema } from "@/features/catalog/admin";

export async function staffCatalog() {
  const client = await authClient();
  const { data, error } = await client.rpc("staff_catalog");
  if (error) throw new Error("Unable to load staff catalog");
  return z.array(staffCatalogRowSchema).parse(data);
}
