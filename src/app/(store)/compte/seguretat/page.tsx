import { requireUser } from "@/server/auth/session";
import { MfaForm } from "@/components/auth/mfa-form";

export const metadata = { title: "Seguretat" };
export default async function SecurityPage() {
  const { client } = await requireUser();
  const { data, error } = await client.auth.mfa.listFactors();
  if (error) throw new Error("Unable to load factors");
  const factor = data.totp.find((item) => item.status === "verified");
  return (
    <main id="main" className="mx-auto w-full max-w-lg px-6 py-14">
      <h1 className="font-serif text-4xl">Seguretat del compte</h1>
      <p className="mt-5 leading-relaxed text-muted">
        Utilitza una aplicació d’autenticació per generar un segon codi d’accés.
        És obligatori per accedir a l’administració.
      </p>
      <MfaForm verifiedFactorId={factor?.id ?? null} />
    </main>
  );
}
