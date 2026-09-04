import { randomUUID } from "node:crypto";
import { InventoryForm } from "@/components/admin/inventory-form";
import { staffInventory } from "@/server/inventory/repository";
import { staffAccess } from "@/server/permissions/staff";

export const metadata = { title: "Inventari · Administració" };

export default async function AdminInventoryPage() {
  const access = await staffAccess();
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
  return (
    <main id="main" className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <header className="border-b border-line pb-7">
        <p className="text-xs tracking-[0.18em] text-muted uppercase">
          Operacions
        </p>
        <h1 className="mt-2 font-serif text-4xl sm:text-5xl">Inventari</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Consulta l’estoc físic i reservat. Cada ajust requereix una quantitat
          i un motiu i queda registrat.
        </p>
      </header>
      <div className="mt-8 overflow-x-auto border border-line bg-white">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-[#e8e8e1] text-xs tracking-wide uppercase">
            <tr>
              <th className="px-4 py-3">Producte</th>
              <th className="px-4 py-3">Variant</th>
              <th className="px-4 py-3">Ubicació</th>
              <th className="px-4 py-3">Físic</th>
              <th className="px-4 py-3">Reservat</th>
              <th className="px-4 py-3">Disponible</th>
              <th className="px-4 py-3">Ajust</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((row) => {
              const available = Math.max(0, row.on_hand - row.reserved);
              return (
                <tr
                  className="border-t border-line align-top"
                  key={`${row.variant_id}:${row.location_id}`}
                >
                  <td className="px-4 py-4 font-semibold">
                    {row.product_name}
                  </td>
                  <td className="px-4 py-4">
                    {row.sku}
                    <span className="block text-xs text-muted">
                      {row.size} · {row.color}
                    </span>
                  </td>
                  <td className="px-4 py-4">{row.location_name}</td>
                  <td className="px-4 py-4">{row.on_hand}</td>
                  <td className="px-4 py-4">{row.reserved}</td>
                  <td
                    className={`px-4 py-4 font-semibold ${available <= 3 ? "text-[#9a4e2d]" : ""}`}
                  >
                    {available}
                  </td>
                  <td className="w-72 px-4 py-4">
                    <InventoryForm row={row} requestKey={randomUUID()} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
