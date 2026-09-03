import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { signOut } from "@/server/auth/actions";

export const metadata = { title: "El meu compte" };
export default async function AccountPage() {
  const { user, client } = await requireUser();
  const { data, error } =
    await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw new Error("Unable to verify authentication assurance");
  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-6 py-14">
      <h1 className="font-serif text-4xl">El meu compte</h1>
      <p className="mt-5 break-all">{user.email}</p>
      <p className="mt-4 text-muted">
        {data.currentLevel === "aal2"
          ? "Sessió verificada amb segon factor."
          : "Sessió iniciada. Pots reforçar-la amb un autenticador."}
      </p>
      <nav aria-label="Gestió del compte" className="my-8 flex flex-wrap gap-4">
        <Link className="action" href="/compte/seguretat">
          Seguretat i autenticador
        </Link>
        <Link className="action" href="/compte/contrasenya">
          Canviar contrasenya
        </Link>
        <Link className="action" href="/admin">
          Accés del personal
        </Link>
      </nav>
      <form action={signOut}>
        <button className="action">Tancar totes les sessions</button>
      </form>
    </main>
  );
}
