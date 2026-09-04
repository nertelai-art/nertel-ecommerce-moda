import "server-only";
import { randomUUID } from "node:crypto";

export const checkoutSessionCookie = "moda_checkout";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function checkoutSessionFrom(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const value = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${checkoutSessionCookie}=`))
    ?.slice(checkoutSessionCookie.length + 1);
  return value && uuidPattern.test(value) ? value : null;
}

export function checkoutSessionOrCreate(request: Request) {
  return checkoutSessionFrom(request) ?? randomUUID();
}
