import { randomUUID } from "node:crypto";
import Image from "next/image";
import Link from "next/link";
import { InstantFilterForm } from "@/components/admin/instant-filter-form";
import { InventoryForm } from "@/components/admin/inventory-form";
import { demoProductImage } from "@/features/catalog/product";
import type { InventoryRow } from "@/features/inventory/validation";
import { staffInventory } from "@/server/inventory/repository";
import { staffAccess } from "@/server/permissions/staff";

export const metadata = { title: "Inventari · Administració" };

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    stock?: string | string[];
    ubicacio?: string | string[];
  }>;
}) {
  const [access, query] = await Promise.all([staffAccess(), searchParams]);
  const allowed =
    access.status === "allowed" &&
    access.permissions.includes("inventory.manage");
  if (!allowed)
    return (
      <main id="main" className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <h1 className="font-serif text-4xl">Inventari</h1>
        <p className="mt-5">No tens el permís inventory.manage.</p>
      </main>
    );

  const inventory = await staffInventory();
  const queryText = typeof query.q === "string" ? query.q.trim() : "";
  const normalizedQuery = queryText.toLocaleLowerCase("ca");
  const stock =
    typeof query.stock === "string" &&
    ["healthy", "low", "out"].includes(query.stock)
      ? query.stock
      : "";
  const location = typeof query.ubicacio === "string" ? query.ubicacio : "";
  const locations = [
    ...new Map(
      inventory.map((row) => [row.location_id, row.location_name]),
    ).entries(),
  ];
  const visibleInventory = inventory.filter((row) => {
    const available = availableStock(row);
    const matchesQuery =
      !normalizedQuery ||
      [row.product_name, row.sku, row.size, row.color].some((value) =>
        value.toLocaleLowerCase("ca").includes(normalizedQuery),
      );
    const matchesStock =
      !stock ||
      (stock === "out" && available === 0) ||
      (stock === "low" && available > 0 && available <= 3) ||
      (stock === "healthy" && available > 3);
    return (
      matchesQuery &&
      matchesStock &&
      (!location || row.location_id === location)
    );
  });
  const totals = inventory.reduce(
    (result, row) => {
      const available = availableStock(row);
      result.onHand += row.on_hand;
      result.reserved += row.reserved;
      result.available += available;
      if (available <= 3) result.attention += 1;
      return result;
    },
    { onHand: 0, reserved: 0, available: 0, attention: 0 },
  );

  return (
    <main
      id="main"
      className="mx-auto max-w-[100rem] px-5 py-5 sm:px-8 sm:py-6"
    >
      <section
        className="flex flex-wrap gap-x-7 gap-y-2 border-b border-line pb-4"
        aria-label="Resum d’inventari"
      >
        <OverviewMetric label="Unitats disponibles" value={totals.available} />
        <OverviewMetric label="Estoc físic" value={totals.onHand} />
        <OverviewMetric label="Unitats reservades" value={totals.reserved} />
        <OverviewMetric
          alert={totals.attention > 0}
          label="Variants per revisar"
          value={totals.attention}
        />
      </section>

      <section className="mt-4 rounded-xl border border-line bg-white p-3 sm:p-4">
        <InstantFilterForm className="grid gap-3 md:grid-cols-[minmax(15rem,1fr)_12rem_14rem]">
          <FilterLabel label="Cercar">
            <input
              className="field normal-case outline-none focus:border-muted focus:outline-none focus:ring-0"
              defaultValue={queryText}
              name="q"
              placeholder="Peça, SKU, talla o color"
              type="search"
            />
          </FilterLabel>
          <FilterLabel label="Disponibilitat">
            <select
              className="field normal-case"
              defaultValue={stock}
              name="stock"
            >
              <option value="">Totes</option>
              <option value="healthy">Estoc correcte</option>
              <option value="low">Estoc baix</option>
              <option value="out">Sense estoc</option>
            </select>
          </FilterLabel>
          <FilterLabel label="Ubicació">
            <select
              className="field normal-case"
              defaultValue={location}
              name="ubicacio"
            >
              <option value="">Totes les ubicacions</option>
              {locations.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </FilterLabel>
        </InstantFilterForm>
      </section>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <p>{visibleInventory.length} variants</p>
        {queryText || stock || location ? (
          <Link
            className="underline underline-offset-4"
            href="/admin/inventari"
          >
            Netejar filtres
          </Link>
        ) : null}
      </div>

      <section
        className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3"
        aria-label="Variants d’inventari"
      >
        {visibleInventory.map((row) => (
          <InventoryCard
            key={`${row.variant_id}:${row.location_id}`}
            requestKey={randomUUID()}
            row={row}
          />
        ))}
        {visibleInventory.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center lg:col-span-2 xl:col-span-3">
            <h2 className="font-serif text-2xl">Cap variant coincideix</h2>
            <p className="mt-2 text-sm text-muted">
              Canvia la cerca o neteja els filtres.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function InventoryCard({
  row,
  requestKey,
}: {
  row: InventoryRow;
  requestKey: string;
}) {
  const available = availableStock(row);
  const source = row.product_image_id
    ? `/media/products/${row.product_image_id}`
    : demoProductImage(row.product_slug);
  return (
    <article className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="grid grid-cols-[7rem_1fr] gap-4 p-4">
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-sand">
          {source ? (
            <Image
              alt={`Previsualització de ${row.product_name}`}
              className="object-cover"
              fill
              sizes="104px"
              src={source}
            />
          ) : (
            <span className="grid h-full place-items-center p-2 text-center text-[0.65rem] text-muted">
              Sense foto
            </span>
          )}
        </div>
        <div className="min-w-0 self-center">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            {row.sku}
          </p>
          <h2 className="mt-1 font-serif text-2xl">{row.product_name}</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <DataPill label="Talla" value={row.size} />
            <DataPill label="Color" value={row.color} />
            <DataPill label="Ubicació" value={row.location_name} />
          </div>
        </div>
        <div className="col-span-2 grid grid-cols-3 gap-2">
          <StockMetric
            alert={available <= 3}
            label="Disponible"
            value={available}
          />
          <StockMetric label="Físic" value={row.on_hand} />
          <StockMetric label="Reservat" value={row.reserved} />
        </div>
      </div>
      <details className="border-t border-line bg-[#faf9f6] px-4 py-3 sm:px-5">
        <summary className="cursor-pointer text-sm font-semibold text-[#315545]">
          Registrar una entrada o sortida d’estoc
        </summary>
        <div className="mt-4 max-w-xl">
          <InventoryForm requestKey={requestKey} row={row} />
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

function OverviewMetric({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: number;
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

function DataPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-md border border-line bg-white px-2.5 py-1.5">
      <span className="text-muted">{label}:</span> {value}
    </span>
  );
}

function StockMetric({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <span
      aria-label={`${label}: ${value}`}
      className={`min-w-20 rounded-lg p-2.5 text-center ${alert ? "bg-[#fff0e7] text-[#914724]" : "bg-sand"}`}
    >
      <strong className="block text-lg">{value}</strong>
      <span className="text-[0.62rem] uppercase">{label}</span>
    </span>
  );
}

function availableStock(row: InventoryRow) {
  return Math.max(0, row.on_hand - row.reserved);
}
