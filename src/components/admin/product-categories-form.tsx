"use client";
import { useActionState } from "react";
import { updateProductCategories } from "@/server/catalog/actions";
import type { StaffCategory } from "@/features/catalog/admin";

export function ProductCategoriesForm({
  productId,
  categories,
  selected,
}: {
  productId: string;
  categories: StaffCategory[];
  selected: string[];
}) {
  const [state, action, pending] = useActionState(updateProductCategories, {
    ok: false,
    message: "",
  });
  return (
    <form action={action} className="grid gap-3 border-l-2 border-line pl-4">
      <input type="hidden" name="productId" value={productId} />
      <h4 className="font-medium">Categories</h4>
      {categories.length ? (
        <div className="flex flex-wrap gap-4">
          {categories.map((category) => (
            <label key={category.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                name="categoryIds"
                value={category.id}
                defaultChecked={selected.includes(category.id)}
              />
              {category.name}
              {category.is_active ? "" : " (inactiva)"}
            </label>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">
          Crea una categoria abans d’assignar-la.
        </p>
      )}
      <button className="action" disabled={pending}>
        {pending ? "Desant…" : "Desar categories"}
      </button>
      <p role="status" aria-live="polite">
        {state.message}
      </p>
    </form>
  );
}
