import { z } from "zod";

export const emailSchema = z.email().trim().max(254);
export const passwordSchema = z.string().min(12).max(128);
export const otpSchema = z.string().regex(/^[0-9]{6}$/);
export const authModeSchema = z.enum([
  "login",
  "register",
  "confirm",
  "recover",
  "verify-recovery",
  "password",
]);
export type AuthMode = z.infer<typeof authModeSchema>;
export type AuthState = { message: string; ok: boolean };
export type MfaState = AuthState & { secret?: string; factorId?: string };

export const permissionSchema = z.enum([
  "catalog.manage",
  "inventory.manage",
  "orders.fulfill",
  "customers.read",
  "refunds.create",
  "staff.manage",
]);
export type StaffPermission = z.infer<typeof permissionSchema>;

export function trustedOrigin(value: string | undefined) {
  const url = new URL(z.url().parse(value));
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    !(
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))
    )
  )
    throw new Error("Invalid application origin");
  return url.origin;
}
