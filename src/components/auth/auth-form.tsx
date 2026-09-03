"use client";
import { useActionState } from "react";
import { submitAuth } from "@/server/auth/actions";
import type { AuthMode } from "@/features/auth/validation";

const labels: Record<AuthMode, string> = {
  login: "Entrar",
  register: "Crear compte",
  confirm: "Confirmar correu",
  recover: "Enviar codi",
  "verify-recovery": "Validar codi",
  password: "Canviar contrasenya",
};
export function AuthForm({ mode }: { mode: AuthMode }) {
  const [state, action, pending] = useActionState(submitAuth.bind(null, mode), {
    ok: false,
    message: "",
  });
  const needsPassword = ["login", "register", "password"].includes(mode);
  const needsCode = ["confirm", "verify-recovery"].includes(mode);
  return (
    <form action={action} className="mt-8 grid gap-5">
      {mode !== "password" ? (
        <label className="grid gap-2">
          Correu electrònic
          <input
            className="field"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </label>
      ) : null}
      {needsPassword ? (
        <label className="grid gap-2">
          {mode === "password" ? "Nova contrasenya" : "Contrasenya"}
          <input
            className="field"
            name="password"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
            minLength={12}
            maxLength={128}
          />
          <span className="text-sm text-muted">Entre 12 i 128 caràcters.</span>
        </label>
      ) : null}
      {needsCode ? (
        <label className="grid gap-2">
          Codi del correu
          <input
            className="field"
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            required
            minLength={6}
            maxLength={6}
          />
        </label>
      ) : null}
      <button className="action" disabled={pending}>
        {pending ? "Un moment…" : labels[mode]}
      </button>
      <p role="status" aria-live="polite" className="text-sm leading-relaxed">
        {state.message}
      </p>
    </form>
  );
}
