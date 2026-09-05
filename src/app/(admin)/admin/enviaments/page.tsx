import Link from "next/link";
import { InstantFilterForm } from "@/components/admin/instant-filter-form";
import { FulfillmentForm } from "@/components/admin/fulfillment-form";
import {
  shipmentCopy,
  type FulfillmentRow,
} from "@/features/fulfillment/validation";
import { staffFulfillmentQueue } from "@/server/fulfillment/repository";
import { staffAccess } from "@/server/permissions/staff";
export const metadata = { title: "Enviaments · Administració" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; estat?: string | string[] }>;
}) {
  const [a, p] = await Promise.all([staffAccess(), searchParams]);
  if (a.status !== "allowed" || !a.permissions.includes("orders.fulfill"))
    return (
      <main className="p-8">
        <h2 className="font-serif text-3xl">Accés restringit</h2>
      </main>
    );
  const rows = await staffFulfillmentQueue();
  const q = typeof p.q === "string" ? p.q.trim() : "";
  const n = q.toLocaleLowerCase("ca");
  const status = typeof p.estat === "string" ? p.estat : "";
  const visible = rows.filter(
    (r) =>
      (!status ||
        (status === "unassigned"
          ? !r.shipment_status
          : r.shipment_status === status)) &&
      (!n ||
        [
          r.email,
          r.order_id,
          r.shipping_address.recipient,
          r.shipping_address.city,
          ...r.items.flatMap((i) => [i.name, i.sku]),
        ].some((v) => v.toLocaleLowerCase("ca").includes(n))),
  );
  return (
    <main
      id="main"
      className="mx-auto max-w-[100rem] px-5 py-5 sm:px-8 sm:py-6"
    >
      <section
        aria-label="Resum d’enviaments"
        className="flex flex-wrap gap-x-7 gap-y-2 border-b border-line pb-4"
      >
        <Metric l="Per iniciar" v={rows.filter((r) => !r.shipment_id).length} />
        <Metric
          l="En preparació"
          v={rows.filter((r) => r.shipment_status === "packing").length}
        />
        <Metric
          l="Llestes"
          v={rows.filter((r) => r.shipment_status === "ready").length}
        />
        <Metric
          l="Enviades"
          v={rows.filter((r) => r.shipment_status === "shipped").length}
        />
      </section>
      <section className="mt-4 rounded-xl border border-line bg-white p-4">
        <InstantFilterForm className="grid gap-3 md:grid-cols-[1fr_16rem]">
          <label className="grid gap-1 text-xs uppercase">
            Cercar
            <input
              className="field normal-case outline-none focus:border-muted focus:ring-0"
              defaultValue={q}
              name="q"
              placeholder="Client, comanda, producte o SKU"
              type="search"
            />
          </label>
          <label className="grid gap-1 text-xs uppercase">
            Estat
            <select
              className="field normal-case"
              defaultValue={status}
              name="estat"
            >
              <option value="">Tots</option>
              <option value="unassigned">Per iniciar</option>
              {Object.entries(shipmentCopy).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </InstantFilterForm>
      </section>
      <div className="mt-5 flex justify-between text-sm text-muted">
        <p>{visible.length} expedicions</p>
        {q || status ? (
          <Link href="/admin/enviaments" className="underline">
            Netejar filtres
          </Link>
        ) : null}
      </div>
      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        {visible.map((r) => (
          <Shipment key={r.order_id} row={r} />
        ))}
      </section>
    </main>
  );
}
function Shipment({ row }: { row: FulfillmentRow }) {
  const a = row.shipping_address;
  return (
    <article className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="p-5">
        <div className="flex justify-between gap-4">
          <div>
            <span className="rounded-full bg-sand px-2 py-1 text-[.65rem] uppercase">
              {row.shipment_status
                ? shipmentCopy[row.shipment_status]
                : "Per iniciar"}
            </span>
            <h2 className="mt-3 font-serif text-2xl">
              {a.recipient || row.email}
            </h2>
            <p className="text-sm text-muted">
              {a.city} · {row.email}
            </p>
          </div>
          <strong>{row.items.reduce((s, i) => s + i.quantity, 0)} peces</strong>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {row.items.map((i) => (
            <span
              className="rounded border border-line px-2 py-1 text-xs"
              key={i.sku}
            >
              {i.name} · {i.size} · {i.quantity} u.
            </span>
          ))}
        </div>
        {row.tracking_number ? (
          <p className="mt-3 text-sm">
            <strong>{row.carrier}</strong> · {row.tracking_number}
          </p>
        ) : null}
      </div>
      <details className="border-t border-line bg-[#faf9f6] p-4">
        <summary className="cursor-pointer font-semibold text-[#315545]">
          Gestionar expedició
        </summary>
        <div className="mt-4">
          <FulfillmentForm row={row} />
          {row.events.length ? (
            <ol className="mt-4 border-t border-line pt-3 text-xs text-muted">
              {row.events.map((e, i) => (
                <li key={`${e.createdAt}-${i}`}>
                  {shipmentCopy[e.toStatus]} ·{" "}
                  {new Date(e.createdAt).toLocaleString("ca-ES")}
                  {e.note ? ` · ${e.note}` : ""}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </details>
    </article>
  );
}
function Metric({ l, v }: { l: string; v: number }) {
  return (
    <article className="flex items-baseline gap-2">
      <p className="font-serif text-2xl">{v}</p>
      <p className="text-[.68rem] text-muted uppercase">{l}</p>
    </article>
  );
}
