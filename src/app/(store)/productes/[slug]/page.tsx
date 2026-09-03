import Link from "next/link";
import { notFound } from "next/navigation";
import { findCatalogProduct } from "@/server/repositories/catalog";
import { displayPrice } from "@/features/catalog/product";
import { ProductPlaceholder } from "@/components/catalog/product-placeholder";

export const metadata = { title: "Detall de la peça" };

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await findCatalogProduct(slug);
  if (!product) notFound();
  return (
    <main id="main" className="mx-auto w-full max-w-7xl px-6 py-10 sm:px-12">
      <Link
        className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
        href="/cataleg"
      >
        ← Tornar a la col·lecció
      </Link>
      <div className="mt-6 grid items-start gap-10 md:grid-cols-2 md:gap-16">
        <ProductPlaceholder />
        <section className="py-4" aria-labelledby="product-title">
          <h1
            id="product-title"
            className="font-serif text-4xl leading-tight sm:text-5xl"
          >
            {product.name}
          </h1>
          <p className="mt-6 text-xl">{displayPrice(product)}</p>
          <p className="mt-8 whitespace-pre-line leading-relaxed text-muted">
            {product.description}
          </p>
          {product.variants.length > 0 ? (
            <div className="mt-10 border-t border-line pt-6">
              <h2 className="text-sm font-semibold">
                Talles i colors del catàleg
              </h2>
              <ul className="mt-4 flex flex-wrap gap-3">
                {product.variants.map((variant) => (
                  <li
                    key={variant.id}
                    className="border border-muted px-4 py-3 text-sm"
                  >
                    {variant.size} · {variant.color}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="mt-10 bg-sand p-5 text-sm leading-relaxed">
            Aquesta peça encara no es pot comprar. La disponibilitat es
            confirmarà quan obrim la botiga.
          </p>
        </section>
      </div>
    </main>
  );
}
