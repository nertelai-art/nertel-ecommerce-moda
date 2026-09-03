import Link from "next/link";
import { staffAccess } from "@/server/permissions/staff";

export const metadata = { title: "Accés del personal" };
export default async function AdminPage() {
  const access = await staffAccess();
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
          <p className="my-6">
            Accés verificat. Les eines de gestió encara estan en preparació.
          </p>
          <h2 className="font-semibold">Permisos assignats</h2>
          <ul className="mt-4 list-inside list-disc">
            {access.permissions.map((permission) => (
              <li key={permission}>{permission}</li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
