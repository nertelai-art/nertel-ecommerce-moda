import "server-only";
import { z } from "zod";
import { financeSaleSchema, type FinanceSale } from "@/features/finance/report";
import { authClient } from "@/server/auth/client";

export async function staffFinanceSales(
  days: 30 | 90 | 365 | null = null,
): Promise<FinanceSale[]> {
  const client = await authClient();
  const { data, error } = await client.rpc("staff_finance_sales", {
    report_days: days,
  });
  if (error) throw new Error("Unable to load finance report");
  return z.array(financeSaleSchema).parse(data);
}
