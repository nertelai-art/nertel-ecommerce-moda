"use client";
import { useActionState } from "react";
import {
  createSupplier,
  linkSupplierProduct,
  updateSupplier,
} from "@/server/suppliers/actions";
import type { Supplier } from "@/features/suppliers/validation";
import type { StaffCatalogRow } from "@/features/catalog/admin";
const initial = { ok: false, message: "" };
export function SupplierCreateForm() {
  const [state, action, pending] = useActionState(createSupplier, initial);
  return (
    <form action={action} className="mt-5 grid gap-3 md:grid-cols-2">
      <Fields />
      <button className="action md:col-span-2" disabled={pending}>
        {pending ? "Creant…" : "Crear proveïdor"}
      </button>
      <p className="md:col-span-2" role="status">
        {state.message}
      </p>
    </form>
  );
}
export function SupplierEditForm({
  supplier,
  products,
}: {
  supplier: Supplier;
  products: StaffCatalogRow[];
}) {
  const [state, action, pending] = useActionState(updateSupplier, initial);
  const [linkState, linkAction, linkPending] = useActionState(
    linkSupplierProduct,
    initial,
  );
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={action} className="grid gap-3">
        <input name="id" type="hidden" value={supplier.id} />
        <Fields supplier={supplier} />
        <label className="grid gap-1 text-xs uppercase">
          Estat
          <select
            className="field normal-case"
            defaultValue={supplier.status}
            name="status"
          >
            <option value="active">Actiu</option>
            <option value="paused">En pausa</option>
            <option value="archived">Arxivat</option>
          </select>
        </label>
        <button className="action" disabled={pending}>
          {pending ? "Desant…" : "Desar canvis"}
        </button>
        <p role="status">{state.message}</p>
      </form>
      <form
        action={linkAction}
        className="grid content-start gap-3 border-l-0 border-line lg:border-l lg:pl-6"
      >
        <input name="supplierId" type="hidden" value={supplier.id} />
        <h3 className="font-serif text-xl">Vincular producte</h3>
        <label className="grid gap-1 text-xs uppercase">
          Producte
          <select className="field normal-case" name="productId" required>
            <option value="">Selecciona…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs uppercase">
          Referència del proveïdor
          <input className="field normal-case" name="supplierSku" />
        </label>
        <label className="grid gap-1 text-xs uppercase">
          Cost unitari (€)
          <input
            className="field"
            min="0"
            name="unitCostEuros"
            required
            step="0.01"
            type="number"
          />
        </label>
        <button className="action" disabled={linkPending}>
          {linkPending ? "Vinculant…" : "Vincular producte"}
        </button>
        <p role="status">{linkState.message}</p>
      </form>
    </div>
  );
}
function Fields({ supplier }: { supplier?: Supplier }) {
  return (
    <>
      <label className="grid gap-1 text-xs uppercase">
        Nom
        <input
          className="field normal-case"
          defaultValue={supplier?.name}
          maxLength={120}
          name="name"
          required
        />
      </label>
      <label className="grid gap-1 text-xs uppercase">
        Persona de contacte
        <input
          className="field normal-case"
          defaultValue={supplier?.contact_name}
          maxLength={120}
          name="contact"
        />
      </label>
      <label className="grid gap-1 text-xs uppercase">
        Correu
        <input
          className="field normal-case"
          defaultValue={supplier?.email}
          name="email"
          required
          type="email"
        />
      </label>
      <label className="grid gap-1 text-xs uppercase">
        Telèfon
        <input
          className="field normal-case"
          defaultValue={supplier?.phone}
          maxLength={40}
          name="phone"
        />
      </label>
      <label className="grid gap-1 text-xs uppercase">
        Termini (dies)
        <input
          className="field"
          defaultValue={supplier?.lead_time_days ?? 7}
          max={365}
          min={0}
          name="leadDays"
          required
          type="number"
        />
      </label>
      <label className="grid gap-1 text-xs uppercase">
        Comanda mínima (€)
        <input
          className="field"
          defaultValue={(supplier?.minimum_order_minor ?? 0) / 100}
          min={0}
          name="minimumEuros"
          required
          step="0.01"
          type="number"
        />
      </label>
      <label className="grid gap-1 text-xs uppercase md:col-span-2">
        Notes
        <textarea
          className="field min-h-24 normal-case"
          defaultValue={supplier?.notes}
          maxLength={2000}
          name="notes"
        />
      </label>
    </>
  );
}
