import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicCatalogConfig } from "@/server/integrations/supabase/public-config";
import { trustedOrigin } from "@/features/auth/validation";

export async function refreshAuth(request: NextRequest, headers: Headers) {
  let response = NextResponse.next({ request: { headers } });
  if (!/^\/(auth|compte|admin)(\/|$)/.test(request.nextUrl.pathname))
    return response;
  const config = publicCatalogConfig(process.env);
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure:
      process.env.NODE_ENV === "production" ||
      trustedOrigin(process.env.APP_ORIGIN).startsWith("https:"),
    path: "/",
  };
  const client = createServerClient(config.url, config.key, {
    cookieOptions,
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        }),
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(items, extraHeaders) {
        for (const { name, value } of items) request.cookies.set(name, value);
        headers.set("cookie", request.cookies.toString());
        response = NextResponse.next({ request: { headers } });
        for (const { name, value, options } of items)
          response.cookies.set(name, value, { ...options, ...cookieOptions });
        for (const [name, value] of Object.entries(extraHeaders ?? {}))
          response.headers.set(name, value);
      },
    },
  });
  await client.auth.getClaims();
  return response;
}
