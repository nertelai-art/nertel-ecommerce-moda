import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import type { AuthMode } from "@/features/auth/validation";

const flows: Record<
  string,
  { title: string; mode: AuthMode; description: string }
> = {
  entrar: {
    title: "Benvinguda de nou",
    mode: "login",
    description: "Entra al teu compte.",
  },
  registre: {
    title: "El teu espai",
    mode: "register",
    description: "Crea un compte i confirma el teu correu electrònic.",
  },
  confirmar: {
    title: "Confirma el correu",
    mode: "confirm",
    description:
      "Introdueix el codi que t’hem enviat. Caduca al cap de deu minuts.",
  },
  recuperar: {
    title: "Recupera el compte",
    mode: "recover",
    description: "T’enviarem un codi si hi ha un compte amb aquest correu.",
  },
  "validar-recuperacio": {
    title: "Valida la recuperació",
    mode: "verify-recovery",
    description:
      "Introdueix el codi del correu per escollir una contrasenya nova.",
  },
};
export const metadata = { title: "Accés al compte" };
export default async function AuthPage({
  params,
}: {
  params: Promise<{ flow: string }>;
}) {
  const { flow } = await params;
  const config = Object.hasOwn(flows, flow) ? flows[flow] : undefined;
  if (!config) notFound();
  return (
    <main id="main" className="mx-auto w-full max-w-lg px-6 py-14">
      <h1 className="font-serif text-4xl">{config.title}</h1>
      <p className="mt-5 text-muted">{config.description}</p>
      <AuthForm mode={config.mode} />
      <nav aria-label="Opcions del compte" className="mt-6 grid gap-3 text-sm">
        <Link
          className="min-h-11 underline underline-offset-4"
          href="/auth/entrar"
        >
          Ja tinc un compte
        </Link>
        <Link
          className="min-h-11 underline underline-offset-4"
          href="/auth/registre"
        >
          Crear un compte
        </Link>
        <Link
          className="min-h-11 underline underline-offset-4"
          href="/auth/confirmar"
        >
          Confirmar correu
        </Link>
        <Link
          className="min-h-11 underline underline-offset-4"
          href="/auth/recuperar"
        >
          He oblidat la contrasenya
        </Link>
        <Link
          className="min-h-11 underline underline-offset-4"
          href="/auth/validar-recuperacio"
        >
          Validar codi de recuperació
        </Link>
      </nav>
    </main>
  );
}
