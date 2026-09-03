import { expect, it } from "vitest";
import { lineTotal, money } from "../../src/lib/money";

it("calculates in integer minor units with explicit currency", () => {
  expect(lineTotal(money(1999, "EUR"), 3)).toEqual({
    amountMinor: 5997,
    currency: "EUR",
  });
});

it("rejects negative, fractional and overflowing amounts", () => {
  for (const amount of [-1, 0.1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    expect(() => money(amount, "EUR")).toThrow();
  }
  expect(() => lineTotal(money(Number.MAX_SAFE_INTEGER, "EUR"), 2)).toThrow();
  expect(() => lineTotal(money(10, "EUR"), 0)).toThrow();
  expect(() => money(10, "eur")).toThrow();
});
