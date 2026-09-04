"use client";
import { useActionState } from "react";
import { updateCatalogProduct } from "@/server/catalog/actions";
import type { StaffCatalogRow } from "@/features/catalog/admin";
import type {
  StaffCatalogVariant,
  StaffCategory,
} from "@/features/catalog/admin";
import {
  CatalogVariantCreateForm,
  CatalogVariantForm,
} from "./catalog-variant-form";
import { ProductCategoriesForm } from "./product-categories-form";
import type { StaffCatalogImage } from "@/features/catalog/image";
import { CatalogImageForm, CatalogImageUploadForm } from "./catalog-image-form";

export function CatalogForm({
  product,
  variants,
  categories,
  selectedCategoryIds,
  images,
  locationId,
}: {
  product: StaffCatalogRow;
  variants: StaffCatalogVariant[];
  categories: StaffCategory[];
  selectedCategoryIds: string[];
  images: StaffCatalogImage[];
  locationId: string | undefined;
}) {
  const [state, action, pending] = useActionState(updateCatalogProduct, {
    ok: false,
    message: "",
  });
  return (
    <article className="grid gap-6 border border-line bg-white p-5">
      <form action={action} className="grid gap-3">
        <input type="hidden" name="id" value={product.id} />
        <label className="grid gap-2">
          Nom
          <input
            className="field"
            name="name"
            defaultValue={product.name}
            maxLength={160}
            required
          />
        </label>
        <label className="grid gap-2">
          Adreça pública
          <input
            className="field"
            name="slug"
            defaultValue={product.slug}
            maxLength={160}
            required
          />
        </label>
        <label className="grid gap-2">
          Descripció
          <textarea
            className="field min-h-28"
            name="description"
            defaultValue={product.description}
            maxLength={10000}
          />
        </label>
        <label className="grid gap-2">
          Estat
          <select className="field" name="status" defaultValue={product.status}>
            <option value="draft">Esborrany</option>
            <option value="published">Publicat</option>
            <option value="archived">Arxivat</option>
          </select>
        </label>
        <button className="action" disabled={pending}>
          {pending ? "Desant…" : "Desar producte"}
        </button>
        <p role="status" aria-live="polite">
          {state.message}
        </p>
      </form>
      <ProductCategoriesForm
        productId={product.id}
        categories={categories}
        selected={selectedCategoryIds}
      />
      <section
        className="grid gap-4"
        aria-label={`Variants de ${product.name}`}
      >
        <h3 className="font-semibold">Variants</h3>
        {variants.map((variant) => (
          <CatalogVariantForm key={variant.id} variant={variant} />
        ))}
        {locationId ? (
          <CatalogVariantCreateForm
            productId={product.id}
            locationId={locationId}
          />
        ) : null}
      </section>
      <section
        className="grid gap-4"
        aria-label={`Fotografies de ${product.name}`}
      >
        <h3 className="font-semibold">Fotografies</h3>
        {images.map((image) => (
          <CatalogImageForm
            key={image.id}
            image={image}
            publiclyVisible={product.status === "published"}
          />
        ))}
        <CatalogImageUploadForm productId={product.id} />
      </section>
    </article>
  );
}
