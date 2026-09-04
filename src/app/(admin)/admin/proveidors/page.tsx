import Link from "next/link";
import { InstantFilterForm } from "@/components/admin/instant-filter-form";
import {
  SupplierCreateForm,
  SupplierEditForm,
} from "@/components/admin/supplier-forms";
import { staffCatalog } from "@/server/catalog/admin";
import { staffAccess } from "@/server/permissions/staff";
import { staffSuppliers } from "@/server/suppliers/repository";
export const metadata = { title: "Proveïdors · Administració" };
export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; estat?: string | string[] }>;
}) {
  const [access, query] = await Promise.all([staffAccess(), searchParams]);
  const allowed =
    access.status === "allowed" &&
    access.permissions.includes("suppliers.manage");
  if (!allowed)
    return (
      <main id="main" className="px-8 py-8">
        <h2 className="font-serif text-3xl">Accés restringit</h2>
        <p className="mt-3">Necessites el permís suppliers.manage.</p>
      </main>
    );
  const [suppliers, products] = await Promise.all([
    staffSuppliers(),
    staffCatalog(),
  ]);
  const q = typeof query.q === "string" ? query.q.trim() : "";
  const normalized = q.toLocaleLowerCase("ca");
  const status =
    typeof query.estat === "string" &&
    ["active", "paused", "archived"].includes(query.estat)
      ? query.estat
      : "";
  const visible = suppliers.filter(
    (s) =>
      (!status || s.status === status) &&
      (!normalized ||
        [
          s.name,
          s.contact_name,
          s.email,
          ...s.products.map((p) => p.name),
        ].some((v) => v.toLocaleLowerCase("ca").includes(normalized))),
  );
  const active = suppliers.filter((s) => s.status === "active");
  const linked = new Set(suppliers.flatMap((s) => s.products.map((p) => p.id)));
  return (
    <main
      id="main"
      className="mx-auto max-w-[100rem] px-5 py-5 sm:px-8 sm:py-6"
    >
      <section
        aria-label="Resum de proveïdors"
        className="flex flex-wrap gap-x-7 gap-y-2 border-b border-line pb-4"
      >
        <Metric label="Proveïdors" value={suppliers.length} />
        <Metric label="Actius" value={active.length} />
        <Metric label="Productes vinculats" value={linked.size} />
        <Metric
          label="Termini mitjà"
          value={
            active.length
              ? Math.round(
                  active.reduce((n, s) => n + s.lead_time_days, 0) /
                    active.length,
                )
              : 0
          }
          suffix=" dies"
        />
      </section>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_14rem_auto]">
        <InstantFilterForm className="contents">
          <label className="grid gap-1 text-xs uppercase">
            Cercar
            <input
              className="field normal-case outline-none focus:border-muted focus:ring-0"
              defaultValue={q}
              name="q"
              placeholder="Nom, contacte, correu o producte"
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
              <option value="active">Actius</option>
              <option value="paused">En pausa</option>
              <option value="archived">Arxivats</option>
            </select>
          </label>
        </InstantFilterForm>
        <a className="action self-end" href="#nou-proveidor">
          + Nou proveïdor
        </a>
      </div>
      <div className="mt-5 flex justify-between text-sm text-muted">
        <p>{visible.length} proveïdors</p>
        {q || status ? (
          <Link className="underline" href="/admin/proveidors">
            Netejar filtres
          </Link>
        ) : null}
      </div>
      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        {visible.map((s) => (
          <details
            className="overflow-hidden rounded-xl border border-line bg-white"
            key={s.id}
          >
            <summary className="cursor-pointer list-none p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="rounded-full bg-sand px-2 py-1 text-[0.65rem] uppercase">
                    {
                      {
                        active: "Actiu",
                        paused: "En pausa",
                        archived: "Arxivat",
                      }[s.status]
                    }
                  </span>
                  <h2 className="mt-3 font-serif text-2xl">{s.name}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {s.contact_name || "Sense contacte"} · {s.email}
                    {s.phone ? ` · ${s.phone}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <strong className="font-serif text-2xl">
                    {s.lead_time_days}
                  </strong>
                  <span className="block text-[0.65rem] text-muted uppercase">
                    dies
                  </span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {s.products.map((p) => (
                  <span
                    className="rounded border border-line px-2 py-1 text-xs"
                    key={p.id}
                  >
                    {p.name}
                    {p.unitCostMinor !== null
                      ? ` · ${money(p.unitCostMinor, p.currency)}`
                      : ""}
                  </span>
                ))}
                {!s.products.length ? (
                  <span className="text-xs text-muted">
                    Cap producte vinculat
                  </span>
                ) : null}
              </div>
            </summary>
            <div className="border-t border-line bg-[#faf9f6] p-5">
              <SupplierEditForm products={products} supplier={s} />
            </div>
          </details>
        ))}
      </section>
      <details
        className="mt-6 rounded-xl border border-line bg-white p-5"
        id="nou-proveidor"
      >
        <summary className="cursor-pointer font-semibold">
          Crear un proveïdor nou
        </summary>
        <SupplierCreateForm />
      </details>
    </main>
  );
}
function Metric({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <article className="flex items-baseline gap-2">
      <p className="font-serif text-2xl">
        {value}
        {suffix}
      </p>
      <p className="text-[0.68rem] text-muted uppercase">{label}</p>
    </article>
  );
}
function money(v: number, c: string) {
  return new Intl.NumberFormat("ca-ES", {
    style: "currency",
    currency: c,
  }).format(v / 100);
}
