import "server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { publicCatalogConfig } from "./public-config";
import type { Database } from "@/types/database.generated";

export function commerceClient() {
  const { url } = publicCatalogConfig(process.env);
  const key = z.string().min(1).parse(process.env.SUPABASE_SECRET_KEY);
  if (!key.startsWith("sb_secret_")) {
    const payload = key.split(".")[1];
    if (
      !payload ||
      JSON.parse(Buffer.from(payload, "base64url").toString()).role !==
        "service_role"
    )
      throw new Error("Invalid server-only Supabase credential");
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        }),
    },
  });
}
