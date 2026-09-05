import { NextResponse } from "next/server";
import { isAllowedRequestOrigin } from "@/features/auth/validation";
import { authClient, authCookieOptions } from "@/server/auth/client";
import { commerceClient } from "@/server/integrations/supabase/commerce-client";
import { commerceRateKey } from "@/server/http/request";
import {
  checkoutSessionCookie,
  checkoutSessionFrom,
} from "@/server/checkout/session";

export async function POST(request: Request) {
  if (
    !isAllowedRequestOrigin(
      request.headers.get("origin"),
      process.env.APP_ORIGIN,
    )
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  const sessionToken = checkoutSessionFrom(request);

  if (sessionToken) {
    const identityClient = await authClient(true);
    const { data: identity } = await identityClient.auth.getUser();
    const client = commerceClient();
    const { error } = await client.rpc("server_cancel_cart_reservation", {
      session_token: sessionToken,
      actor_id: identity.user?.id ?? null,
      rate_key: commerceRateKey(request),
    });
    if (error)
      return new Response("Reservation could not be released", { status: 409 });
  }

  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(checkoutSessionCookie, "", {
    ...authCookieOptions(),
    maxAge: 0,
  });
  return response;
}
