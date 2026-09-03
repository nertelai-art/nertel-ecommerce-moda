import Link from "next/link";
import { notFound } from "next/navigation";
import { catalogPageSchema, displayPrice } from "@/features/catalog/product";
import { listCatalog } from "@/server/repositories/catalog";
import { ProductPlaceholder } from "@/components/catalog/product-placeholder";

export const metadata = { title: "Col·lecció" };

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const query = await searchParams;
  const parsed = catalogPageSchema.safeParse(query.page ?? 1);
  if (Array.isArray(query.page) || !parsed.success) notFound();
  const page = parsed.data;
  const { products, hasNext } = await listCatalog(page);
  return (
    <main id="main" className="mx-auto w-full max-w-7xl px-6 py-12 sm:px-12">
      <p className="text-xs tracking-[0.2em] uppercase text-muted">
        Per descobrir
      </p>
      <h1 className="mt-3 font-serif text-4xl sm:text-5xl">La col·lecció</h1>
      <p className="mt-5 max-w-xl leading-relaxed text-muted">
        Una primera mirada a les peces de la botiga. Les compres encara no estan
        disponibles.
      </p>
      {products.length === 0 ? (
        <p className="my-16 text-lg">
          Encara no hi ha peces en aquesta pàgina.
        </p>
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
          {products.map((product) => (
            <li key={product.id}>
              <Link href={`/productes/${product.slug}`} className="block">
                <ProductPlaceholder />
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
        {page > 1 ? (
          <Link className="action" href={`/cataleg?page=${page - 1}`}>
            Anterior
          </Link>
        ) : null}
        <span className="text-sm text-muted">Pàgina {page}</span>
        {hasNext ? (
          <Link className="action" href={`/cataleg?page=${page + 1}`}>
            Següent
          </Link>
        ) : null}
      </nav>
    </main>
  );
}
