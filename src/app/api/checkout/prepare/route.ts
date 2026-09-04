import { NextResponse } from "next/server";
import { isAllowedRequestOrigin } from "@/features/auth/validation";
import {
  pendingOrderInputSchema,
  pendingOrderResultSchema,
} from "@/features/cart/cart-input";
import { authClient } from "@/server/auth/client";
import { commerceClient } from "@/server/integrations/supabase/commerce-client";
import { commerceRateKey, readJsonBody } from "@/server/http/request";
import { checkoutSessionFrom } from "@/server/checkout/session";

const maxPayloadBytes = 16 * 1024;

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
  if (!sessionToken)
    return new Response("Reservation required", { status: 409 });

  let body: unknown;
  try {
    body = await readJsonBody(request, maxPayloadBytes);
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  const input = pendingOrderInputSchema.safeParse(body);
  if (!input.success) return new Response("Invalid checkout", { status: 400 });

  const identityClient = await authClient(true);
  const { data: identity } = await identityClient.auth.getUser();
  const client = commerceClient();
  const { data, error } = await client.rpc("server_create_pending_order", {
    session_token: sessionToken,
    request_key: input.data.requestKey,
    checkout_details: input.data.details,
    actor_id: identity.user?.id ?? null,
    rate_key: commerceRateKey(request),
  });
  const result = pendingOrderResultSchema.safeParse(data);
  if (error || !result.success) {
    return new Response("Checkout unavailable", { status: 409 });
  }

  return NextResponse.json(result.data, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
