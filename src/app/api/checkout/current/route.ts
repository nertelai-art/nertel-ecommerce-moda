import { NextResponse } from "next/server";
import { pendingOrderResultSchema } from "@/features/cart/cart-input";
import { authClient } from "@/server/auth/client";
import { commerceClient } from "@/server/integrations/supabase/commerce-client";
import { checkoutSessionFrom } from "@/server/checkout/session";

export async function GET(request: Request) {
  const sessionToken = checkoutSessionFrom(request);
  if (!sessionToken) return new NextResponse(null, { status: 204 });

  const identityClient = await authClient(true);
  const { data: identity } = await identityClient.auth.getUser();
  const client = commerceClient();
  const { data, error } = await client.rpc("server_current_pending_order", {
    session_token: sessionToken,
    actor_id: identity.user?.id ?? null,
  });
  if (error) return new Response("Checkout unavailable", { status: 409 });
  if (data === null) return new NextResponse(null, { status: 204 });

  const result = pendingOrderResultSchema.safeParse(data);
  if (!result.success)
    return new Response("Checkout unavailable", { status: 409 });
  return NextResponse.json(result.data, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
