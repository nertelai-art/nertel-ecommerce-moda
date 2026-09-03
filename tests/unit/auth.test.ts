import { describe, expect, it } from "vitest";
import {
  emailSchema,
  passwordSchema,
  otpSchema,
  authModeSchema,
  permissionSchema,
  trustedOrigin,
} from "../../src/features/auth/validation";

describe("auth input boundaries", () => {
  it("rejects weak or unbounded passwords", () => {
    for (const input of ["short", "x".repeat(129), null, 123])
      expect(passwordSchema.safeParse(input).success).toBe(false);
    expect(
      passwordSchema.safeParse("a sufficiently long passphrase").success,
    ).toBe(true);
  });
  it("accepts only six decimal OTP digits", () => {
    for (const input of ["12345", "1234567", "1e0000", "abcdef", 123456])
      expect(otpSchema.safeParse(input).success).toBe(false);
    expect(otpSchema.safeParse("001234").success).toBe(true);
  });
  it("bounds email and rejects unexpected operations or permissions", () => {
    expect(emailSchema.safeParse("invalid").success).toBe(false);
    expect(authModeSchema.safeParse("grant-admin").success).toBe(false);
    expect(permissionSchema.safeParse("admin").success).toBe(false);
  });
  it("requires a trusted HTTPS or loopback origin without URL payloads", () => {
    for (const input of [
      "http://example.com",
      "https://user:password@example.com",
      "https://example.com/redirect",
      "https://example.com?next=evil",
      undefined,
    ])
      expect(() => trustedOrigin(input)).toThrow();
    expect(trustedOrigin("https://shop.example.com")).toBe(
      "https://shop.example.com",
    );
    expect(trustedOrigin("http://127.0.0.1:3100")).toBe(
      "http://127.0.0.1:3100",
    );
  });
});
