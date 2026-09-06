import { shopSettings } from "@/server/shop/settings";
import Link from "next/link";
import { InstantFilterForm } from "@/components/admin/instant-filter-form";
import type { FinanceSale } from "@/features/finance/report";
import { staffFinanceSales } from "@/server/finance/repository";
import { staffAccess } from "@/server/permissions/staff";

export const metadata = { title: "Economia · Administració" };
const periods = {
  "30": "30 dies",
  "90": "90 dies",
  "365": "12 mesos",
  all: "Tot",
} as const;

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string | string[] }>;
}) {
  const [access, params, shop] = await Promise.all([
    staffAccess(),
    searchParams,
    shopSettings(),
  ]);
  const currency = shop.currency;
  if (
    access.status !== "allowed" ||
    !access.permissions.includes("finance.read")
  )
    return (
      <main className="p-8">
        <h2 className="font-serif text-3xl">Accés restringit</h2>
        <p className="mt-3">Necessites el permís finance.read.</p>
      </main>
    );

  const selected =
    typeof params.periode === "string" && params.periode in periods
      ? (params.periode as keyof typeof periods)
      : "90";
  const sales = await staffFinanceSales(
    selected === "all" ? null : (Number(selected) as 30 | 90 | 365),
  );
  const report = summarize(sales);

  return (
    <main
      id="main"
      className="mx-auto max-w-[100rem] px-5 py-5 sm:px-8 sm:py-6"
    >
      <section className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div
          className="flex flex-wrap gap-x-8 gap-y-2"
          aria-label="Indicadors econòmics"
        >
          <Metric
            label="Ingressos confirmats"
            value={money(report.revenue, currency)}
          />
          <Metric label="Comandes pagades" value={String(report.orders)} />
          <Metric
            label="Tiquet mitjà"
            value={money(
              report.orders ? Math.round(report.revenue / report.orders) : 0,
              currency,
            )}
          />
          <Metric
            label="Marge brut estimat"
            value={
              report.coveredRevenue
                ? money(report.knownRevenue - report.knownCost, currency)
                : "—"
            }
          />
        </div>
        <InstantFilterForm className="w-40">
          <label className="sr-only" htmlFor="finance-period">
            Període
          </label>
          <select
            className="field normal-case"
            defaultValue={selected}
            id="finance-period"
            name="periode"
          >
            {Object.entries(periods).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </InstantFilterForm>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <article className="rounded-xl border border-line bg-white p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs tracking-wide text-muted uppercase">
                Evolució
              </p>
              <h2 className="mt-1 font-serif text-2xl">Ingressos per mes</h2>
            </div>
            <p className="text-xs text-muted">Només cobraments confirmats</p>
          </div>
          {report.months.length ? (
            <div
              className="mt-7 flex h-52 items-end gap-3 border-b border-line px-1"
              aria-label="Gràfic mensual"
            >
              {report.months.map((month) => (
                <div
                  className="group flex h-full min-w-0 flex-1 flex-col justify-end"
                  key={month.key}
                >
                  <span className="mb-2 truncate text-center text-[.65rem] font-semibold opacity-0 transition-opacity group-hover:opacity-100">
                    {money(month.revenue, currency)}
                  </span>
                  <div
                    className="min-h-1 rounded-t bg-[#315545]"
                    style={{
                      height: `${Math.max(3, (month.revenue / report.maxMonth) * 100)}%`,
                    }}
                  />
                  <span className="mt-2 truncate text-center text-[.65rem] text-muted">
                    {month.label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </article>

        <article className="rounded-xl border border-line bg-white p-5">
          <p className="text-xs tracking-wide text-muted uppercase">
            Cobertura de costos
          </p>
          <h2 className="mt-1 font-serif text-2xl">Qualitat de l’estimació</h2>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-sand">
            <div
              className="h-full bg-[#315545]"
              style={{ width: `${report.coverage}%` }}
            />
          </div>
          <p className="mt-3 font-serif text-4xl">{report.coverage}%</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {report.uncostedUnits
              ? `${report.uncostedUnits} unitats venudes encara no tenen un cost de proveïdor informat.`
              : "Totes les unitats venudes tenen un cost de proveïdor informat."}
          </p>
          <Link
            className="mt-5 inline-block text-sm font-semibold text-[#315545] underline underline-offset-4"
            href="/admin/proveidors"
          >
            Revisar costos de proveïdors
          </Link>
        </article>
      </section>

      <section className="mt-4 rounded-xl border border-line bg-white p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs tracking-wide text-muted uppercase">
              Rendiment
            </p>
            <h2 className="mt-1 font-serif text-2xl">Productes venuts</h2>
          </div>
          <p className="text-sm text-muted">{report.units} unitats</p>
        </div>
        {report.products.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[42rem] text-left text-sm">
              <thead className="border-b border-line text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th className="py-3 font-medium">Producte</th>
                  <th className="py-3 text-right font-medium">Unitats</th>
                  <th className="py-3 text-right font-medium">Ingressos</th>
                  <th className="py-3 text-right font-medium">Cost estimat</th>
                  <th className="py-3 text-right font-medium">Marge estimat</th>
                </tr>
              </thead>
              <tbody>
                {report.products.map((product) => (
                  <tr
                    className="border-b border-line last:border-0"
                    key={product.id}
                  >
                    <td className="py-4 font-semibold">{product.name}</td>
                    <td className="py-4 text-right">{product.units}</td>
                    <td className="py-4 text-right">
                      {money(product.revenue, currency)}
                    </td>
                    <td className="py-4 text-right">
                      {product.complete
                        ? money(product.cost, currency)
                        : "Incomplet"}
                    </td>
                    <td className="py-4 text-right font-semibold">
                      {product.complete
                        ? money(product.revenue - product.cost, currency)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
      </section>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        Els ingressos són comandes pagades amb intent de pagament confirmat. Els
        costos són estimacions amb el cost actual més baix d’un proveïdor actiu;
        no substitueixen un assentament comptable ni un cost històric de compra.
      </p>
    </main>
  );
}

function summarize(sales: FinanceSale[]) {
  const orderIds = new Set<string>();
  const months = new Map<string, number>();
  const products = new Map<
    string,
    {
      id: string;
      name: string;
      units: number;
      revenue: number;
      cost: number;
      complete: boolean;
    }
  >();
  let revenue = 0,
    knownRevenue = 0,
    knownCost = 0,
    units = 0,
    costedUnits = 0,
    uncostedUnits = 0;
  for (const sale of sales) {
    orderIds.add(sale.order_id);
    revenue += sale.revenue_minor;
    units += sale.quantity;
    const date = new Date(sale.occurred_at);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    months.set(key, (months.get(key) ?? 0) + sale.revenue_minor);
    const product = products.get(sale.product_id) ?? {
      id: sale.product_id,
      name: sale.product_name,
      units: 0,
      revenue: 0,
      cost: 0,
      complete: true,
    };
    product.units += sale.quantity;
    product.revenue += sale.revenue_minor;
    if (sale.estimated_cost_minor === null) {
      product.complete = false;
      uncostedUnits += sale.quantity;
    } else {
      product.cost += sale.estimated_cost_minor;
      knownCost += sale.estimated_cost_minor;
      knownRevenue += sale.revenue_minor;
      costedUnits += sale.quantity;
    }
    products.set(sale.product_id, product);
  }
  const monthly = [...months]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      key,
      revenue: value,
      label: new Intl.DateTimeFormat("ca-ES", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }).format(new Date(`${key}-01T00:00:00Z`)),
    }));
  return {
    revenue,
    knownRevenue,
    knownCost,
    coveredRevenue: knownRevenue > 0,
    orders: orderIds.size,
    units,
    uncostedUnits,
    coverage: units ? Math.round((costedUnits / units) * 100) : 0,
    months: monthly,
    maxMonth: Math.max(...monthly.map((m) => m.revenue), 1),
    products: [...products.values()].sort((a, b) => b.revenue - a.revenue),
  };
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="flex items-baseline gap-2">
      <p className="font-serif text-2xl">{value}</p>
      <p className="text-[.68rem] text-muted uppercase">{label}</p>
    </article>
  );
}
function Empty() {
  return (
    <div className="mt-6 rounded-lg border border-dashed border-line p-8 text-center text-sm text-muted">
      Encara no hi ha vendes confirmades en aquest període.
    </div>
  );
}
function money(value: number, currency: string) {
  return new Intl.NumberFormat("ca-ES", {
    style: "currency",
    currency,
  }).format(value / 100);
}
