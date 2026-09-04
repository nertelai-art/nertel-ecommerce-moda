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
  const { data: level, error: levelError } =
    await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (levelError) throw new Error("Unable to verify staff access");
  if (level.currentLevel !== "aal2")
    return { status: "mfa-required" as const, permissions: [] };
  const { data, error } = await client.rpc("current_staff_permissions");
  if (error) throw new Error("Unable to verify staff access");
  const permissions = z.array(permissionSchema).parse(data);
  return {
    status: permissions.length ? ("allowed" as const) : ("denied" as const),
    permissions,
    userId: user.id,
  };
});

/** Every future staff mutation must call this, in addition to DB authorization. */
export async function requirePermission(permission: StaffPermission) {
  const access = await staffAccess();
  if (access.status !== "allowed" || !access.permissions.includes(permission))
    throw new Error("Forbidden");
  return access;
}
