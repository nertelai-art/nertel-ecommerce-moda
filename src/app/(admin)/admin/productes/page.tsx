import Image from "next/image";
import Link from "next/link";
import { CatalogCreateForm } from "@/components/admin/catalog-create-form";
import { CatalogForm } from "@/components/admin/catalog-form";
import { InstantFilterForm } from "@/components/admin/instant-filter-form";
import {
  CatalogCategoryCreateForm,
  CatalogCategoryForm,
} from "@/components/admin/catalog-category-form";
import { staffCatalog, staffCatalogDetails } from "@/server/catalog/admin";
import { staffInventory } from "@/server/inventory/repository";
import { staffAccess } from "@/server/permissions/staff";
import { demoProductImage } from "@/features/catalog/product";
import type {
  StaffCatalogRow,
  StaffCatalogVariant,
  StaffCategory,
} from "@/features/catalog/admin";
import type { StaffCatalogImage } from "@/features/catalog/image";
import type { InventoryRow } from "@/features/inventory/validation";

export const metadata = { title: "Productes · Administració" };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    media?: string | string[];
    q?: string | string[];
    estat?: string | string[];
  }>;
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
  const queryText = typeof query.q === "string" ? query.q.trim() : "";
  const status =
    typeof query.estat === "string" &&
    ["draft", "published", "archived"].includes(query.estat)
      ? query.estat
      : "";
  const normalizedQuery = queryText.toLocaleLowerCase("ca");
  const visibleProducts = products.filter(
    (product) =>
      (!status || product.status === status) &&
      (!normalizedQuery ||
        product.name.toLocaleLowerCase("ca").includes(normalizedQuery) ||
        product.slug.toLocaleLowerCase("ca").includes(normalizedQuery) ||
        details.variants.some(
          (variant) =>
            variant.product_id === product.id &&
            variant.sku.toLocaleLowerCase("ca").includes(normalizedQuery),
        )),
  );

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
      <section className="mt-7 grid gap-4 rounded-xl border border-line bg-white p-4 sm:grid-cols-[1fr_auto] sm:p-5">
        <InstantFilterForm className="grid gap-3 sm:grid-cols-[minmax(15rem,1fr)_12rem]">
          <label className="grid gap-1 text-xs font-semibold tracking-wide text-muted uppercase">
            Cercar
            <input
              className="field normal-case"
              defaultValue={queryText}
              name="q"
              placeholder="Nom, URL o SKU"
              type="search"
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold tracking-wide text-muted uppercase">
            Estat
            <select
              className="field normal-case"
              defaultValue={status}
              name="estat"
            >
              <option value="">Tots</option>
              <option value="published">Publicats</option>
              <option value="draft">Esborranys</option>
              <option value="archived">Arxivats</option>
            </select>
          </label>
        </InstantFilterForm>
        <div className="flex items-end gap-2">
          {queryText || status ? (
            <Link
              className="action bg-transparent text-foreground"
              href="/admin/productes"
            >
              Netejar
            </Link>
          ) : null}
          {mayManageInventory && locationId ? (
            <a className="action" href="#nou-producte">
              + Nou producte
            </a>
          ) : null}
        </div>
      </section>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <p>{visibleProducts.length} productes</p>
        <p>Obre una fitxa per editar-ne totes les dades.</p>
      </div>

      <section className="mt-4 grid gap-5" aria-label="Llista de productes">
        {visibleProducts.map((product) => {
          const variants = details.variants.filter(
            (variant) => variant.product_id === product.id,
          );
          const images = details.images.filter(
            (image) => image.product_id === product.id,
          );
          const selectedCategoryIds = details.assignments
            .filter((assignment) => assignment.product_id === product.id)
            .map((assignment) => assignment.category_id);
          const productInventory = inventory.filter((row) =>
            variants.some((variant) => variant.id === row.variant_id),
          );
          return (
            <details
              className="group overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_0_rgba(31,36,32,0.04)]"
              key={product.id}
            >
              <summary className="cursor-pointer list-none p-4 marker:hidden sm:p-5">
                <ProductSummary
                  product={product}
                  variants={variants}
                  images={images}
                  inventory={productInventory}
                  categories={details.categories.filter((category) =>
                    selectedCategoryIds.includes(category.id),
                  )}
                />
              </summary>
              <div className="border-t border-line bg-[#faf9f6] p-4 sm:p-6">
                <CatalogForm
                  product={product}
                  variants={variants}
                  categories={details.categories}
                  selectedCategoryIds={selectedCategoryIds}
                  images={images}
                  locationId={locationId}
                />
              </div>
            </details>
          );
        })}
        {visibleProducts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center">
            <h2 className="font-serif text-2xl">Cap producte coincideix</h2>
            <p className="mt-2 text-sm text-muted">
              Canvia la cerca o neteja els filtres.
            </p>
          </div>
        ) : null}
      </section>

      {mayManageInventory && locationId ? (
        <details
          id="nou-producte"
          className="mt-8 scroll-mt-6 rounded-xl border border-line bg-white p-5"
        >
          <summary className="cursor-pointer font-semibold">
            Crear un producte nou
          </summary>
          <CatalogCreateForm locationId={locationId} />
        </details>
      ) : null}
      <details className="mt-5 rounded-xl border border-line bg-white p-5">
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
    </main>
  );
}

function ProductSummary({
  product,
  variants,
  images,
  inventory,
  categories,
}: {
  product: StaffCatalogRow;
  variants: StaffCatalogVariant[];
  images: StaffCatalogImage[];
  inventory: InventoryRow[];
  categories: StaffCategory[];
}) {
  const image = images.toSorted((a, b) => a.sort_order - b.sort_order)[0];
  const fallback = demoProductImage(product.slug);
  const activeVariants = variants.filter((variant) => variant.is_active);
  const available = inventory.reduce(
    (sum, row) => sum + Math.max(0, row.on_hand - row.reserved),
    0,
  );
  const onHand = inventory.reduce((sum, row) => sum + row.on_hand, 0);
  const reserved = inventory.reduce((sum, row) => sum + row.reserved, 0);
  const sizes = [...new Set(variants.map((variant) => variant.size))];
  const colors = [...new Set(variants.map((variant) => variant.color))];
  const prices = variants.map((variant) => variant.price_minor);
  const price = prices.length ? formatPrice(Math.min(...prices)) : "Sense preu";
  const statusCopy = {
    published: "Publicat",
    draft: "Esborrany",
    archived: "Arxivat",
  }[product.status];

  return (
    <div className="grid gap-5 sm:grid-cols-[8rem_1fr] lg:grid-cols-[9rem_1fr_auto]">
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-sand">
        {image || fallback ? (
          <Image
            alt={image?.alt_text ?? `Fotografia provisional de ${product.name}`}
            className="object-cover"
            fill
            sizes="144px"
            src={image ? `/media/products/${image.id}` : fallback!}
          />
        ) : (
          <div className="grid h-full place-items-center p-3 text-center text-xs text-muted">
            Sense fotografia
          </div>
        )}
        {!image && fallback ? (
          <span className="absolute right-2 bottom-2 rounded-full bg-white/90 px-2 py-1 text-[0.6rem] tracking-wide uppercase">
            Demo
          </span>
        ) : null}
      </div>
      <div className="min-w-0 self-center">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase ${product.status === "published" ? "bg-[#dce8df] text-[#274a38]" : "bg-sand text-muted"}`}
          >
            {statusCopy}
          </span>
          {categories.map((category) => (
            <span
              className="rounded-full border border-line px-2.5 py-1 text-[0.68rem]"
              key={category.id}
            >
              {category.name}
            </span>
          ))}
        </div>
        <h2 className="mt-3 font-serif text-2xl sm:text-3xl">{product.name}</h2>
        <p className="mt-1 text-sm text-muted">/{product.slug}</p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <strong>{price}</strong>
          <span>{variants.length} variants</span>
          <span>{activeVariants.length} visibles</span>
          <span>Talles: {sizes.join(", ") || "—"}</span>
          <span>Colors: {colors.join(", ") || "—"}</span>
        </div>
        {variants.length ? (
          <div
            className="mt-3 flex flex-wrap gap-2"
            aria-label="Estoc per variant"
          >
            {variants.map((variant) => {
              const variantStock = inventory
                .filter((row) => row.variant_id === variant.id)
                .reduce(
                  (sum, row) => sum + Math.max(0, row.on_hand - row.reserved),
                  0,
                );
              return (
                <span
                  className={`rounded-md border px-2.5 py-1 text-xs ${variantStock <= 3 ? "border-[#e7b89e] bg-[#fff8f3] text-[#914724]" : "border-line bg-white"}`}
                  key={variant.id}
                >
                  {variant.size} · {variant.color} · {variantStock} u.
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-2 self-center sm:col-start-2 lg:col-start-auto">
        <StockMetric
          label="Disponible"
          value={available}
          alert={available <= 3}
        />
        <StockMetric label="Físic" value={onHand} />
        <StockMetric label="Reservat" value={reserved} />
        <span className="col-span-3 mt-1 text-right text-xs font-semibold text-[#315545] group-open:hidden">
          Veure i editar ↓
        </span>
        <span className="col-span-3 mt-1 hidden text-right text-xs font-semibold text-[#315545] group-open:block">
          Tancar ↑
        </span>
      </div>
    </div>
  );
}

function StockMetric({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <span
      className={`min-w-20 rounded-lg p-2.5 text-center ${alert ? "bg-[#fff0e7] text-[#914724]" : "bg-sand"}`}
    >
      <strong className="block text-lg">{value}</strong>
      <span className="text-[0.65rem] uppercase">{label}</span>
    </span>
  );
}

function formatPrice(amountMinor: number) {
  return new Intl.NumberFormat("ca-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amountMinor / 100);
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
