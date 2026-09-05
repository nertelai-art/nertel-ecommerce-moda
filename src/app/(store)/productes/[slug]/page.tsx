import Link from "next/link";
import { notFound } from "next/navigation";
import { findCatalogProduct } from "@/server/repositories/catalog";
import { demoProductImage, displayPrice } from "@/features/catalog/product";
import { ProductImage } from "@/components/catalog/product-image";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";

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
        <div className="grid gap-4">
          <ProductImage
            image={product.images[0]}
            fallbackSrc={demoProductImage(product.slug)}
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
          {product.images.length > 1 ? (
            <ul className="grid grid-cols-3 gap-3" aria-label="Més fotografies">
              {product.images.slice(1).map((image) => (
                <li key={image.id}>
                  <ProductImage
                    image={image}
                    sizes="(max-width: 768px) 33vw, 16vw"
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <section className="py-4" aria-labelledby="product-title">
          <h1
            id="product-title"
            className="font-serif text-4xl leading-tight sm:text-5xl"
          >
            {product.name}
          </h1>
          <p className="mt-6 text-xl">{displayPrice(product)}</p>
          {product.categories.length ? (
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Categories">
              {product.categories.map((category) => (
                <li key={category.id} className="bg-sand px-3 py-1 text-xs">
                  {category.name}
                </li>
              ))}
            </ul>
          ) : null}
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
                    className="grid gap-3 border border-muted px-4 py-3 text-sm"
                  >
                    <span>
                      {variant.size} · {variant.color}
                    </span>
                    <AddToCartButton
                      variantId={variant.id}
                      label={`${product.name}, ${variant.size}, ${variant.color}`}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="mt-10 bg-sand p-5 text-sm leading-relaxed">
            Pots preparar el carret i reservar estoc. El cobrament encara no
            està habilitat.
          </p>
        </section>
      </div>
    </main>
  );
}
