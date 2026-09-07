import { NextResponse } from "next/server";
import { isAllowedRequestOrigin } from "@/features/auth/validation";
import {
  reservationInputSchema,
  reservationResultSchema,
} from "@/features/cart/cart-input";
import { authClient, authCookieOptions } from "@/server/auth/client";
import { commerceClient } from "@/server/integrations/supabase/commerce-client";
import { commerceRateKey, readJsonBody } from "@/server/http/request";
import {
  checkoutSessionCookie,
  checkoutSessionOrCreate,
} from "@/server/checkout/session";

export async function POST(request: Request) {
  if (
    !isAllowedRequestOrigin(
      request.headers.get("origin"),
      process.env.APP_ORIGIN,
    )
  )
    return new Response("Forbidden", { status: 403 });
  let body: unknown;
  try {
    body = await readJsonBody(request, 16 * 1024);
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }
  const input = reservationInputSchema.safeParse(body);
  if (!input.success) return new Response("Invalid cart", { status: 400 });
  const identityClient = await authClient(true);
  const { data: identity } = await identityClient.auth.getUser();
  const client = commerceClient();
  const sessionToken = checkoutSessionOrCreate(request);
  const rateKey = commerceRateKey(request, sessionToken);
  if (rateKey instanceof Response) return rateKey;
  const { data, error } = await client.rpc("server_reserve_cart", {
    cart: input.data.items,
    request_key: input.data.requestKey,
    session_token: sessionToken,
    actor_id: identity.user?.id ?? null,
    rate_key: rateKey,
  });
  const result = reservationResultSchema.safeParse(data);
  if (error || !result.success)
    return new Response("Stock unavailable", { status: 409 });
  const response = NextResponse.json(result.data, {
    headers: { "Cache-Control": "private, no-store" },
  });
  response.cookies.set(checkoutSessionCookie, sessionToken, {
    ...authCookieOptions(),
    maxAge: 15 * 60,
  });
  return response;
}
