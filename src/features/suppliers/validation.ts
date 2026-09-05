import { z } from "zod";

export const supplierProductSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  supplierSku: z.string(),
  unitCostMinor: z.number().int().nonnegative().nullable(),
  currency: z.string().length(3),
});
export const supplierSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  contact_name: z.string(),
  email: z.email(),
  phone: z.string(),
  status: z.enum(["active", "paused", "archived"]),
  lead_time_days: z.number().int().nonnegative(),
  minimum_order_minor: z.number().int().nonnegative(),
  currency: z.string().length(3),
  notes: z.string(),
  updated_at: z.iso.datetime({ offset: true }),
  products: z.array(supplierProductSchema),
});
export type Supplier = z.infer<typeof supplierSchema>;
export type SupplierState = { ok: boolean; message: string };

const shared = {
  name: z.string().trim().min(2).max(120),
  contact: z.string().trim().max(120),
  email: z.email().trim().max(254),
  phone: z.string().trim().max(40),
  leadDays: z.coerce.number().int().min(0).max(365),
  minimumEuros: z.coerce.number().min(0).max(900000),
  notes: z.string().trim().max(2000),
};
export const createSupplierSchema = z.object(shared);
export const updateSupplierSchema = z.object({
  ...shared,
  id: z.uuid(),
  status: z.enum(["active", "paused", "archived"]),
});
export const supplierProductInputSchema = z.object({
  supplierId: z.uuid(),
  productId: z.uuid(),
  supplierSku: z.string().trim().max(120),
  unitCostEuros: z.coerce.number().min(0).max(900000),
});
