import "server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  defaultStorefrontContent,
  storefrontContentSchema,
} from "@/features/content/storefront";
import { publicCatalogConfig } from "@/server/integrations/supabase/public-config";
import { authClient } from "@/server/auth/client";
import type { Database } from "@/types/database.generated";

export async function publishedStorefrontContent() {
  try {
    const { url, key } = publicCatalogConfig(process.env);
    const client = createClient<Database>(url, key, {
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
    const { data, error } = await client
      .from("storefront_content")
      .select("content")
      .eq("singleton", true)
      .single();
    if (error) throw error;
    return storefrontContentSchema.parse(data.content);
  } catch {
    console.error("published_storefront_content_unavailable");
    return defaultStorefrontContent;
  }
}
export async function staffStorefrontContent() {
  const client = await authClient();
  const { data, error } = await client.rpc("staff_storefront_content");
  if (error) throw new Error("Unable to load storefront editor");
  return z
    .object({
      draft: storefrontContentSchema,
      published: storefrontContentSchema,
      updated_at: z.iso.datetime({ offset: true }),
      published_at: z.iso.datetime({ offset: true }),
    })
    .parse(data[0]);
}
