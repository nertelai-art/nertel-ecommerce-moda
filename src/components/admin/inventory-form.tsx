"use client";

import { useActionState } from "react";
import { adjustInventory } from "@/server/inventory/actions";
import type { InventoryRow } from "@/features/inventory/validation";

export function InventoryForm({
  row,
  requestKey,
}: {
  row: InventoryRow;
  requestKey: string;
}) {
  const [state, action, pending] = useActionState(adjustInventory, {
    ok: false,
    message: "",
  });
  return (
    <form action={action} className="grid gap-3 border-t border-line pt-4">
      <input type="hidden" name="variantId" value={row.variant_id} />
      <input type="hidden" name="locationId" value={row.location_id} />
      <input type="hidden" name="idempotencyKey" value={requestKey} />
      <label className="grid gap-2">
        Variació d’estoc
        <input
          className="field"
          name="quantity"
          type="number"
          min="-100000"
          max="100000"
          required
        />
      </label>
      <label className="grid gap-2">
        Motiu
        <input className="field" name="reason" maxLength={500} required />
      </label>
      <button className="action" disabled={pending}>
        {pending ? "Desant…" : "Registrar ajust"}
      </button>
      <p role="status" aria-live="polite">
        {state.message}
      </p>
    </form>
  );
}
