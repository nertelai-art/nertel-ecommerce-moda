export type ProductStatus = "draft" | "published" | "archived";

/** DTO públic: sense costos interns, notes ni dades de proveïdors. */
export interface CatalogProduct {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
}
