import { z } from "zod";

export const financeSaleSchema = z.object({
  order_id: z.uuid(),
  occurred_at: z.iso.datetime({ offset: true }),
  product_id: z.uuid(),
  product_name: z.string(),
  sku: z.string(),
  quantity: z.number().int().positive(),
  revenue_minor: z.number().int().nonnegative(),
  estimated_cost_minor: z.number().int().nonnegative().nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/),
});
export type FinanceSale = z.infer<typeof financeSaleSchema>;
