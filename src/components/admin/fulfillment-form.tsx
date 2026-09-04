"use client";
import { useActionState } from "react";
import { advanceShipment, createShipment } from "@/server/fulfillment/actions";
import {
  shipmentCopy,
  type FulfillmentRow,
} from "@/features/fulfillment/validation";
const initial = { ok: false, message: "" };
const next = {
  pending: "packing",
  packing: "ready",
  ready: "shipped",
  shipped: "delivered",
  delivered: null,
} as const;
export function FulfillmentForm({ row }: { row: FulfillmentRow }) {
  const [state, create, pending] = useActionState(createShipment, initial);
  const [advanceState, advance, advancing] = useActionState(
    advanceShipment,
    initial,
  );
  if (!row.shipment_id)
    return (
      <form action={create} className="grid gap-3">
        <input name="orderId" type="hidden" value={row.order_id} />
        <label className="grid gap-1 text-xs uppercase">
          Notes de preparació
          <textarea
            className="field normal-case"
            maxLength={1000}
            name="notes"
          />
        </label>
        <button className="action" disabled={pending}>
          {pending ? "Creant…" : "Iniciar preparació"}
        </button>
        <p role="status">{state.message}</p>
      </form>
    );
  const target = next[row.shipment_status!];
  if (!target)
    return <p className="text-sm text-muted">Expedició completada.</p>;
  return (
    <form action={advance} className="grid gap-3 sm:grid-cols-2">
      <input name="shipmentId" type="hidden" value={row.shipment_id} />
      <input name="status" type="hidden" value={target} />
      <label className="grid gap-1 text-xs uppercase">
        Transportista
        <input
          className="field normal-case"
          defaultValue={row.carrier ?? ""}
          name="carrier"
          required={target === "shipped"}
        />
      </label>
      <label className="grid gap-1 text-xs uppercase">
        Seguiment
        <input
          className="field normal-case"
          defaultValue={row.tracking_number ?? ""}
          name="tracking"
          required={target === "shipped"}
        />
      </label>
      <label className="grid gap-1 text-xs uppercase sm:col-span-2">
        Nota
        <input className="field normal-case" name="note" />
      </label>
      <button className="action sm:col-span-2" disabled={advancing}>
        {advancing ? "Actualitzant…" : `Marcar com: ${shipmentCopy[target]}`}
      </button>
      <p className="sm:col-span-2" role="status">
        {advanceState.message}
      </p>
    </form>
  );
}
