import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicCatalogConfig } from "@/server/integrations/supabase/public-config";
import { trustedOrigin } from "@/features/auth/validation";
import type { Database } from "@/types/database.generated";

export function authCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: trustedOrigin(process.env.APP_ORIGIN).startsWith("https:"),
    path: "/",
  };
}

export async function authClient(writable = false) {
  const store = await cookies();
  const config = publicCatalogConfig(process.env);
  return createServerClient<Database>(config.url, config.key, {
    cookieOptions: authCookieOptions(),
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        }),
    },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (items) => {
        // The proxy refreshes read-only Server Component sessions.
        if (writable)
          for (const { name, value, options } of items)
            store.set(name, value, { ...options, ...authCookieOptions() });
      },
    },
  });
}
