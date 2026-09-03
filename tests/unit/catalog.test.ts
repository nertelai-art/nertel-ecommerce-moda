import { describe, expect, it } from "vitest";
import {
  catalogProductSchema,
  productSlugSchema,
  displayPrice,
  catalogPageSchema,
} from "../../src/features/catalog/product";
import { publicCatalogConfig } from "../../src/server/integrations/supabase/public-config";
import {
  catalogCreateSchema,
  catalogEditSchema,
} from "../../src/features/catalog/admin";

const row = {
  id: "20000000-0000-4000-8000-000000000001",
  slug: "vestit",
  name: "Vestit",
  description: "",
  product_variants: [
    {
      id: "30000000-0000-4000-8000-000000000001",
      size: "M",
      color: "Sorra",
      price_minor: 4990,
      currency: "EUR",
      sku: "PRIVATE",
    },
  ],
  internal_note: "PRIVATE",
};
describe("public catalog trust boundary", () => {
  it("validates staff catalog edits", () => {
    expect(
      catalogEditSchema.safeParse({ ...row, status: "published" }).success,
    ).toBe(true);
    expect(
      catalogEditSchema.safeParse({ ...row, status: "deleted" }).success,
    ).toBe(false);
  });
  it("strips fields outside the public DTO", () => {
    const product = catalogProductSchema.parse(row);
    expect(JSON.stringify(product)).not.toContain("PRIVATE");
    expect(displayPrice(product)).toContain("49,90");
  });
  it("rejects unsafe prices and unsupported currencies", () => {
    for (const value of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, "4990"]) {
      expect(
        catalogProductSchema.safeParse({
          ...row,
          product_variants: [
            { ...row.product_variants[0], price_minor: value },
          ],
        }).success,
      ).toBe(false);
    }
    expect(
      catalogProductSchema.safeParse({
        ...row,
        product_variants: [{ ...row.product_variants[0], currency: "JPY" }],
      }).success,
    ).toBe(false);
  });
  it("handles products without active variants", () => {
    expect(
      displayPrice(
        catalogProductSchema.parse({ ...row, product_variants: [] }),
      ),
    ).toBe("Preu pendent");
  });
  it("rejects query injection and unbounded pagination", () => {
    for (const slug of [
      "../private",
      "x,or(status.eq.draft)",
      "x&select=*",
      "x".repeat(161),
    ])
      expect(productSlugSchema.safeParse(slug).success).toBe(false);
    for (const page of [0, -1, 1.5, 1001, "abc"])
      expect(catalogPageSchema.safeParse(page).success).toBe(false);
  });
  it("refuses privileged credentials and remote plain HTTP", () => {
    const jwt = (role: string) =>
      `a.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.b`;
    expect(() =>
      publicCatalogConfig({
        SUPABASE_URL: "http://127.0.0.1:55321",
        SUPABASE_PUBLISHABLE_KEY: jwt("service_role"),
      }),
    ).toThrow();
    expect(() =>
      publicCatalogConfig({
        SUPABASE_URL: "http://example.com",
        SUPABASE_PUBLISHABLE_KEY: jwt("anon"),
      }),
    ).toThrow();
    expect(
      publicCatalogConfig({
        SUPABASE_URL: "http://127.0.0.1:55321",
        SUPABASE_PUBLISHABLE_KEY: jwt("anon"),
      }).url,
    ).toBe("http://127.0.0.1:55321");
  });
  it("validates a new product and its first variant", () => {
    const input = {
      slug: "nou-producte",
      name: "Nou",
      description: "",
      sku: "NOU-M-BLAU",
      size: "M",
      color: "blau",
      priceMinor: "2590",
      locationId: "40000000-0000-4000-8000-000000000001",
    };
    expect(catalogCreateSchema.safeParse(input).success).toBe(true);
    expect(
      catalogCreateSchema.safeParse({ ...input, sku: "unsafe sku" }).success,
    ).toBe(false);
  });
});
