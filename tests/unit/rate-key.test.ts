import { describe, expect, it } from "vitest";
import {
  commerceRateSubject,
  forwardedClientAddress,
} from "../../src/features/commerce/rate-key";

const headers = (entries: Record<string, string>) => new Headers(entries);

describe("commerce rate limit subject", () => {
  it("trusts the platform header, which the browser cannot write", () => {
    expect(
      forwardedClientAddress(
        headers({ "x-vercel-forwarded-for": "203.0.113.7, 70.41.3.18" }),
        false,
      ),
    ).toBe("203.0.113.7");
  });

  it("ignores a client-written x-forwarded-for unless a proxy is declared", () => {
    const spoofed = headers({ "x-forwarded-for": "203.0.113.7" });
    expect(forwardedClientAddress(spoofed, false)).toBeNull();
    expect(forwardedClientAddress(spoofed, true)).toBe("203.0.113.7");
  });

  it("prefers the platform header over the one a client can forge", () => {
    expect(
      forwardedClientAddress(
        headers({
          "x-vercel-forwarded-for": "198.51.100.4",
          "x-forwarded-for": "203.0.113.7",
        }),
        true,
      ),
    ).toBe("198.51.100.4");
  });

  it("bounds the address so a long header cannot break the stored key", () => {
    const address = forwardedClientAddress(
      headers({ "x-vercel-forwarded-for": "9".repeat(500) }),
      false,
    );
    expect(address).toHaveLength(128);
  });

  it("falls back to the checkout session, never to one shared bucket", () => {
    // Una constant compartida deixaria que un sol client esgotés el límit de
    // la botiga sencera: denegació de servei contra la clientela legítima.
    const first = commerceRateSubject(headers({}), "session-a", false);
    const second = commerceRateSubject(headers({}), "session-b", false);
    expect(first).not.toBe(second);
    expect(first).toBe("session:session-a");
  });

  it("uses the address when there is a trustworthy one", () => {
    expect(
      commerceRateSubject(
        headers({ "x-vercel-forwarded-for": "203.0.113.7" }),
        "session-a",
        false,
      ),
    ).toBe("address:203.0.113.7");
  });

  it("keeps spoofed and trustworthy addresses in different namespaces", () => {
    // Una sessió que es digués «address:203.0.113.7» no ha de poder consumir
    // el dipòsit d'una adreça real.
    expect(commerceRateSubject(headers({}), "address:203.0.113.7", false)).toBe(
      "session:address:203.0.113.7",
    );
  });
});
