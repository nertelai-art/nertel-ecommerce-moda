import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { ProductImage } from "@/components/catalog/product-image";
import {
  catalogQuerySchema,
  demoProductImage,
  displayPrice,
  type CatalogQuery,
  type CatalogProduct,
} from "@/features/catalog/product";
import {
  listCatalog,
  listCatalogCategories,
  listCatalogFacets,
} from "@/server/repositories/catalog";

export const metadata = { title: "Col·lecció" };
type RawQuery = Record<string, string | string[] | undefined>;

function catalogHref(filters: CatalogQuery, page = 1) {
  const params = new URLSearchParams();
  const entries: Array<[string, string]> = [
    ["q", filters.query],
    ["categoria", filters.category],
    ["talla", filters.size],
    ["color", filters.color],
    ["preu", filters.price],
    ["ordre", filters.sort === "name-asc" ? "" : filters.sort],
    ["page", page > 1 ? String(page) : ""],
  ];
  for (const [key, value] of entries) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/cataleg?${query}` : "/cataleg";
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<RawQuery>;
}) {
  const query = await searchParams;
  if (Object.values(query).some(Array.isArray)) notFound();
  const parsed = catalogQuerySchema.safeParse({
    page: query.page ?? 1,
    query: query.q ?? "",
    category: query.categoria ?? "",
    size: query.talla ?? "",
    color: query.color ?? "",
    price: query.preu ?? "",
    sort: query.ordre ?? "name-asc",
  });
  if (!parsed.success) notFound();
  const filters = parsed.data;
  const [{ products, hasNext }, categories, facets] = await Promise.all([
    listCatalog(filters),
    listCatalogCategories(),
    listCatalogFacets(),
  ]);
  const filtered = Boolean(
    filters.query ||
    filters.category ||
    filters.size ||
    filters.color ||
    filters.price,
  );

  return (
    <main id="main">
      <section className="relative isolate min-h-80 overflow-hidden bg-[#d4ccc0] text-white sm:min-h-[28rem]">
        <Image
          alt="Campanya editorial de la col·lecció mediterrània"
          className="object-cover object-[64%_42%]"
          fill
          priority
          sizes="100vw"
          src="/editorial/campaign-hero.png"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,18,15,.9)_0%,rgba(17,18,15,.68)_42%,rgba(17,18,15,.2)_78%)]" />
        <div className="relative mx-auto flex min-h-80 max-w-7xl flex-col justify-end px-6 py-12 sm:min-h-[28rem] sm:px-12 sm:py-16">
          <div className="max-w-2xl border-l border-white/70 pl-5 text-shadow-lg sm:pl-8">
            <p className="text-xs font-semibold tracking-[0.24em] uppercase">
              Edició 01 · 2026
            </p>
            <h1 className="mt-4 font-serif text-5xl leading-[0.92] tracking-tight sm:text-7xl">
              La col·lecció mediterrània.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-white sm:text-base">
              Peces de demostració per explorar una experiència de compra
              completa. Cap cobrament real està habilitat.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-12 sm:py-16">
        <nav
          className="flex gap-3 overflow-x-auto border-b border-line pb-5"
          aria-label="Categories"
        >
          <Category
            active={!filters.category}
            href={catalogHref({ ...filters, category: "" })}
          >
            Tot
          </Category>
          {categories.map((category) => (
            <Category
              active={filters.category === category.slug}
              href={catalogHref({ ...filters, category: category.slug })}
              key={category.id}
            >
              {category.name}
            </Category>
          ))}
        </nav>

        <div className="mt-6 border-b border-line pb-6">
          <Filters filters={filters} facets={facets} filtered={filtered} />
        </div>

        <section className="mt-10" aria-labelledby="results-title">
          <div className="flex items-end justify-between gap-5 border-b border-line pb-5">
            <div>
              <p className="text-xs tracking-[0.2em] text-muted uppercase">
                Selecció actual
              </p>
              <h2 id="results-title" className="mt-2 font-serif text-3xl">
                {products.length === 1 ? "1 peça" : `${products.length} peces`}
              </h2>
            </div>
            <p className="hidden max-w-xs text-right text-xs leading-relaxed text-muted sm:block">
              La disponibilitat definitiva es confirma quan reserves el carret.
            </p>
          </div>
          {products.length ? (
            <ProductGrid products={products} />
          ) : (
            <EmptyResults />
          )}
          <nav
            aria-label="Paginació"
            className="mt-14 flex items-center justify-between border-t border-line pt-6"
          >
            {filters.page > 1 ? (
              <Link
                className="min-h-11 text-sm underline underline-offset-4"
                href={catalogHref(filters, filters.page - 1)}
              >
                ← Anterior
              </Link>
            ) : (
              <span />
            )}
            <span className="text-xs tracking-[0.16em] text-muted uppercase">
              Pàgina {filters.page}
            </span>
            {hasNext ? (
              <Link
                className="min-h-11 text-sm underline underline-offset-4"
                href={catalogHref(filters, filters.page + 1)}
              >
                Següent →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </section>
      </div>
    </main>
  );
}

function Category({
  active,
  children,
  href,
}: {
  active: boolean;
  children: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-colors hover:border-foreground ${active ? "border-foreground bg-foreground text-white" : "border-line"}`}
      href={href}
    >
      {children}
    </Link>
  );
}

function ProductGrid({ products }: { products: CatalogProduct[] }) {
  return (
    <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product, index) => {
        const variant = product.variants[0];
        const colors = [...new Set(product.variants.map(({ color }) => color))];
        return (
          <li className="group" key={product.id}>
            <Link className="block" href={`/productes/${product.slug}`}>
              <div className="relative overflow-hidden">
                <ProductImage
                  fallbackSrc={demoProductImage(product.slug)}
                  image={product.images[0]}
                  priority={index < 3}
                  sizes="(max-width: 768px) 50vw, (max-width: 1280px) 31vw, 25vw"
                />
                <span className="absolute top-3 left-3 bg-background/90 px-2.5 py-1.5 text-[0.6rem] tracking-[0.16em] uppercase backdrop-blur-sm">
                  Prova
                </span>
              </div>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-serif text-xl leading-tight">
                    {product.name}
                  </h3>
                  <p className="mt-1 text-xs capitalize text-muted">
                    {colors.join(" · ")}
                  </p>
                </div>
                <p className="shrink-0 text-sm">{displayPrice(product)}</p>
              </div>
            </Link>
            {variant ? (
              <div className="mt-4 border-t border-line pt-3">
                <AddToCartButton
                  variantId={variant.id}
                  label={`${product.name}, ${variant.size}, ${variant.color}`}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function EmptyResults() {
  return (
    <div className="my-20 max-w-xl" role="status">
      <h3 className="font-serif text-3xl">
        No hi ha cap peça amb aquesta combinació.
      </h3>
      <p className="mt-4 leading-relaxed text-muted">
        Prova d&apos;eliminar algun filtre o torna a veure tota la col·lecció.
      </p>
      <Link className="action mt-7 rounded-none" href="/cataleg">
        Veure-ho tot
      </Link>
    </div>
  );
}

function Filters({
  filters,
  facets,
  filtered,
}: {
  filters: CatalogQuery;
  facets: { sizes: string[]; colors: string[] };
  filtered: boolean;
}) {
  return (
    <form
      action="/cataleg"
      method="get"
      aria-label="Filtres de productes"
      className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(11rem,1.45fr)_repeat(4,minmax(7.5rem,1fr))_auto]"
    >
      {filters.category ? (
        <input type="hidden" name="categoria" value={filters.category} />
      ) : null}
      <Field label="Cerca">
        <input
          className="field text-sm font-normal normal-case"
          type="search"
          name="q"
          defaultValue={filters.query}
          maxLength={80}
          placeholder="Camisa, jaqueta..."
        />
      </Field>
      <Field label="Talla">
        <select
          className="field text-sm font-normal normal-case"
          name="talla"
          defaultValue={filters.size}
        >
          <option value="">Totes</option>
          {facets.sizes.map((size) => (
            <option key={size}>{size}</option>
          ))}
        </select>
      </Field>
      <Field label="Color">
        <select
          className="field text-sm font-normal capitalize"
          name="color"
          defaultValue={filters.color}
        >
          <option value="">Tots</option>
          {facets.colors.map((color) => (
            <option key={color}>{color}</option>
          ))}
        </select>
      </Field>
      <Field label="Preu">
        <select
          className="field text-sm font-normal normal-case"
          name="preu"
          defaultValue={filters.price}
        >
          <option value="">Qualsevol preu</option>
          <option value="under-60">Menys de 60 €</option>
          <option value="60-80">De 60 € a 80 €</option>
          <option value="over-80">Més de 80 €</option>
        </select>
      </Field>
      <Field label="Ordre">
        <select
          className="field text-sm font-normal normal-case"
          name="ordre"
          defaultValue={filters.sort}
        >
          <option value="name-asc">Nom, A–Z</option>
          <option value="name-desc">Nom, Z–A</option>
        </select>
      </Field>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
        <button
          className="action flex-1 whitespace-nowrap rounded-none"
          type="submit"
        >
          Aplicar
        </button>
        {filtered ? (
          <Link
            aria-label="Netejar tots els filtres"
            className="inline-flex min-h-11 items-center border border-line px-3 text-sm"
            href="/cataleg"
          >
            ×
          </Link>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-2 text-xs font-semibold tracking-wide uppercase">
      {label}
      {children}
    </label>
  );
}
