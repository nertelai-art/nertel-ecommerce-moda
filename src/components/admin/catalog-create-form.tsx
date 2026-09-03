"use client";
import { useActionState } from "react";
import { createCatalogProduct } from "@/server/catalog/actions";
export function CatalogCreateForm({ locationId }: { locationId: string }) {
  const [state, action, pending] = useActionState(createCatalogProduct, {
    ok: false,
    message: "",
  });
  return (
    <form
      action={action}
      className="mt-5 grid gap-3 border border-line bg-sand p-5"
    >
      <input type="hidden" name="locationId" value={locationId} />
      <h3 className="font-semibold">Nou producte amb primera variant</h3>
      <label className="grid gap-2">
        Nom
        <input className="field" name="name" required />
      </label>
      <label className="grid gap-2">
        Adreça pública
        <input
          className="field"
          name="slug"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          required
        />
      </label>
      <label className="grid gap-2">
        Descripció
        <textarea className="field" name="description" />
      </label>
      <label className="grid gap-2">
        SKU
        <input
          className="field"
          name="sku"
          pattern="[A-Z0-9][A-Z0-9._-]*"
          required
        />
      </label>
      <label className="grid gap-2">
        Talla
        <input className="field" name="size" required />
      </label>
      <label className="grid gap-2">
        Color
        <input className="field" name="color" required />
      </label>
      <label className="grid gap-2">
        Preu en cèntims
        <input
          className="field"
          type="number"
          name="priceMinor"
          min="0"
          required
        />
      </label>
      <button className="action" disabled={pending}>
        {pending ? "Creant…" : "Crear esborrany"}
      </button>
      <p role="status">{state.message}</p>
    </form>
  );
}
