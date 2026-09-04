import Link from "next/link";
import { randomUUID } from "node:crypto";
import { staffAccess } from "@/server/permissions/staff";
import { staffInventory } from "@/server/inventory/repository";
import { InventoryForm } from "@/components/admin/inventory-form";
import { CatalogForm } from "@/components/admin/catalog-form";
import { staffCatalog, staffCatalogDetails } from "@/server/catalog/admin";
import { CatalogCreateForm } from "@/components/admin/catalog-create-form";
import {
  CatalogCategoryCreateForm,
  CatalogCategoryForm,
} from "@/components/admin/catalog-category-form";

export const metadata = { title: "Accés del personal" };
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ media?: string | string[] }>;
}) {
  const query = await searchParams;
  const access = await staffAccess();
  const mayManageInventory =
    access.status === "allowed" &&
    access.permissions.includes("inventory.manage");
  const mayManageCatalog =
    access.status === "allowed" &&
    access.permissions.includes("catalog.manage");
  const [inventory, products, details] = await Promise.all([
    mayManageInventory ? staffInventory() : Promise.resolve([]),
    mayManageCatalog ? staffCatalog() : Promise.resolve([]),
    mayManageCatalog
      ? staffCatalogDetails()
      : Promise.resolve({
          variants: [],
          categories: [],
          assignments: [],
          images: [],
        }),
  ]);
  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-6 py-14">
      <h1 className="font-serif text-4xl">Espai del personal</h1>
      {access.status === "mfa-required" ? (
        <>
          <p className="my-6">
            Verifica el segon factor per comprovar el teu accés.
          </p>
          <Link className="action" href="/compte/seguretat">
            Verificar autenticador
          </Link>
        </>
      ) : access.status === "denied" ? (
        <p className="my-6" role="status">
          Aquest compte no té permisos d’administració.
        </p>
      ) : (
        <>
          <p className="my-6">Accés verificat.</p>
          {query.media === "created" ? (
            <p className="my-4 bg-sand p-4" role="status">
              Fotografia pujada correctament.
            </p>
          ) : null}
          {query.media === "invalid" ? (
            <p className="my-4 bg-sand p-4" role="alert">
              L’arxiu o les dades de la fotografia no són vàlids.
            </p>
          ) : null}
          {query.media === "failed" ? (
            <p className="my-4 bg-sand p-4" role="alert">
              No s’ha pogut pujar la fotografia.
            </p>
          ) : null}
          <h2 className="font-semibold">Permisos assignats</h2>
          <ul className="mt-4 list-inside list-disc">
            {access.permissions.map((permission) => (
              <li key={permission}>{permission}</li>
            ))}
          </ul>
          {access.permissions.includes("inventory.manage") ? (
            <section className="mt-10" aria-labelledby="inventory-title">
              <h2 id="inventory-title" className="font-serif text-3xl">
                Inventari
              </h2>
              <div className="mt-5 grid gap-6">
                {inventory.map((row) => (
                  <article
                    key={`${row.variant_id}:${row.location_id}`}
                    className="grid gap-3 border border-line bg-white p-5"
                  >
                    <h3 className="font-semibold">{row.product_name}</h3>
                    <p>
                      {row.sku} · {row.size} · {row.color}
                    </p>
                    <p>
                      {row.location_name}: {row.on_hand} disponibles físicament,{" "}
                      {row.reserved} reservats.
                    </p>
                    <InventoryForm row={row} requestKey={randomUUID()} />
                  </article>
                ))}
              </div>
            </section>
          ) : null}
          {access.permissions.includes("catalog.manage") ? (
            <section className="mt-10" aria-labelledby="catalog-title">
              <h2 id="catalog-title" className="font-serif text-3xl">
                Catàleg
              </h2>
              {access.permissions.includes("inventory.manage") &&
              inventory[0] ? (
                <CatalogCreateForm locationId={inventory[0].location_id} />
              ) : null}
              <section
                className="mt-8 grid gap-4"
                aria-labelledby="categories-title"
              >
                <h3 id="categories-title" className="font-serif text-2xl">
                  Categories
                </h3>
                <CatalogCategoryCreateForm />
                {details.categories.map((category) => (
                  <CatalogCategoryForm key={category.id} category={category} />
                ))}
              </section>
              <div className="mt-5 grid gap-6">
                {products.map((product) => (
                  <CatalogForm
                    key={product.id}
                    product={product}
                    variants={details.variants.filter(
                      (variant) => variant.product_id === product.id,
                    )}
                    categories={details.categories}
                    selectedCategoryIds={details.assignments
                      .filter(
                        (assignment) => assignment.product_id === product.id,
                      )
                      .map((assignment) => assignment.category_id)}
                    images={details.images.filter(
                      (image) => image.product_id === product.id,
                    )}
                    locationId={
                      access.permissions.includes("inventory.manage")
                        ? inventory[0]?.location_id
                        : undefined
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}
