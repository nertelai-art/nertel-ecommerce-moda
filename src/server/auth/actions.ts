"use server";

import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authClient } from "./client";
import {
  authModeSchema,
  emailSchema,
  otpSchema,
  passwordSchema,
  trustedOrigin,
  type AuthState,
  type MfaState,
} from "@/features/auth/validation";

async function assertOrigin() {
  if ((await headers()).get("origin") !== trustedOrigin(process.env.APP_ORIGIN))
    throw new Error("Request origin rejected");
}

export async function submitAuth(
  modeInput: string,
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  await assertOrigin();
  const mode = authModeSchema.parse(modeInput);
  const email = emailSchema.safeParse(form.get("email"));
  const password = passwordSchema.safeParse(form.get("password"));
  const token = otpSchema.safeParse(form.get("token"));
  if (mode !== "password" && !email.success)
    return { ok: false, message: "Introdueix un correu vàlid." };
  if (["login", "register", "password"].includes(mode) && !password.success)
    return {
      ok: false,
      message: "La contrasenya ha de tenir entre 12 i 128 caràcters.",
    };
  if (["confirm", "verify-recovery"].includes(mode) && !token.success)
    return { ok: false, message: "Introdueix el codi de sis dígits." };

  let destination: string | null = null;
  try {
    const client = await authClient(true);
    if (mode === "login" && email.success && password.success) {
      const { error } = await client.auth.signInWithPassword({
        email: email.data,
        password: password.data,
      });
      if (error)
        return {
          ok: false,
          message:
            "No hem pogut entrar. Revisa les dades i confirma el correu.",
        };
      destination = "/compte";
    } else if (mode === "register" && email.success && password.success) {
      await client.auth.signUp({ email: email.data, password: password.data });
      (await cookies()).set(
        "moda-auth-flow",
        Buffer.from(
          JSON.stringify({ email: email.data, mode: "confirm" }),
        ).toString("base64url"),
        {
          httpOnly: true,
          sameSite: "lax",
          secure: trustedOrigin(process.env.APP_ORIGIN).startsWith("https:"),
          path: "/auth",
          maxAge: 600,
        },
      );
      destination = "/auth/confirmar";
    } else if (mode === "recover" && email.success) {
      await client.auth.resetPasswordForEmail(email.data);
      (await cookies()).set(
        "moda-auth-flow",
        Buffer.from(
          JSON.stringify({ email: email.data, mode: "verify-recovery" }),
        ).toString("base64url"),
        {
          httpOnly: true,
          sameSite: "lax",
          secure: trustedOrigin(process.env.APP_ORIGIN).startsWith("https:"),
          path: "/auth",
          maxAge: 600,
        },
      );
      destination = "/auth/validar-recuperacio";
    } else if (
      ["confirm", "verify-recovery"].includes(mode) &&
      email.success &&
      token.success
    ) {
      const { error } = await client.auth.verifyOtp({
        email: email.data,
        token: token.data,
        type: mode === "confirm" ? "signup" : "recovery",
      });
      if (error)
        return { ok: false, message: "El codi no és vàlid o ha caducat." };
      destination = mode === "confirm" ? "/compte" : "/compte/contrasenya";
    } else if (mode === "password" && password.success) {
      const { data, error: identityError } = await client.auth.getUser();
      if (identityError || !data.user)
        return { ok: false, message: "Torna a entrar o recupera el compte." };
      const { error } = await client.auth.updateUser({
        password: password.data,
      });
      if (error)
        return {
          ok: false,
          message:
            "No hem pogut canviar-la. Torna a iniciar la recuperació del compte.",
        };
      const { error: signOutError } = await client.auth.signOut({
        scope: "global",
      });
      if (signOutError)
        return {
          ok: false,
          message:
            "Contrasenya canviada. Torna a provar de tancar les sessions.",
        };
      destination = "/auth/entrar";
    }
  } catch {
    return {
      ok: false,
      message:
        "El servei d’accés no està disponible. Torna-ho a provar més tard.",
    };
  }
  if (destination) {
    revalidatePath("/", "layout");
    redirect(destination);
  }
  return { ok: false, message: "No hem pogut completar la petició." };
}

export async function signOut() {
  await assertOrigin();
  const client = await authClient(true);
  const { error } = await client.auth.signOut({ scope: "global" });
  if (error) throw new Error("Unable to end session");
  revalidatePath("/", "layout");
  redirect("/auth/entrar");
}

export async function enrollMfa(): Promise<MfaState> {
  await assertOrigin();
  try {
    const client = await authClient(true);
    const { data: identity, error: identityError } =
      await client.auth.getUser();
    if (identityError || !identity.user)
      return { ok: false, message: "Torna a entrar al compte." };
    const { data: factors, error: listError } =
      await client.auth.mfa.listFactors();
    if (listError)
      return { ok: false, message: "No hem pogut consultar els factors." };
    if (factors.totp.some((factor) => factor.status === "verified"))
      return {
        ok: false,
        message: "Ja tens un autenticador activat. Introdueix-ne el codi.",
      };
    for (const factor of factors.all.filter(
      (factor) =>
        factor.factor_type === "totp" && factor.status === "unverified",
    )) {
      const { error } = await client.auth.mfa.unenroll({ factorId: factor.id });
      if (error)
        return {
          ok: false,
          message: "No hem pogut reiniciar la configuració.",
        };
    }
    const { data, error } = await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Autenticador",
      issuer: "Botiga de moda",
    });
    if (error)
      return { ok: false, message: "No hem pogut preparar l’autenticador." };
    return {
      ok: true,
      message:
        "Afegeix aquesta clau al teu autenticador i introdueix el codi que generi.",
      secret: data.totp.secret,
      factorId: data.id,
    };
  } catch {
    return { ok: false, message: "El servei no està disponible." };
  }
}

export async function verifyMfa(
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  await assertOrigin();
  const factorId = z.uuid().safeParse(form.get("factorId"));
  const code = otpSchema.safeParse(form.get("token"));
  if (!factorId.success || !code.success)
    return { ok: false, message: "Introdueix un codi de sis dígits." };
  try {
    const client = await authClient(true);
    const { data: identity, error: identityError } =
      await client.auth.getUser();
    if (identityError || !identity.user)
      return { ok: false, message: "Torna a entrar al compte." };
    const { error } = await client.auth.mfa.challengeAndVerify({
      factorId: factorId.data,
      code: code.data,
    });
    if (error)
      return { ok: false, message: "El codi no és vàlid o ha caducat." };
  } catch {
    return { ok: false, message: "El servei no està disponible." };
  }
  revalidatePath("/", "layout");
  redirect("/compte");
}
