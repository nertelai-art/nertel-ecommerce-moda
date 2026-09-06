import { formatPrice } from "@/features/shop/settings";
import { shopSettings } from "@/server/shop/settings";
import Link from "next/link";
import { staffCatalog } from "@/server/catalog/admin";
import { staffInventory } from "@/server/inventory/repository";
import { staffOrders } from "@/server/orders/admin";
import { staffCustomers } from "@/server/customers/admin";
import { staffSuppliers } from "@/server/suppliers/repository";
import { staffFulfillmentQueue } from "@/server/fulfillment/repository";
import { staffFinanceSales } from "@/server/finance/repository";
import { staffAccess } from "@/server/permissions/staff";

export default async function AdminDashboardPage() {
  const [access, shop] = await Promise.all([staffAccess(), shopSettings()]);
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
  const mayReadCustomers =
    access.status === "allowed" &&
    access.permissions.includes("customers.read");
  const mayManageSuppliers =
    access.status === "allowed" &&
    access.permissions.includes("suppliers.manage");
  const mayFulfill =
    access.status === "allowed" &&
    access.permissions.includes("orders.fulfill");
  const mayReadFinance =
    access.status === "allowed" && access.permissions.includes("finance.read");
  const mayManageContent =
    access.status === "allowed" &&
    access.permissions.includes("content.manage");
  const [
    products,
    inventory,
    orders,
    customers,
    suppliers,
    fulfillment,
    finance,
  ] = await Promise.all([
    mayManageCatalog ? staffCatalog() : Promise.resolve([]),
    mayManageInventory ? staffInventory() : Promise.resolve([]),
    mayReadOrders ? staffOrders() : Promise.resolve([]),
    mayReadCustomers ? staffCustomers() : Promise.resolve([]),
    mayManageSuppliers ? staffSuppliers() : Promise.resolve([]),
    mayFulfill ? staffFulfillmentQueue() : Promise.resolve([]),
    mayReadFinance ? staffFinanceSales() : Promise.resolve([]),
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
    <main
      id="main"
      className="mx-auto max-w-[100rem] px-5 py-5 sm:px-8 sm:py-6"
    >
      <div className="flex justify-end">
        <span className="rounded-full bg-[#dce8df] px-3 py-1.5 text-xs text-[#274a38]">
          {access.status === "allowed" && access.mfaSatisfied
            ? "Accés protegit amb MFA"
            : "Entorn local segur"}
        </span>
      </div>

      <section
        className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-8"
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
        <Metric label="Clients" value={customers.length} />
        <Metric label="Proveïdors" value={suppliers.length} />
        <Metric
          label="Per preparar"
          value={fulfillment.filter((row) => !row.shipment_id).length}
        />
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
            {mayReadCustomers ? (
              <AdminLink href="/admin/clients" title="Clients">
                Consulta activitat, recurrència, valor i adreces d’entrega.
              </AdminLink>
            ) : null}
            {mayManageSuppliers ? (
              <AdminLink href="/admin/proveidors" title="Proveïdors">
                Gestiona contactes, terminis, costos i productes vinculats.
              </AdminLink>
            ) : null}
            {mayFulfill ? (
              <AdminLink href="/admin/enviaments" title="Enviaments">
                Prepara comandes i registra transport, seguiment i entrega.
              </AdminLink>
            ) : null}
            {mayReadFinance ? (
              <AdminLink href="/admin/economia" title="Economia">
                Consulta ingressos confirmats, costos estimats i marges.
              </AdminLink>
            ) : null}
            {mayManageContent ? (
              <AdminLink href="/admin/contingut" title="Contingut i aparador">
                Edita la campanya, desa esborranys i publica la landing.
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
            Base administrativa completa
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Catàleg, operacions, relacions, logística, economia i aparador ja
            comparteixen una base segura.
          </p>
          {mayReadFinance ? (
            <p className="mt-4 text-sm">
              <strong>
                {formatPrice(
                  finance.reduce((sum, row) => sum + row.revenue_minor, 0),
                  shop.currency,
                )}
              </strong>{" "}
              d’ingressos confirmats.
            </p>
          ) : null}
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
