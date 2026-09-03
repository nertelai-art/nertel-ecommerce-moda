import Link from "next/link";
import { randomUUID } from "node:crypto";
import { staffAccess } from "@/server/permissions/staff";
import { staffInventory } from "@/server/inventory/repository";
import { InventoryForm } from "@/components/admin/inventory-form";

export const metadata = { title: "Accés del personal" };
export default async function AdminPage() {
  const access = await staffAccess();
  const inventory =
    access.status === "allowed" &&
    access.permissions.includes("inventory.manage")
      ? await staffInventory()
      : [];
  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-6 py-14">
      <h1 className="font-serif text-4xl">Espai del personal</h1>
      {access.status === "mfa-required" ? (
        <>
          <p className="my-6">
            Verifica el segon factor per comprovar el teu accés.
          </p>
          <Link className="action" href="/compte/seguretat">
            Verificar autenticador
          </Link>
        </>
      ) : access.status === "denied" ? (
        <p className="my-6" role="status">
          Aquest compte no té permisos d’administració.
        </p>
      ) : (
        <>
          <p className="my-6">Accés verificat.</p>
          <h2 className="font-semibold">Permisos assignats</h2>
          <ul className="mt-4 list-inside list-disc">
            {access.permissions.map((permission) => (
              <li key={permission}>{permission}</li>
            ))}
          </ul>
          {access.permissions.includes("inventory.manage") ? (
            <section className="mt-10" aria-labelledby="inventory-title">
              <h2 id="inventory-title" className="font-serif text-3xl">
                Inventari
              </h2>
              <div className="mt-5 grid gap-6">
                {inventory.map((row) => (
                  <article
                    key={`${row.variant_id}:${row.location_id}`}
                    className="grid gap-3 border border-line bg-white p-5"
                  >
                    <h3 className="font-semibold">{row.product_name}</h3>
                    <p>
                      {row.sku} · {row.size} · {row.color}
                    </p>
                    <p>
                      {row.location_name}: {row.on_hand} disponibles físicament,{" "}
                      {row.reserved} reservats.
                    </p>
                    <InventoryForm row={row} requestKey={randomUUID()} />
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}
