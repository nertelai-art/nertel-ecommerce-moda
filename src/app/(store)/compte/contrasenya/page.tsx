import { requireUser } from "@/server/auth/session";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Canviar contrasenya" };
export default async function PasswordPage() {
  await requireUser();
  return (
    <main id="main" className="mx-auto w-full max-w-lg px-6 py-14">
      <h1 className="font-serif text-4xl">Nova contrasenya</h1>
      <p className="mt-5 text-muted">
        Després del canvi hauràs de tornar a entrar.
      </p>
      <AuthForm mode="password" />
    </main>
  );
}
