"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { authClient } from "@/server/auth/client";
import { requirePermission } from "@/server/permissions/staff";
import { isAllowedRequestOrigin } from "@/features/auth/validation";
import {
  createSupplierSchema,
  supplierProductInputSchema,
  updateSupplierSchema,
  type SupplierState,
} from "@/features/suppliers/validation";

async function authorize() {
  if (
    !isAllowedRequestOrigin(
      (await headers()).get("origin"),
      process.env.APP_ORIGIN,
    )
  )
    throw new Error("Request origin rejected");
  await requirePermission("suppliers.manage");
  return authClient(true);
}
const fields = (form: FormData) => ({
  name: form.get("name"),
  contact: form.get("contact"),
  email: form.get("email"),
  phone: form.get("phone"),
  leadDays: form.get("leadDays"),
  minimumEuros: form.get("minimumEuros"),
  notes: form.get("notes"),
});
export async function createSupplier(
  _state: SupplierState,
  form: FormData,
): Promise<SupplierState> {
  const input = createSupplierSchema.safeParse(fields(form));
  if (!input.success)
    return { ok: false, message: "Revisa els camps del proveïdor." };
  const client = await authorize();
  const d = input.data;
  const { error } = await client.rpc("create_supplier", {
    supplier_name: d.name,
    supplier_contact: d.contact,
    supplier_email: d.email,
    supplier_phone: d.phone,
    supplier_lead_days: d.leadDays,
    supplier_minimum_minor: Math.round(d.minimumEuros * 100),
    supplier_notes: d.notes,
  });
  if (error) return { ok: false, message: "No s’ha pogut crear el proveïdor." };
  revalidatePath("/admin/proveidors");
  return { ok: true, message: "Proveïdor creat." };
}
export async function updateSupplier(
  _state: SupplierState,
  form: FormData,
): Promise<SupplierState> {
  const input = updateSupplierSchema.safeParse({
    ...fields(form),
    id: form.get("id"),
    status: form.get("status"),
  });
  if (!input.success)
    return { ok: false, message: "Revisa els camps del proveïdor." };
  const client = await authorize();
  const d = input.data;
  const { error } = await client.rpc("update_supplier", {
    target_id: d.id,
    supplier_name: d.name,
    supplier_contact: d.contact,
    supplier_email: d.email,
    supplier_phone: d.phone,
    supplier_status: d.status,
    supplier_lead_days: d.leadDays,
    supplier_minimum_minor: Math.round(d.minimumEuros * 100),
    supplier_notes: d.notes,
  });
  if (error) return { ok: false, message: "No s’han pogut desar els canvis." };
  revalidatePath("/admin/proveidors");
  return { ok: true, message: "Canvis desats." };
}
export async function linkSupplierProduct(
  _state: SupplierState,
  form: FormData,
): Promise<SupplierState> {
  const input = supplierProductInputSchema.safeParse({
    supplierId: form.get("supplierId"),
    productId: form.get("productId"),
    supplierSku: form.get("supplierSku"),
    unitCostEuros: form.get("unitCostEuros"),
  });
  if (!input.success)
    return { ok: false, message: "Revisa producte, referència i cost." };
  const client = await authorize();
  const d = input.data;
  const { error } = await client.rpc("set_supplier_product", {
    target_supplier: d.supplierId,
    target_product: d.productId,
    new_supplier_sku: d.supplierSku,
    new_unit_cost_minor: Math.round(d.unitCostEuros * 100),
  });
  if (error)
    return { ok: false, message: "No s’ha pogut vincular el producte." };
  revalidatePath("/admin/proveidors");
  return { ok: true, message: "Producte vinculat." };
}
