"use client";
import { useActionState } from "react";
import Image from "next/image";
import type { StaffCatalogImage } from "@/features/catalog/image";
import {
  deleteCatalogImage,
  updateCatalogImage,
} from "@/server/catalog/image-actions";

const initialState = { ok: false, message: "" };

export function CatalogImageUploadForm({ productId }: { productId: string }) {
  return (
    <form
      action="/api/admin/product-images"
      method="post"
      encType="multipart/form-data"
      className="grid gap-3 border-l-2 border-line pl-4"
    >
      <input type="hidden" name="productId" value={productId} />
      <h4 className="font-medium">Afegir fotografia</h4>
      <label className="grid gap-1">
        Arxiu JPEG, PNG o WebP (màxim 5 MB)
        <input
          className="field"
          type="file"
          name="image"
          accept="image/jpeg,image/png,image/webp"
          required
        />
      </label>
      <label className="grid gap-1">
        Text alternatiu
        <input className="field" name="altText" maxLength={240} required />
      </label>
      <label className="grid gap-1">
        Ordre
        <input
          className="field"
          type="number"
          name="sortOrder"
          min="0"
          max="99"
          defaultValue="0"
          required
        />
      </label>
      <button className="action" type="submit">
        Pujar fotografia
      </button>
    </form>
  );
}

export function CatalogImageForm({
  image,
  publiclyVisible,
}: {
  image: StaffCatalogImage;
  publiclyVisible: boolean;
}) {
  const [updateState, updateAction, updating] = useActionState(
    updateCatalogImage,
    initialState,
  );
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteCatalogImage,
    initialState,
  );
  return (
    <article className="grid gap-3 border-l-2 border-line pl-4 sm:grid-cols-[8rem_1fr]">
      {publiclyVisible ? (
        <div className="relative aspect-[3/4] overflow-hidden bg-sand">
          <Image
            src={`/media/products/${image.id}`}
            alt=""
            fill
            sizes="128px"
            className="object-cover"
          />
        </div>
      ) : (
        <p className="bg-sand p-3 text-sm">
          Previsualització disponible quan el producte estigui publicat.
        </p>
      )}
      <div className="grid gap-3">
        <form action={updateAction} className="grid gap-3">
          <input type="hidden" name="id" value={image.id} />
          <label className="grid gap-1">
            Text alternatiu
            <input
              className="field"
              name="altText"
              defaultValue={image.alt_text}
              maxLength={240}
              required
            />
          </label>
          <label className="grid gap-1">
            Ordre
            <input
              className="field"
              type="number"
              name="sortOrder"
              defaultValue={image.sort_order}
              min="0"
              max="99"
              required
            />
          </label>
          <p className="text-xs text-muted">
            {image.mime_type} · {Math.ceil(image.byte_size / 1024)} KiB
          </p>
          <button className="action" disabled={updating}>
            {updating ? "Desant…" : "Desar fotografia"}
          </button>
          <p role="status" aria-live="polite">
            {updateState.message}
          </p>
        </form>
        <form action={deleteAction}>
          <input type="hidden" name="id" value={image.id} />
          <button className="action" disabled={deleting}>
            {deleting ? "Eliminant…" : "Eliminar fotografia"}
          </button>
          <p role="status" aria-live="polite">
            {deleteState.message}
          </p>
        </form>
      </div>
    </article>
  );
}
