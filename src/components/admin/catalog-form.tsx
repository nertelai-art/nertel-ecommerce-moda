"use client";
import { useActionState } from "react";
import { updateCatalogProduct } from "@/server/catalog/actions";
import type { StaffCatalogRow } from "@/features/catalog/admin";

export function CatalogForm({ product }: { product: StaffCatalogRow }) {
  const [state, action, pending] = useActionState(updateCatalogProduct, {
    ok: false,
    message: "",
  });
  return (
    <form
      action={action}
      className="grid gap-3 border border-line bg-white p-5"
    >
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
  );
}
