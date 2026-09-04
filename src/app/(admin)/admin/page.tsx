import Link from "next/link";
import { staffCatalog } from "@/server/catalog/admin";
import { staffInventory } from "@/server/inventory/repository";
import { staffOrders } from "@/server/orders/admin";
import { staffAccess } from "@/server/permissions/staff";

export default async function AdminDashboardPage() {
  const access = await staffAccess();
  const mayManageCatalog =
    access.status === "allowed" &&
    access.permissions.includes("catalog.manage");
  const mayManageInventory =
    access.status === "allowed" &&
    access.permissions.includes("inventory.manage");
  const mayReadOrders =
    access.status === "allowed" &&
    access.permissions.includes("orders.fulfill") &&
    access.permissions.includes("customers.read");
  const [products, inventory, orders] = await Promise.all([
    mayManageCatalog ? staffCatalog() : Promise.resolve([]),
    mayManageInventory ? staffInventory() : Promise.resolve([]),
    mayReadOrders ? staffOrders() : Promise.resolve([]),
  ]);
  const published = products.filter(
    ({ status }) => status === "published",
  ).length;
  const drafts = products.filter(({ status }) => status === "draft").length;
  const available = inventory.reduce(
    (total, row) => total + Math.max(0, row.on_hand - row.reserved),
    0,
  );
  const lowStock = inventory.filter(
    (row) => row.on_hand - row.reserved <= 3,
  ).length;

  return (
    <main id="main" className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs tracking-[0.18em] text-muted uppercase">
            Vista general
          </p>
          <h1 className="mt-2 font-serif text-4xl sm:text-5xl">Bon dia.</h1>
          <p className="mt-3 text-muted">
            Estat actual de la botiga i accessos ràpids de gestió.
          </p>
        </div>
        <span className="rounded-full bg-[#dce8df] px-3 py-1.5 text-xs text-[#274a38]">
          {access.status === "allowed" && access.mfaRequired
            ? "Accés protegit amb MFA"
            : "Entorn local segur"}
        </span>
      </div>

      <section
        className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
        aria-label="Indicadors principals"
      >
        <Metric label="Productes publicats" value={published} />
        <Metric label="Esborranys" value={drafts} />
        <Metric label="Unitats disponibles" value={available} />
        <Metric
          label="Variants amb poc estoc"
          value={lowStock}
          attention={lowStock > 0}
        />
        <Metric label="Comandes" value={orders.length} />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section
          className="border border-line bg-white p-6"
          aria-labelledby="actions-title"
        >
          <h2 id="actions-title" className="font-serif text-2xl">
            Gestió ràpida
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {mayManageCatalog ? (
              <AdminLink href="/admin/productes" title="Productes i preus">
                Crea peces, edita variants, categories i fotografies.
              </AdminLink>
            ) : null}
            {mayManageInventory ? (
              <AdminLink href="/admin/inventari" title="Inventari">
                Consulta disponibilitat i registra ajustos amb motiu.
              </AdminLink>
            ) : null}
            {mayReadOrders ? (
              <AdminLink href="/admin/comandes" title="Comandes">
                Revisa clients, peces, imports, pagaments i adreces d’entrega.
              </AdminLink>
            ) : null}
          </div>
        </section>
        <section
          className="border border-line bg-white p-6"
          aria-labelledby="next-title"
        >
          <p className="text-xs tracking-[0.16em] text-muted uppercase">
            Següent increment
          </p>
          <h2 id="next-title" className="mt-2 font-serif text-2xl">
            Clients i enviaments
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            El següent increment connectarà la fitxa de client i prepararà el
            model d’enviaments sense avançar-se a la integració de Stripe.
          </p>
        </section>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  attention = false,
}: {
  label: string;
  value: number;
  attention?: boolean;
}) {
  return (
    <article
      className={`border p-5 ${attention ? "border-[#b77b55] bg-[#fff8f1]" : "border-line bg-white"}`}
    >
      <p className="text-xs tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-4 font-serif text-4xl">{value}</p>
    </article>
  );
}

function AdminLink({
  children,
  href,
  title,
}: {
  children: React.ReactNode;
  href: string;
  title: string;
}) {
  return (
    <Link
      className="border border-line p-5 transition-colors hover:bg-sand"
      href={href}
    >
      <span className="font-semibold">{title} →</span>
      <span className="mt-2 block text-sm leading-relaxed text-muted">
        {children}
      </span>
    </Link>
  );
}
