import "server-only";
import { z } from "zod";
import { authClient } from "@/server/auth/client";
import {
  fulfillmentRowSchema,
  type FulfillmentRow,
} from "@/features/fulfillment/validation";
export async function staffFulfillmentQueue(): Promise<FulfillmentRow[]> {
  const c = await authClient();
  const { data, error } = await c.rpc("staff_fulfillment_queue");
  if (error) throw new Error("Unable to load fulfillment");
  return z.array(fulfillmentRowSchema).parse(data);
}
