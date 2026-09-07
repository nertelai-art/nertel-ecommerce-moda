import { describe, expect, it } from "vitest";
import {
  commerceRateSubject,
  forwardedClientAddress,
} from "../../src/features/commerce/rate-key";

describe("trusted commerce addresses", () => {
  it("ignores both spoofed headers outside a configured platform", () => {
    const headers = new Headers({
      "x-vercel-forwarded-for": "203.0.113.7",
      "x-forwarded-for": "198.51.100.4",
    });
    expect(forwardedClientAddress(headers, false)).toBeNull();
    expect(forwardedClientAddress(headers, true)).toBe("198.51.100.4");
    expect(forwardedClientAddress(headers, false, true)).toBe("203.0.113.7");
  });
  it("uses the first proxy address and rejects oversized identities", () => {
    expect(
      forwardedClientAddress(
        new Headers({ "x-forwarded-for": "203.0.113.7, 198.51.100.4" }),
        true,
      ),
    ).toBe("203.0.113.7");
    expect(
      forwardedClientAddress(
        new Headers({ "x-forwarded-for": "9".repeat(500) }),
        true,
      ),
    ).toBeNull();
  });
  it("uses separate session buckets only as the development fallback", () => {
    expect(commerceRateSubject(new Headers(), "session-a", false)).toBe(
      "session:session-a",
    );
    expect(commerceRateSubject(new Headers(), "session-b", false)).toBe(
      "session:session-b",
    );
    expect(commerceRateSubject(new Headers(), null, false)).toBeNull();
    expect(
      commerceRateSubject(
        new Headers({ "x-vercel-forwarded-for": "203.0.113.7" }),
        "session-a",
        false,
        true,
      ),
    ).toBe("address:203.0.113.7");
  });
});
