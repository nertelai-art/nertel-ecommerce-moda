import "server-only";
import { z } from "zod";
import { staffSnapshot } from "@/server/repositories/staff-snapshot";
import {
  fulfillmentRowSchema,
  type FulfillmentRow,
} from "@/features/fulfillment/validation";
export async function staffFulfillmentQueue(): Promise<FulfillmentRow[]> {
  const data = await staffSnapshot("fulfillment");
  return z.array(fulfillmentRowSchema).parse(data);
}
