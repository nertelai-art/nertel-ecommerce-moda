import { NextResponse } from "next/server";
import { isAllowedRequestOrigin } from "@/features/auth/validation";
import { cartInputSchema, cartQuoteSchema } from "@/features/cart/cart-input";
import { commerceClient } from "@/server/integrations/supabase/commerce-client";
import { commerceRateKey, readJsonBody } from "@/server/http/request";
import { checkoutSessionFrom } from "@/server/checkout/session";

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
  const input = cartInputSchema.safeParse(body);
  if (!input.success) return new Response("Invalid cart", { status: 400 });
  const client = commerceClient();
  const { data, error } = await client.rpc("server_quote_cart", {
    cart: input.data.items,
    // El pressupost no crea sessió de compra: si encara no n'hi ha cap, el
    // límit depèn de l'adreça, i sense adreça de confiança no se n'imposa cap.
    rate_key: commerceRateKey(request, checkoutSessionFrom(request)),
  });
  const quote = cartQuoteSchema.safeParse(data);
  if (error || !quote.success)
    return new Response("Cart unavailable", { status: 409 });
  return NextResponse.json(quote.data, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
