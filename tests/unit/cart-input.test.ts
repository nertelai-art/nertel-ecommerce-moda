import { describe, expect, it } from "vitest";
import { cartInputSchema } from "../../src/features/cart/cart-input";

const item = { variantId: "b8c71246-6f81-4abd-b85f-1a1a09c82971", quantity: 1 };

describe("cart input trust boundary", () => {
  it("accepts only product references and quantities", () => {
    expect(cartInputSchema.safeParse({ items: [item] }).success).toBe(true);
  });
  it.each([0, -1, 1.5, 100, Infinity, "2"])(
    "rejects invalid quantity %s",
    (quantity) => {
      expect(
        cartInputSchema.safeParse({ items: [{ ...item, quantity }] }).success,
      ).toBe(false);
    },
  );
  it("rejects injected prices, status and duplicate variants", () => {
    for (const input of [
      { items: [{ ...item, price: 1 }] },
      { items: [item], status: "paid" },
      { items: [item, item] },
      { items: [] },
      { items: Array.from({ length: 101 }, () => item) },
    ])
      expect(cartInputSchema.safeParse(input).success).toBe(false);
  });
});
