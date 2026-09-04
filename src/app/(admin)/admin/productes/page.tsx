import { CatalogCreateForm } from "@/components/admin/catalog-create-form";
import { CatalogForm } from "@/components/admin/catalog-form";
import {
  CatalogCategoryCreateForm,
  CatalogCategoryForm,
} from "@/components/admin/catalog-category-form";
import { staffCatalog, staffCatalogDetails } from "@/server/catalog/admin";
import { staffInventory } from "@/server/inventory/repository";
import { staffAccess } from "@/server/permissions/staff";

export const metadata = { title: "Productes · Administració" };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ media?: string | string[] }>;
}) {
  const [query, access] = await Promise.all([searchParams, staffAccess()]);
  const mayManageCatalog =
    access.status === "allowed" &&
    access.permissions.includes("catalog.manage");
  const mayManageInventory =
    access.status === "allowed" &&
    access.permissions.includes("inventory.manage");
  if (!mayManageCatalog) return <NoPermission permission="catalog.manage" />;
  const [products, details, inventory] = await Promise.all([
    staffCatalog(),
    staffCatalogDetails(),
    mayManageInventory ? staffInventory() : Promise.resolve([]),
  ]);
  const locationId = inventory[0]?.location_id;

  return (
    <main id="main" className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <header className="border-b border-line pb-7">
        <p className="text-xs tracking-[0.18em] text-muted uppercase">
          Catàleg
        </p>
        <h1 className="mt-2 font-serif text-4xl sm:text-5xl">Productes</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Crea, publica i arxiva peces. Gestiona preus, variants, categories i
          fotografies des d’un únic lloc.
        </p>
      </header>
      <MediaStatus value={query.media} />
      {mayManageInventory && locationId ? (
        <details className="mt-8 border border-line bg-white p-5">
          <summary className="cursor-pointer font-semibold">
            Crear un producte nou
          </summary>
          <CatalogCreateForm locationId={locationId} />
        </details>
      ) : null}
      <details className="mt-5 border border-line bg-white p-5">
        <summary className="cursor-pointer font-semibold">
          Gestionar categories
        </summary>
        <div className="mt-5 grid gap-4">
          <CatalogCategoryCreateForm />
          {details.categories.map((category) => (
            <CatalogCategoryForm key={category.id} category={category} />
          ))}
        </div>
      </details>
      <section className="mt-8 grid gap-5" aria-label="Llista de productes">
        {products.map((product) => (
          <details className="border border-line bg-white p-5" key={product.id}>
            <summary className="cursor-pointer list-none">
              <span className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-serif text-2xl">{product.name}</span>
                <span className="rounded-full bg-sand px-3 py-1 text-xs capitalize">
                  {product.status}
                </span>
              </span>
            </summary>
            <div className="mt-6 border-t border-line pt-6">
              <CatalogForm
                product={product}
                variants={details.variants.filter(
                  (variant) => variant.product_id === product.id,
                )}
                categories={details.categories}
                selectedCategoryIds={details.assignments
                  .filter((assignment) => assignment.product_id === product.id)
                  .map((assignment) => assignment.category_id)}
                images={details.images.filter(
                  (image) => image.product_id === product.id,
                )}
                locationId={locationId}
              />
            </div>
          </details>
        ))}
      </section>
    </main>
  );
}

function MediaStatus({ value }: { value: string | string[] | undefined }) {
  if (Array.isArray(value) || !value) return null;
  const messages = {
    created: "Fotografia pujada correctament.",
    invalid: "L’arxiu o les dades de la fotografia no són vàlids.",
    failed: "No s’ha pogut pujar la fotografia.",
  } as const;
  if (!(value in messages)) return null;
  return (
    <p
      className="mt-6 border border-line bg-white p-4"
      role={value === "created" ? "status" : "alert"}
    >
      {messages[value as keyof typeof messages]}
    </p>
  );
}

function NoPermission({ permission }: { permission: string }) {
  return (
    <main id="main" className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <h1 className="font-serif text-4xl">Productes</h1>
      <p className="mt-5">No tens el permís {permission}.</p>
    </main>
  );
}
