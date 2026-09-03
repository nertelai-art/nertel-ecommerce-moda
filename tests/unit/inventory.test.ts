import { describe, expect, it } from "vitest";
import { inventoryAdjustmentSchema } from "../../src/features/inventory/validation";

const valid = {
  variantId: "30000000-0000-4000-8000-000000000001",
  locationId: "40000000-0000-4000-8000-000000000001",
  quantity: "5",
  reason: "Entrada de mercaderia",
  idempotencyKey: "57000000-0000-4000-8000-000000000001",
};

describe("inventory adjustment boundaries", () => {
  it("accepts a bounded integer adjustment", () => {
    expect(inventoryAdjustmentSchema.parse(valid).quantity).toBe(5);
  });

  it("rejects zero, decimals, excessive values and invalid metadata", () => {
    for (const change of ["0", "1.5", "100001", "-100001", "not-a-number"])
      expect(
        inventoryAdjustmentSchema.safeParse({ ...valid, quantity: change })
          .success,
      ).toBe(false);
    expect(
      inventoryAdjustmentSchema.safeParse({ ...valid, reason: " " }).success,
    ).toBe(false);
    expect(
      inventoryAdjustmentSchema.safeParse({ ...valid, variantId: "invalid" })
        .success,
    ).toBe(false);
  });
});
