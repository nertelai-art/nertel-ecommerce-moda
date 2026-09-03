import { expect, it, vi } from "vitest";
import type { PaymentProvider } from "../../src/features/payments/payment-provider";
import { resolvePaymentProvider } from "../../src/features/payments/resolve-provider";

function provider(
  name: string,
  environment: "test" | "live",
  accountKey = "shop",
): PaymentProvider {
  return {
    identity: { provider: name, accountKey, environment },
    createCheckout: vi.fn(),
    getCheckout: vi.fn(),
    expireCheckout: vi.fn(),
    verifyWebhook: vi.fn(),
    refund: vi.fn(),
  };
}

it("routes old payments to their original provider after a change", () => {
  const old = provider("stripe", "test");
  const current = provider("alternative", "test");
  expect(resolvePaymentProvider([current, old], old.identity)).toBe(old);
});

it("never falls back to a different environment, account or provider", () => {
  const original = provider("stripe", "test");
  for (const candidate of [
    provider("stripe", "live"),
    provider("stripe", "test", "other"),
    provider("other", "test"),
  ]) {
    expect(() =>
      resolvePaymentProvider([candidate], original.identity),
    ).toThrow();
  }
  expect(() => resolvePaymentProvider([], original.identity)).toThrow();
  expect(() =>
    resolvePaymentProvider([original, original], original.identity),
  ).toThrow();
});
