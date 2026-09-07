import "server-only";
import { authClient } from "@/server/auth/client";

type Resource =
  | "orders"
  | "customers"
  | "finance"
  | "inventory"
  | "suppliers"
  | "fulfillment"
  | "catalog"
  | "variants"
  | "categories"
  | "assignments"
  | "images";

/** One database snapshot; never interpret PostgREST's capped rows as a total. */
export async function staffSnapshot(
  resource: Resource,
  reportDays: 30 | 90 | 365 | null = null,
) {
  const client = await authClient();
  const { data, error } = await client.rpc("staff_snapshot", {
    resource,
    report_days: reportDays,
  });
  if (error) {
    // Fixed operation and SQLSTATE only: never log the provider payload or PII.
    console.error("staff_snapshot_failed", { resource, code: error.code });
    throw new Error(
      error.code === "54000"
        ? "El volum supera el límit del panell. Redueix el període de l’informe."
        : "Unable to load staff data",
    );
  }
  return data;
}
