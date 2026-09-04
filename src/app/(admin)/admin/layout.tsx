import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { staffAccess } from "@/server/permissions/staff";

export const metadata = { title: "Administració" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await staffAccess();
  if (access.status === "mfa-required")
    return (
      <AccessMessage title="Verificació necessària">
        <p>Verifica el segon factor abans d’entrar a l’administració.</p>
        <Link className="action w-fit" href="/compte/seguretat">
          Verificar autenticador
        </Link>
      </AccessMessage>
    );
  if (access.status === "denied")
    return (
      <AccessMessage title="Accés restringit">
        <p>Aquest compte no té permisos d’administració.</p>
        <Link className="text-sm underline" href="/">
          Tornar a la botiga
        </Link>
      </AccessMessage>
    );
  return <AdminShell>{children}</AdminShell>;
}

function AccessMessage({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f2f1ed] px-6">
      <section className="grid max-w-lg gap-5 border border-line bg-white p-8">
        <p className="text-xs tracking-[0.18em] text-muted uppercase">Admin</p>
        <h1 className="font-serif text-4xl">{title}</h1>
        {children}
      </section>
    </main>
  );
}
