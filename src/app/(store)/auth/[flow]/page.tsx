import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { AuthForm } from "@/components/auth/auth-form";
import { emailSchema, type AuthMode } from "@/features/auth/validation";

const flows: Record<string, AuthMode> = {
  entrar: "login",
  registre: "register",
  confirmar: "confirm",
  recuperar: "recover",
  "validar-recuperacio": "verify-recovery",
};
export const metadata = { title: "El teu compte" };
export default async function AuthPage({
  params,
}: {
  params: Promise<{ flow: string }>;
}) {
  const { flow } = await params;
  const mode = Object.hasOwn(flows, flow) ? flows[flow] : undefined;
  if (!mode) notFound();
  // Navigation context only, never proof of identity: the provider verifies the OTP.
  const context = (await cookies()).get("moda-auth-flow")?.value;
  let pending: { email: string; mode: "confirm" | "verify-recovery" } | null =
    null;
  try {
    if (context)
      pending = z
        .object({
          email: emailSchema,
          mode: z.enum(["confirm", "verify-recovery"]),
        })
        .parse(JSON.parse(Buffer.from(context, "base64url").toString()));
  } catch {
    /* Ignore malformed navigation context. */
  }
  if (
    (mode === "confirm" || mode === "verify-recovery") &&
    pending?.mode !== mode
  )
    redirect(mode === "confirm" ? "/auth/registre" : "/auth/recuperar");
  return (
    <main id="main" className="mx-auto w-full max-w-md px-6 py-12 sm:py-16">
      <AuthForm
        key={mode}
        mode={mode}
        email={mode === "login" ? "" : (pending?.email ?? "")}
      />
    </main>
  );
}
