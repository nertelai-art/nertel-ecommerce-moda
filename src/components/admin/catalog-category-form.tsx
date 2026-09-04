"use client";
import { useActionState } from "react";
import {
  createCatalogCategory,
  updateCatalogCategory,
} from "@/server/catalog/actions";
import type { StaffCategory } from "@/features/catalog/admin";

const initialState = { ok: false, message: "" };

export function CatalogCategoryCreateForm() {
  const [state, action, pending] = useActionState(
    createCatalogCategory,
    initialState,
  );
  return (
    <form
      action={action}
      className="grid gap-3 border border-line bg-sand p-5 sm:grid-cols-2"
    >
      <h3 className="font-semibold sm:col-span-2">Nova categoria</h3>
      <label className="grid gap-1">
        Nom
        <input className="field" name="name" maxLength={120} required />
      </label>
      <label className="grid gap-1">
        Adreça pública
        <input
          className="field"
          name="slug"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          maxLength={160}
          required
        />
      </label>
      <button className="action sm:col-span-2" disabled={pending}>
        {pending ? "Creant…" : "Crear categoria inactiva"}
      </button>
      <p className="sm:col-span-2" role="status" aria-live="polite">
        {state.message}
      </p>
    </form>
  );
}

export function CatalogCategoryForm({ category }: { category: StaffCategory }) {
  const [state, action, pending] = useActionState(
    updateCatalogCategory,
    initialState,
  );
  return (
    <form
      action={action}
      className="grid gap-3 border border-line bg-white p-4 sm:grid-cols-2"
    >
      <input type="hidden" name="id" value={category.id} />
      <label className="grid gap-1">
        Nom
        <input
          className="field"
          name="name"
          defaultValue={category.name}
          maxLength={120}
          required
        />
      </label>
      <label className="grid gap-1">
        Adreça pública
        <input
          className="field"
          name="slug"
          defaultValue={category.slug}
          maxLength={160}
          required
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="isActive"
          value="true"
          defaultChecked={category.is_active}
        />{" "}
        Activa
      </label>
      <button className="action" disabled={pending}>
        {pending ? "Desant…" : "Desar categoria"}
      </button>
      <p className="sm:col-span-2" role="status" aria-live="polite">
        {state.message}
      </p>
    </form>
  );
}
