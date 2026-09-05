import Image from "next/image";
import Link from "next/link";
import { InstantFilterForm } from "@/components/admin/instant-filter-form";
import {
  orderStatusCopy,
  paymentStatusCopy,
  type StaffOrder,
} from "@/features/orders/admin";
import { staffOrders } from "@/server/orders/admin";
import { staffAccess } from "@/server/permissions/staff";
import { demoProductImageByName } from "@/features/catalog/product";

export const metadata = { title: "Comandes · Administració" };

const dateFormatter = new Intl.DateTimeFormat("ca-ES", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    estat?: string | string[];
  }>;
}) {
  const [access, query] = await Promise.all([staffAccess(), searchParams]);
  const allowed =
    access.status === "allowed" &&
    access.permissions.includes("orders.fulfill") &&
    access.permissions.includes("customers.read");
  if (!allowed)
    return (
      <main id="main" className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <h1 className="font-serif text-4xl">Comandes</h1>
        <p className="mt-5">
          Necessites els permisos orders.fulfill i customers.read.
        </p>
      </main>
    );

  const orders = await staffOrders();
  const queryText = typeof query.q === "string" ? query.q.trim() : "";
  const normalizedQuery = queryText.toLocaleLowerCase("ca");
  const status =
    typeof query.estat === "string" &&
    ["pending_payment", "paid", "cancelled", "expired"].includes(query.estat)
      ? query.estat
      : "";
  const visibleOrders = orders.filter((order) => {
    const address = order.shipping_address;
    const searchable = [
      order.id,
      order.email,
      address.recipient,
      address.city,
      address.postalCode,
      ...order.items.flatMap((item) => [item.productName, item.sku]),
    ];
    return (
      (!status || order.status === status) &&
      (!normalizedQuery ||
        searchable.some((value) =>
          value.toLocaleLowerCase("ca").includes(normalizedQuery),
        ))
    );
  });
  const pending = orders.filter(
    ({ status: orderStatus }) => orderStatus === "pending_payment",
  );
  const paid = orders.filter(
    ({ status: orderStatus }) => orderStatus === "paid",
  );
  const pendingAmount = pending.reduce(
    (total, order) => total + order.amount_minor,
    0,
  );

  return (
    <main
      id="main"
      className="mx-auto max-w-[100rem] px-5 py-5 sm:px-8 sm:py-6"
    >
      <section
        aria-label="Resum de comandes"
        className="flex flex-wrap gap-x-7 gap-y-2 border-b border-line pb-4"
      >
        <Metric label="Total" value={String(orders.length)} />
        <Metric
          alert={pending.length > 0}
          label="Pendents"
          value={String(pending.length)}
        />
        <Metric label="Pagades" value={String(paid.length)} />
        <Metric label="Import pendent" value={money(pendingAmount, "EUR")} />
      </section>

      <section className="mt-4 rounded-xl border border-line bg-white p-3 sm:p-4">
        <InstantFilterForm className="grid gap-3 md:grid-cols-[minmax(16rem,1fr)_16rem]">
          <FilterLabel label="Cercar">
            <input
              className="field normal-case outline-none focus:border-muted focus:outline-none focus:ring-0"
              defaultValue={queryText}
              name="q"
              placeholder="Client, comanda, producte o SKU"
              type="search"
            />
          </FilterLabel>
          <FilterLabel label="Estat">
            <select
              className="field normal-case"
              defaultValue={status}
              name="estat"
            >
              <option value="">Tots els estats</option>
              <option value="pending_payment">Pendent de pagament</option>
              <option value="paid">Pagada</option>
              <option value="cancelled">Cancel·lada</option>
              <option value="expired">Caducada</option>
            </select>
          </FilterLabel>
        </InstantFilterForm>
      </section>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <p>{visibleOrders.length} comandes</p>
        {queryText || status ? (
          <Link className="underline underline-offset-4" href="/admin/comandes">
            Netejar filtres
          </Link>
        ) : null}
      </div>

      <section className="mt-4 grid gap-4" aria-label="Llistat de comandes">
        {visibleOrders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
        {visibleOrders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center">
            <h2 className="font-serif text-2xl">
              {orders.length
                ? "Cap comanda coincideix"
                : "Encara no hi ha comandes"}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {orders.length
                ? "Canvia la cerca o neteja els filtres."
                : "Les comandes reals apareixeran aquí quan un client finalitzi la reserva."}
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function OrderCard({ order }: { order: StaffOrder }) {
  const address = order.shipping_address;
  return (
    <article className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="grid gap-5 p-5 lg:grid-cols-[1.25fr_1fr_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.status} />
            <span className="text-xs text-muted">
              {dateFormatter.format(new Date(order.created_at))}
            </span>
          </div>
          <h2 className="mt-3 font-serif text-2xl">
            {address.recipient || order.email}
          </h2>
          <p className="mt-1 truncate text-sm text-muted">{order.email}</p>
          <p className="mt-2 font-mono text-[0.68rem] text-muted">
            #{order.id}
          </p>
        </div>
        <div className="text-sm leading-relaxed">
          <p className="font-semibold">Entrega</p>
          <p className="mt-1 text-muted">
            {address.line1}
            {address.line2 ? `, ${address.line2}` : ""}
            <br />
            {address.postalCode} {address.city}
            {address.region ? ` · ${address.region}` : ""} ·{" "}
            {address.countryCode}
          </p>
        </div>
        <div className="lg:text-right">
          <p className="font-serif text-3xl">
            {money(order.amount_minor, order.currency)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {order.payment_status
              ? paymentStatusCopy[order.payment_status]
              : "Sense intent de pagament"}
          </p>
        </div>
      </div>
      <details className="border-t border-line bg-[#faf9f6] px-5 py-4">
        <summary className="cursor-pointer text-sm font-semibold text-[#315545]">
          Veure {order.items.length}{" "}
          {order.items.length === 1 ? "peça" : "peces"}
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {order.items.map((item) => (
            <div
              className="grid grid-cols-[4rem_1fr] gap-3 rounded-lg border border-line bg-white p-3"
              key={item.id}
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded bg-sand">
                {item.productImageId ||
                demoProductImageByName(item.productName) ? (
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    sizes="64px"
                    src={
                      item.productImageId
                        ? `/media/products/${item.productImageId}`
                        : demoProductImageByName(item.productName)!
                    }
                  />
                ) : (
                  <span className="grid h-full place-items-center text-[0.6rem] text-muted">
                    Sense foto
                  </span>
                )}
              </div>
              <div className="min-w-0 self-center">
                <p className="truncate font-semibold">{item.productName}</p>
                <p className="mt-1 text-xs text-muted">{item.sku}</p>
                <p className="mt-2 text-xs">
                  {item.size} · {item.color} · {item.quantity} u.
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {money(item.lineTotalMinor, item.currency)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </details>
    </article>
  );
}

function StatusBadge({ status }: { status: StaffOrder["status"] }) {
  const tone =
    status === "paid"
      ? "bg-[#dce8df] text-[#274a38]"
      : status === "pending_payment"
        ? "bg-[#fff0e7] text-[#914724]"
        : "bg-[#ecebe7] text-[#5d625e]";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs ${tone}`}>
      {orderStatusCopy[status]}
    </span>
  );
}

function FilterLabel({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold tracking-wide text-muted uppercase">
      {label}
      {children}
    </label>
  );
}

function Metric({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <article className="flex items-baseline gap-2">
      <p className={`font-serif text-2xl ${alert ? "text-[#914724]" : ""}`}>
        {value}
      </p>
      <p className="text-[0.68rem] tracking-wide text-muted uppercase">
        {label}
      </p>
    </article>
  );
}

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("ca-ES", { style: "currency", currency }).format(
    amountMinor / 100,
  );
}
