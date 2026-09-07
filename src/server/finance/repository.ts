import "server-only";
import { z } from "zod";
import { financeSaleSchema, type FinanceSale } from "@/features/finance/report";
import { staffSnapshot } from "@/server/repositories/staff-snapshot";

export async function staffFinanceSales(
  days: 30 | 90 | 365 | null = null,
): Promise<FinanceSale[]> {
  const data = await staffSnapshot("finance", days);
  return z.array(financeSaleSchema).parse(data);
}
