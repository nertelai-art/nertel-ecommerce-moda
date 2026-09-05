import { z } from "zod";

const customerOrderSchema = z.object({
  id: z.uuid(),
  status: z.enum(["pending_payment", "paid", "cancelled", "expired"]),
  amountMinor: z.number().int().nonnegative(),
  currency: z.string().length(3),
  createdAt: z.iso.datetime({ offset: true }),
  itemCount: z.number().int().nonnegative(),
});

export const staffCustomerSchema = z.object({
  email: z.email(),
  display_name: z.string(),
  latest_address: z.object({
    recipient: z.string().optional().default(""),
    line1: z.string().optional().default(""),
    line2: z.string().optional().default(""),
    city: z.string().optional().default(""),
    region: z.string().optional().default(""),
    postalCode: z.string().optional().default(""),
    countryCode: z.string().optional().default(""),
  }),
  is_registered: z.boolean(),
  order_count: z.number().int().nonnegative(),
  paid_order_count: z.number().int().nonnegative(),
  pending_order_count: z.number().int().nonnegative(),
  total_spent_minor: z.number().int().nonnegative(),
  currency: z.string().length(3),
  first_order_at: z.iso.datetime({ offset: true }),
  last_order_at: z.iso.datetime({ offset: true }),
  orders: z.array(customerOrderSchema),
});

export type StaffCustomer = z.infer<typeof staffCustomerSchema>;
