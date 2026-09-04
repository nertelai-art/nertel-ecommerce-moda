import Link from "next/link";
import { notFound } from "next/navigation";
import {
  catalogQuerySchema,
  displayPrice,
  type CatalogQuery,
} from "@/features/catalog/product";
import {
  listCatalog,
  listCatalogCategories,
} from "@/server/repositories/catalog";
import { ProductImage } from "@/components/catalog/product-image";

export const metadata = { title: "Col·lecció" };

function catalogHref(filters: CatalogQuery, page: number) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.category) params.set("categoria", filters.category);
  if (filters.sort !== "name-asc") params.set("ordre", filters.sort);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/cataleg?${query}` : "/cataleg";
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string | string[];
    q?: string | string[];
    categoria?: string | string[];
    ordre?: string | string[];
  }>;
}) {
  const query = await searchParams;
  if (
    Array.isArray(query.page) ||
    Array.isArray(query.q) ||
    Array.isArray(query.categoria) ||
    Array.isArray(query.ordre)
  )
    notFound();
  const parsed = catalogQuerySchema.safeParse({
    page: query.page ?? 1,
    query: query.q ?? "",
    category: query.categoria ?? "",
    sort: query.ordre ?? "name-asc",
  });
  if (!parsed.success) notFound();
  const filters = parsed.data;
  const [{ products, hasNext }, categories] = await Promise.all([
    listCatalog(filters),
    listCatalogCategories(),
  ]);
  return (
    <main id="main" className="mx-auto w-full max-w-7xl px-6 py-12 sm:px-12">
      <p className="text-xs tracking-[0.2em] uppercase text-muted">
        Per descobrir
      </p>
      <h1 className="mt-3 font-serif text-4xl sm:text-5xl">La col·lecció</h1>
      <p className="mt-5 max-w-xl leading-relaxed text-muted">
        Descobreix les peces disponibles i prepara la comanda. El cobrament
        continuarà desactivat fins que Stripe estigui connectat.
      </p>
      <form
        action="/cataleg"
        method="get"
        className="mt-8 grid gap-4 border border-line bg-sand p-5 md:grid-cols-3"
        aria-label="Cerca i filtres del catàleg"
      >
        <label className="grid gap-2">
          Cerca
          <input
            className="field"
            type="search"
            name="q"
            defaultValue={filters.query}
            maxLength={80}
            placeholder="Nom de la peça"
          />
        </label>
        <label className="grid gap-2">
          Categoria
          <select
            className="field"
            name="categoria"
            defaultValue={filters.category}
          >
            <option value="">Totes les categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          Ordenació
          <select className="field" name="ordre" defaultValue={filters.sort}>
            <option value="name-asc">Nom, A–Z</option>
            <option value="name-desc">Nom, Z–A</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-3 md:col-span-3">
          <button className="action" type="submit">
            Aplicar
          </button>
          <Link className="action" href="/cataleg">
            Netejar filtres
          </Link>
        </div>
      </form>
      {products.length === 0 ? (
        <p className="my-16 text-lg" role="status">
          No hem trobat cap peça amb aquests criteris.
        </p>
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
          {products.map((product) => (
            <li key={product.id}>
              <Link href={`/productes/${product.slug}`} className="block">
                <ProductImage
                  image={product.images[0]}
                  sizes="(max-width: 1024px) 50vw, 25vw"
                />
                <h2 className="mt-4 text-base font-medium">{product.name}</h2>
                <p className="mt-2 text-sm text-muted">
                  {displayPrice(product)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <nav
        aria-label="Paginació del catàleg"
        className="mt-12 flex items-center gap-6"
      >
        {filters.page > 1 ? (
          <Link
            className="action"
            href={catalogHref(filters, filters.page - 1)}
          >
            Anterior
          </Link>
        ) : null}
        <span className="text-sm text-muted">Pàgina {filters.page}</span>
        {hasNext ? (
          <Link
            className="action"
            href={catalogHref(filters, filters.page + 1)}
          >
            Següent
          </Link>
        ) : null}
      </nav>
    </main>
  );
}
