import { describe, expect, it } from "vitest";
import {
  cartInputSchema,
  cartQuoteSchema,
  pendingOrderInputSchema,
  pendingOrderResultSchema,
  reservationInputSchema,
} from "../../src/features/cart/cart-input";

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
  it("validates authoritative quotes and idempotent reservation input", () => {
    expect(
      cartQuoteSchema.safeParse({
        items: [
          {
            variantId: item.variantId,
            slug: "vestit",
            name: "Vestit",
            size: "M",
            color: "blau",
            unitPriceMinor: 4990,
            currency: "EUR",
            quantity: 1,
            lineTotalMinor: 4990,
            available: true,
          },
        ],
        totalMinor: 4990,
        currency: "EUR",
      }).success,
    ).toBe(true);
    expect(
      reservationInputSchema.safeParse({
        items: [item],
        requestKey: "81000000-0000-4000-8000-000000000001",
      }).success,
    ).toBe(true);
  });
  it("validates checkout details without accepting amounts or statuses", () => {
    const details = {
      email: "client@example.test",
      recipient: "Client",
      line1: "Carrer 1",
      line2: "",
      city: "Barcelona",
      region: "Barcelona",
      postalCode: "08001",
      countryCode: "ES",
    };
    expect(
      pendingOrderInputSchema.safeParse({
        requestKey: "85000000-0000-4000-8000-000000000001",
        details,
      }).success,
    ).toBe(true);
    expect(
      pendingOrderInputSchema.safeParse({
        requestKey: "85000000-0000-4000-8000-000000000001",
        details: { ...details, amountMinor: 1 },
      }).success,
    ).toBe(false);
    expect(
      pendingOrderResultSchema.safeParse({
        orderId: "86000000-0000-4000-8000-000000000001",
        paymentAttemptId: "87000000-0000-4000-8000-000000000001",
        status: "pending_payment",
        paymentStatus: "requires_provider",
        amountMinor: 4990,
        currency: "EUR",
        expiresAt: "2026-09-04T10:00:00+02:00",
      }).success,
    ).toBe(true);
  });
});
