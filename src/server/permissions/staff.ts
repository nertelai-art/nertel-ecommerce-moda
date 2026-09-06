import "server-only";
import { cache } from "react";
import { z } from "zod";
import {
  permissionSchema,
  type StaffPermission,
} from "@/features/auth/validation";
import { requireUser } from "@/server/auth/session";

export const staffAccess = cache(async function staffAccess() {
  const { client, user } = await requireUser();
  const [assurance, permissionResult] = await Promise.all([
    client.auth.mfa.getAuthenticatorAssuranceLevel(),
    client.rpc("current_staff_permissions"),
  ]);
  if (assurance.error || permissionResult.error)
    throw new Error("Unable to verify staff access");
  const data = permissionResult.data;
  const permissions = z.array(permissionSchema).parse(data);
  if (
    permissions.length === 0 &&
    process.env.NODE_ENV === "production" &&
    assurance.data.currentLevel !== "aal2"
  )
    return {
      status: "mfa-required" as const,
      permissions: [],
      mfaSatisfied: false,
    };
  // No és «cal MFA», és «aquesta sessió ja té el segon factor verificat». Amb
  // el nom antic, mfaRequired, la lectura natural de la condició era la
  // contrària de la que fa el codi, i això és un lloc dolent per equivocar-se.
  return {
    status: permissions.length ? ("allowed" as const) : ("denied" as const),
    permissions,
    userId: user.id,
    mfaSatisfied: assurance.data.currentLevel === "aal2",
  };
});

/** Every future staff mutation must call this, in addition to DB authorization. */
export async function requirePermission(permission: StaffPermission) {
  const access = await staffAccess();
  if (access.status !== "allowed" || !access.permissions.includes(permission))
    throw new Error("Forbidden");
  return access;
}
