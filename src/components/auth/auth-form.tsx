"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { submitAuth } from "@/server/auth/actions";
import type { AuthMode } from "@/features/auth/validation";

const copy: Record<
  AuthMode,
  { title: string; description: string; button: string }
> = {
  login: {
    title: "Benvinguda de nou",
    description: "Entra i continua descobrint la col·lecció.",
    button: "Entrar",
  },
  register: {
    title: "Crea el teu compte",
    description: "Comencem amb el teu correu i una contrasenya.",
    button: "Crear compte",
  },
  recover: {
    title: "Has oblidat la contrasenya?",
    description: "Escriu el teu correu i t’ajudarem a recuperar l’accés.",
    button: "Enviar codi",
  },
  confirm: {
    title: "Revisa el teu correu",
    description:
      "Si podem registrar aquest correu, hi rebràs un codi per confirmar-lo.",
    button: "Confirmar correu",
  },
  "verify-recovery": {
    title: "Revisa el teu correu",
    description:
      "Si el compte existeix, hi rebràs un codi per recuperar l’accés.",
    button: "Validar codi",
  },
  password: {
    title: "Nova contrasenya",
    description: "",
    button: "Canviar contrasenya",
  },
};

export function AuthForm({
  mode,
  email = "",
}: {
  mode: AuthMode;
  email?: string;
}) {
  const [state, action, pending] = useActionState(submitAuth.bind(null, mode), {
    ok: false,
    message: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [emailOverride, setEmailOverride] = useState<string | null>(null);
  const needsPassword = ["login", "register", "password"].includes(mode);
  const needsCode = ["confirm", "verify-recovery"].includes(mode);
  const content = copy[mode];
  return (
    <>
      {mode !== "password" ? (
        <header className="text-center">
          <h1 className="font-serif text-4xl leading-tight outline-none sm:text-[2.6rem]">
            {content.title}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            {content.description}
          </p>
          {needsCode && email ? (
            <p className="mt-3 break-all font-medium">{email}</p>
          ) : null}
        </header>
      ) : null}
      <form action={action} className="mt-8 grid gap-5">
        {mode !== "password" ? (
          needsCode && email ? (
            <input name="email" type="hidden" value={email} />
          ) : (
            <label className="grid gap-2 text-sm font-medium">
              Correu electrònic
              <input
                className="field"
                name="email"
                type="email"
                autoComplete="email"
                value={emailOverride ?? state.email ?? email}
                onChange={(event) => setEmailOverride(event.target.value)}
                required
                maxLength={254}
              />
            </label>
          )
        ) : null}
        {needsPassword ? (
          <div>
            <label className="grid gap-2 text-sm font-medium">
              {mode === "password" ? "Nova contrasenya" : "Contrasenya"}
              <span className="relative">
                <input
                  className="field pr-20"
                  name="password"
                  aria-label={
                    mode === "password" ? "Nova contrasenya" : "Contrasenya"
                  }
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  required
                  minLength={12}
                  maxLength={128}
                />
                <button
                  type="button"
                  aria-label={
                    showPassword ? "Amagar contrasenya" : "Mostrar contrasenya"
                  }
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 min-w-20 px-3 text-xs text-muted"
                >
                  {showPassword ? "Amagar" : "Mostrar"}
                </button>
              </span>
            </label>
            {mode === "login" ? (
              <div className="mt-1 text-right">
                <Link
                  href="/auth/recuperar"
                  className="inline-flex min-h-11 items-center text-xs text-muted underline-offset-4 hover:underline"
                >
                  He oblidat la contrasenya
                </Link>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted">
                Utilitza entre 12 i 128 caràcters.
              </p>
            )}
          </div>
        ) : null}
        {needsCode ? (
          <label className="grid gap-2 text-sm font-medium">
            Codi del correu
            <input
              className="field text-center text-xl tracking-[0.4em]"
              name="token"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              required
              minLength={6}
              maxLength={6}
            />
            <span className="text-xs font-normal text-muted">
              Caduca al cap de 10 minuts. Revisa també el correu brossa.
            </span>
          </label>
        ) : null}
        <button className="action w-full" disabled={pending}>
          {pending ? "Un moment…" : content.button}
        </button>
        {state.message ? (
          <p
            role={state.ok ? "status" : "alert"}
            aria-live="polite"
            className={`border px-4 py-3 text-sm leading-relaxed ${
              state.ok
                ? "border-line bg-white"
                : "border-red-300 bg-red-50 text-red-900"
            }`}
          >
            {state.message}
          </p>
        ) : null}
      </form>
      {mode === "login" ? (
        <p className="mt-7 border-t border-line pt-6 text-center text-sm text-muted">
          Encara no tens compte?{" "}
          <Link
            className="inline-flex min-h-11 items-center font-medium text-foreground underline underline-offset-4"
            href="/auth/registre"
          >
            Crea un compte
          </Link>
        </p>
      ) : null}
      {mode === "register" ? (
        <p className="mt-7 border-t border-line pt-6 text-center text-sm text-muted">
          Ja tens compte?{" "}
          <Link
            className="inline-flex min-h-11 items-center font-medium text-foreground underline underline-offset-4"
            href="/auth/entrar"
          >
            Entra
          </Link>
        </p>
      ) : null}
      {needsCode && email ? (
        <div className="mt-5 text-center">
          <Link
            href={mode === "confirm" ? "/auth/registre" : "/auth/recuperar"}
            className="min-h-11 text-sm text-muted underline underline-offset-4"
          >
            Canviar el correu o tornar-ho a provar
          </Link>
        </div>
      ) : null}
      {["recover", "confirm", "verify-recovery"].includes(mode) ? (
        <div className="mt-5 text-center">
          <Link
            className="inline-flex min-h-11 items-center text-sm text-muted underline-offset-4 hover:underline"
            href="/auth/entrar"
          >
            ← Tornar a entrar
          </Link>
        </div>
      ) : null}
    </>
  );
}
