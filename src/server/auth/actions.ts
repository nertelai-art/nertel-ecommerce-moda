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
  isAllowedRequestOrigin,
  trustedOrigin,
  type AuthState,
  type MfaState,
} from "@/features/auth/validation";

/**
 * Un rebuig d'origen no és una fallada de connexió, i presentar-lo com si ho
 * fos costa hores: en local, la causa gairebé sempre és que el servidor de
 * desenvolupament ha agafat un altre port perquè el seu estava ocupat, i
 * APP_ORIGIN ha de coincidir exactament. Es marca perquè qui el reculli el
 * pugui distingir de la resta.
 */
const originRejected = "Request origin rejected";

async function assertOrigin() {
  if (
    !isAllowedRequestOrigin(
      (await headers()).get("origin"),
      process.env.APP_ORIGIN,
    )
  )
    throw new Error(originRejected);
}

function isOriginRejection(error: unknown) {
  return error instanceof Error && error.message === originRejected;
}

function originRejectionMessage() {
  // El valor d'APP_ORIGIN no és cap secret: és l'adreça pública del lloc. Només
  // es diu en desenvolupament perquè és on serveix de res dir-lo.
  return process.env.NODE_ENV === "development"
    ? `Aquesta petició no ve de l’origen configurat. APP_ORIGIN és ${process.env.APP_ORIGIN}; ha de coincidir amb el port on escolta el servidor de desenvolupament.`
    : "Aquesta petició no ve de l’origen esperat. Torna a carregar la pàgina i prova-ho de nou.";
}

export async function submitAuth(
  modeInput: string,
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  const mode = authModeSchema.safeParse(modeInput);
  if (!mode.success)
    return { ok: false, message: "No hem pogut processar aquesta operació." };
  const submittedEmail =
    typeof form.get("email") === "string"
      ? String(form.get("email")).trim().slice(0, 254)
      : undefined;
  const failure = (message: string): AuthState => ({
    ok: false,
    message,
    ...(mode.data !== "password" && submittedEmail
      ? { email: submittedEmail }
      : {}),
  });
  const email = emailSchema.safeParse(form.get("email"));
  const password = passwordSchema.safeParse(form.get("password"));
  const token = otpSchema.safeParse(form.get("token"));
  if (mode.data !== "password" && !email.success)
    return failure("Introdueix un correu vàlid.");
  if (
    ["login", "register", "password"].includes(mode.data) &&
    !password.success
  )
    return failure("La contrasenya ha de tenir entre 12 i 128 caràcters.");
  if (["confirm", "verify-recovery"].includes(mode.data) && !token.success)
    return failure("Introdueix el codi de sis dígits.");

  let destination: string | null = null;
  try {
    await assertOrigin();
    const client = await authClient(true);
    if (mode.data === "login" && email.success && password.success) {
      const { error } = await client.auth.signInWithPassword({
        email: email.data,
        password: password.data,
      });
      if (error)
        return failure(
          "No hem pogut entrar. Revisa les dades i confirma el correu.",
        );
      const permissions = await client.rpc("current_staff_permissions");
      destination =
        !permissions.error && permissions.data.length > 0
          ? "/admin"
          : "/compte";
    } else if (mode.data === "register" && email.success && password.success) {
      const { data, error } = await client.auth.signUp({
        email: email.data,
        password: password.data,
      });
      if (error)
        return failure(
          "No hem pogut crear el compte. Torna-ho a provar o entra si ja en tens un.",
        );
      if (data.session) {
        // Auth decides whether email confirmation is required in this environment.
        (await cookies()).set("moda-auth-flow", "", {
          path: "/auth",
          maxAge: 0,
        });
        destination = "/compte";
      } else {
        (await cookies()).set(
          "moda-auth-flow",
          Buffer.from(
            JSON.stringify({ email: email.data, mode: "confirm" }),
          ).toString("base64url"),
          {
            httpOnly: true,
            sameSite: "lax",
            secure:
              process.env.NODE_ENV === "production" ||
              trustedOrigin(process.env.APP_ORIGIN).startsWith("https:"),
            path: "/auth",
            maxAge: 600,
          },
        );
        destination = "/auth/confirmar";
      }
    } else if (mode.data === "recover" && email.success) {
      await client.auth.resetPasswordForEmail(email.data);
      (await cookies()).set(
        "moda-auth-flow",
        Buffer.from(
          JSON.stringify({ email: email.data, mode: "verify-recovery" }),
        ).toString("base64url"),
        {
          httpOnly: true,
          sameSite: "lax",
          secure:
            process.env.NODE_ENV === "production" ||
            trustedOrigin(process.env.APP_ORIGIN).startsWith("https:"),
          path: "/auth",
          maxAge: 600,
        },
      );
      destination = "/auth/validar-recuperacio";
    } else if (
      ["confirm", "verify-recovery"].includes(mode.data) &&
      email.success &&
      token.success
    ) {
      const { error } = await client.auth.verifyOtp({
        email: email.data,
        token: token.data,
        type: mode.data === "confirm" ? "signup" : "recovery",
      });
      if (error) return failure("El codi no és vàlid o ha caducat.");
      destination = mode.data === "confirm" ? "/compte" : "/compte/contrasenya";
    } else if (mode.data === "password" && password.success) {
      const { data, error: identityError } = await client.auth.getUser();
      if (identityError || !data.user)
        return failure("Torna a entrar o recupera el compte.");
      const { error } = await client.auth.updateUser({
        password: password.data,
      });
      if (error)
        return failure(
          "No hem pogut canviar-la. Torna a iniciar la recuperació del compte.",
        );
      const { error: signOutError } = await client.auth.signOut({
        scope: "global",
      });
      if (signOutError)
        return failure(
          "Contrasenya canviada. Torna a provar de tancar les sessions.",
        );
      destination = "/auth/entrar";
    }
  } catch (error) {
    if (isOriginRejection(error)) return failure(originRejectionMessage());
    return failure(
      "No hem pogut connectar amb el servei d’accés. El correu es conserva perquè ho puguis tornar a provar.",
    );
  }
  if (destination) {
    revalidatePath("/", "layout");
    redirect(destination);
  }
  return failure("No hem pogut completar la petició.");
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
