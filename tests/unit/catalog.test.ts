import { describe, expect, it } from "vitest";
import {
  catalogProductSchema,
  productSlugSchema,
  displayPrice,
  catalogPageSchema,
  catalogQuerySchema,
} from "../../src/features/catalog/product";
import { publicCatalogConfig } from "../../src/server/integrations/supabase/public-config";
import {
  catalogCreateSchema,
  catalogCategoryCreateSchema,
  catalogEditSchema,
  catalogVariantCreateSchema,
  catalogVariantEditSchema,
  productCategoriesEditSchema,
} from "../../src/features/catalog/admin";
import {
  detectProductImage,
  productImageInputSchema,
} from "../../src/features/catalog/image";

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
  product_categories: [
    {
      categories: {
        id: "60000000-0000-4000-8000-000000000001",
        slug: "vestits",
        name: "Vestits",
      },
    },
  ],
  product_images: [
    {
      id: "70000000-0000-4000-8000-000000000001",
      alt_text: "Vestit blau sobre fons clar",
      sort_order: 0,
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
    expect(product.categories[0]?.slug).toBe("vestits");
    expect(product.images[0]?.altText).toBe("Vestit blau sobre fons clar");
  });
  it("rejects unsafe prices and malformed currency codes", () => {
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
    // La forma sí que es valida: ha de ser un codi ISO 4217 de tres majúscules.
    for (const value of ["eur", "EURO", "EU", "", "€", 978]) {
      expect(
        catalogProductSchema.safeParse({
          ...row,
          product_variants: [{ ...row.product_variants[0], currency: value }],
        }).success,
      ).toBe(false);
    }
  });
  it("accepts any well-formed currency, because the instance decides which", () => {
    // El domini no coneix la moneda de la botiga. Qui la imposa és la base:
    // quote_cart filtra les variants per private.shop_currency(), de manera
    // que una variant en una altra moneda mai no arriba a cotitzar-se.
    for (const value of ["EUR", "GBP", "JPY", "CHF"]) {
      expect(
        catalogProductSchema.safeParse({
          ...row,
          product_variants: [{ ...row.product_variants[0], currency: value }],
        }).success,
      ).toBe(true);
    }
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
    expect(
      catalogQuerySchema.parse({
        page: "2",
        query: "vestit blau",
        category: "vestits",
        sort: "name-desc",
      }),
    ).toEqual({
      page: 2,
      query: "vestit blau",
      category: "vestits",
      size: "",
      color: "",
      price: "",
      sort: "name-desc",
    });
    for (const query of ["x,or(status.eq.draft)", "*", "x".repeat(81)])
      expect(
        catalogQuerySchema.safeParse({
          page: 1,
          query,
          category: "",
          sort: "name-asc",
        }).success,
      ).toBe(false);
    expect(
      catalogQuerySchema.safeParse({
        page: 1,
        query: "",
        category: "vestits",
        sort: "price-asc",
      }).success,
    ).toBe(false);
    expect(
      catalogQuerySchema.safeParse({
        page: 1,
        query: "",
        category: "",
        size: "M",
        color: "oliva",
        price: "60-80",
        sort: "name-asc",
      }).success,
    ).toBe(true);
    expect(
      catalogQuerySchema.safeParse({
        page: 1,
        query: "",
        category: "",
        size: "M,or(is_active.eq.false)",
        color: "",
        price: "gratis",
        sort: "name-asc",
      }).success,
    ).toBe(false);
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
  it("validates variant and category administration inputs", () => {
    const variant = {
      productId: row.id,
      sku: "VESTIT-S-BLAU",
      size: "S",
      color: "blau",
      priceMinor: "4590",
      locationId: "40000000-0000-4000-8000-000000000001",
    };
    expect(catalogVariantCreateSchema.safeParse(variant).success).toBe(true);
    expect(
      catalogVariantEditSchema.safeParse({
        ...variant,
        id: "30000000-0000-4000-8000-000000000001",
        isActive: "true",
      }).success,
    ).toBe(true);
    expect(
      catalogVariantEditSchema.safeParse({
        ...variant,
        id: "30000000-0000-4000-8000-000000000001",
        isActive: "yes",
      }).success,
    ).toBe(false);
    expect(
      catalogCategoryCreateSchema.safeParse({
        slug: "novetats",
        name: "Novetats",
      }).success,
    ).toBe(true);
    expect(
      productCategoriesEditSchema.safeParse({
        productId: row.id,
        categoryIds: ["60000000-0000-4000-8000-000000000001"],
      }).success,
    ).toBe(true);
  });
  it("validates image metadata and detects content independently of the filename", () => {
    expect(
      productImageInputSchema.safeParse({
        productId: row.id,
        altText: "Vestit sobre fons clar",
        sortOrder: "0",
      }).success,
    ).toBe(true);
    expect(
      productImageInputSchema.safeParse({
        productId: row.id,
        altText: "",
        sortOrder: "100",
      }).success,
    ).toBe(false);
    expect(
      detectProductImage(Uint8Array.from([0xff, 0xd8, 0xff, 0x00])),
    ).toEqual({ mimeType: "image/jpeg", extension: "jpg" });
    expect(
      detectProductImage(
        Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10]),
      ),
    ).toEqual({ mimeType: "image/png", extension: "png" });
    expect(detectProductImage(new TextEncoder().encode("not-an-image"))).toBe(
      null,
    );
  });
});
