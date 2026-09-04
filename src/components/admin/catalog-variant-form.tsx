"use client";
import { useActionState } from "react";
import {
  createCatalogVariant,
  updateCatalogVariant,
} from "@/server/catalog/actions";
import type { StaffCatalogVariant } from "@/features/catalog/admin";

const initialState = { ok: false, message: "" };

export function CatalogVariantCreateForm({
  productId,
  locationId,
}: {
  productId: string;
  locationId: string;
}) {
  const [state, action, pending] = useActionState(
    createCatalogVariant,
    initialState,
  );
  return (
    <form
      action={action}
      className="mt-4 grid gap-3 border-l-2 border-line pl-4"
    >
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="locationId" value={locationId} />
      <h4 className="font-medium">Afegir variant</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1">
          SKU
          <input
            className="field"
            name="sku"
            pattern="[A-Z0-9][A-Z0-9._-]*"
            maxLength={80}
            required
          />
        </label>
        <label className="grid gap-1">
          Talla
          <input className="field" name="size" maxLength={40} required />
        </label>
        <label className="grid gap-1">
          Color
          <input className="field" name="color" maxLength={80} required />
        </label>
        <label className="grid gap-1">
          Preu en cèntims
          <input
            className="field"
            type="number"
            name="priceMinor"
            min="0"
            required
          />
        </label>
      </div>
      <button className="action" disabled={pending}>
        {pending ? "Creant…" : "Afegir variant inactiva"}
      </button>
      <p role="status" aria-live="polite">
        {state.message}
      </p>
    </form>
  );
}

export function CatalogVariantForm({
  variant,
}: {
  variant: StaffCatalogVariant;
}) {
  const [state, action, pending] = useActionState(
    updateCatalogVariant,
    initialState,
  );
  return (
    <form action={action} className="grid gap-3 border-l-2 border-line pl-4">
      <input type="hidden" name="id" value={variant.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1">
          SKU
          <input
            className="field"
            name="sku"
            defaultValue={variant.sku}
            maxLength={80}
            required
          />
        </label>
        <label className="grid gap-1">
          Talla
          <input
            className="field"
            name="size"
            defaultValue={variant.size}
            maxLength={40}
            required
          />
        </label>
        <label className="grid gap-1">
          Color
          <input
            className="field"
            name="color"
            defaultValue={variant.color}
            maxLength={80}
            required
          />
        </label>
        <label className="grid gap-1">
          Preu en cèntims
          <input
            className="field"
            type="number"
            name="priceMinor"
            min="0"
            defaultValue={variant.price_minor}
            required
          />
        </label>
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="isActive"
          value="true"
          defaultChecked={variant.is_active}
        />{" "}
        Visible al catàleg públic
      </label>
      <button className="action" disabled={pending}>
        {pending ? "Desant…" : "Desar variant"}
      </button>
      <p role="status" aria-live="polite">
        {state.message}
      </p>
    </form>
  );
}
