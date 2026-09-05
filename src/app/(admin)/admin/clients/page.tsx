import Link from "next/link";
import { InstantFilterForm } from "@/components/admin/instant-filter-form";
import type { StaffCustomer } from "@/features/customers/admin";
import { orderStatusCopy } from "@/features/orders/admin";
import { staffCustomers } from "@/server/customers/admin";
import { staffAccess } from "@/server/permissions/staff";

export const metadata = { title: "Clients · Administració" };

const dateFormatter = new Intl.DateTimeFormat("ca-ES", { dateStyle: "medium" });

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; segment?: string | string[] }>;
}) {
  const [access, query] = await Promise.all([staffAccess(), searchParams]);
  const allowed =
    access.status === "allowed" &&
    access.permissions.includes("customers.read");
  if (!allowed)
    return (
      <main id="main" className="mx-auto max-w-[100rem] px-5 py-8 sm:px-8">
        <h2 className="font-serif text-3xl">Accés restringit</h2>
        <p className="mt-3">Necessites el permís customers.read.</p>
      </main>
    );

  const customers = await staffCustomers();
  const queryText = typeof query.q === "string" ? query.q.trim() : "";
  const normalizedQuery = queryText.toLocaleLowerCase("ca");
  const segment =
    typeof query.segment === "string" &&
    ["paid", "pending", "repeat", "guest"].includes(query.segment)
      ? query.segment
      : "";
  const visibleCustomers = customers.filter((customer) => {
    const address = customer.latest_address;
    const matchesQuery =
      !normalizedQuery ||
      [
        customer.display_name,
        customer.email,
        address.city,
        address.postalCode,
      ].some((value) =>
        value.toLocaleLowerCase("ca").includes(normalizedQuery),
      );
    const matchesSegment =
      !segment ||
      (segment === "paid" && customer.paid_order_count > 0) ||
      (segment === "pending" && customer.pending_order_count > 0) ||
      (segment === "repeat" && customer.order_count > 1) ||
      (segment === "guest" && !customer.is_registered);
    return matchesQuery && matchesSegment;
  });
  const paidCustomers = customers.filter(
    ({ paid_order_count }) => paid_order_count > 0,
  );
  const repeatCustomers = customers.filter(
    ({ order_count }) => order_count > 1,
  );
  const confirmedRevenue = customers.reduce(
    (sum, customer) => sum + customer.total_spent_minor,
    0,
  );

  return (
    <main
      id="main"
      className="mx-auto max-w-[100rem] px-5 py-5 sm:px-8 sm:py-6"
    >
      <section
        aria-label="Resum de clients"
        className="flex flex-wrap gap-x-7 gap-y-2 border-b border-line pb-4"
      >
        <Metric label="Clients" value={String(customers.length)} />
        <Metric label="Amb compra" value={String(paidCustomers.length)} />
        <Metric label="Recurrents" value={String(repeatCustomers.length)} />
        <Metric
          label="Ingressos confirmats"
          value={money(confirmedRevenue, "EUR")}
        />
      </section>

      <section className="mt-4 rounded-xl border border-line bg-white p-3 sm:p-4">
        <InstantFilterForm className="grid gap-3 md:grid-cols-[minmax(16rem,1fr)_16rem]">
          <FilterLabel label="Cercar">
            <input
              className="field normal-case outline-none focus:border-muted focus:outline-none focus:ring-0"
              defaultValue={queryText}
              name="q"
              placeholder="Nom, correu, ciutat o codi postal"
              type="search"
            />
          </FilterLabel>
          <FilterLabel label="Segment">
            <select
              className="field normal-case"
              defaultValue={segment}
              name="segment"
            >
              <option value="">Tots els clients</option>
              <option value="paid">Amb compra confirmada</option>
              <option value="pending">Amb pagament pendent</option>
              <option value="repeat">Clients recurrents</option>
              <option value="guest">Clients convidats</option>
            </select>
          </FilterLabel>
        </InstantFilterForm>
      </section>

      <div className="mt-5 flex items-center justify-between gap-3 text-sm text-muted">
        <p>{visibleCustomers.length} clients</p>
        {queryText || segment ? (
          <Link className="underline underline-offset-4" href="/admin/clients">
            Netejar filtres
          </Link>
        ) : null}
      </div>

      <section
        className="mt-4 grid gap-4 xl:grid-cols-2"
        aria-label="Directori de clients"
      >
        {visibleCustomers.map((customer) => (
          <CustomerCard customer={customer} key={customer.email} />
        ))}
        {visibleCustomers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center xl:col-span-2">
            <h2 className="font-serif text-2xl">Cap client coincideix</h2>
            <p className="mt-2 text-sm text-muted">
              Canvia la cerca o neteja els filtres.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function CustomerCard({ customer }: { customer: StaffCustomer }) {
  const address = customer.latest_address;
  const initials = customer.display_name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("ca");
  return (
    <article className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="grid grid-cols-[3.5rem_1fr] gap-4 p-5 sm:grid-cols-[3.5rem_1fr_auto]">
        <span
          className="grid size-14 place-items-center rounded-full bg-[#dce8df] font-serif text-xl text-[#274a38]"
          aria-hidden="true"
        >
          {initials}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-2xl">{customer.display_name}</h2>
            <span className="rounded-full bg-sand px-2 py-1 text-[0.65rem] text-muted uppercase">
              {customer.is_registered ? "Compte" : "Convidat"}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-muted">{customer.email}</p>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            {address.line1}
            {address.line2 ? `, ${address.line2}` : ""}
            <br />
            {address.postalCode} {address.city} · {address.countryCode}
          </p>
        </div>
        <div className="col-span-2 grid grid-cols-3 gap-2 sm:col-span-1 sm:min-w-64">
          <SmallMetric label="Comandes" value={String(customer.order_count)} />
          <SmallMetric
            label="Pagades"
            value={String(customer.paid_order_count)}
          />
          <SmallMetric
            label="Valor"
            value={money(customer.total_spent_minor, customer.currency)}
          />
        </div>
      </div>
      <details className="border-t border-line bg-[#faf9f6] px-5 py-4">
        <summary className="cursor-pointer text-sm font-semibold text-[#315545]">
          Veure historial · client des de{" "}
          {dateFormatter.format(new Date(customer.first_order_at))}
        </summary>
        <div className="mt-4 grid gap-2">
          {customer.orders.map((order) => (
            <div
              className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-line bg-white px-3 py-2.5 text-sm"
              key={order.id}
            >
              <div className="min-w-0">
                <p className="font-semibold">
                  {orderStatusCopy[order.status]} · {order.itemCount}{" "}
                  {order.itemCount === 1 ? "peça" : "peces"}
                </p>
                <p className="mt-0.5 truncate font-mono text-[0.65rem] text-muted">
                  #{order.id} ·{" "}
                  {dateFormatter.format(new Date(order.createdAt))}
                </p>
              </div>
              <strong>{money(order.amountMinor, order.currency)}</strong>
            </div>
          ))}
        </div>
      </details>
    </article>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="flex items-baseline gap-2">
      <p className="font-serif text-2xl">{value}</p>
      <p className="text-[0.68rem] tracking-wide text-muted uppercase">
        {label}
      </p>
    </article>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-lg bg-sand p-2 text-center">
      <strong className="block text-sm">{value}</strong>
      <span className="text-[0.6rem] text-muted uppercase">{label}</span>
    </span>
  );
}

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("ca-ES", { style: "currency", currency }).format(
    amountMinor / 100,
  );
}
