"use client";
import { useActionState } from "react";
import { enrollMfa, verifyMfa } from "@/server/auth/actions";
import type { MfaState } from "@/features/auth/validation";

export function MfaForm({
  verifiedFactorId,
}: {
  verifiedFactorId: string | null;
}) {
  const [enrollment, enroll, enrolling] = useActionState<MfaState>(
    async () => enrollMfa(),
    {
      ok: false,
      message: "",
    },
  );
  const [verification, verify, verifying] = useActionState(verifyMfa, {
    ok: false,
    message: "",
  });
  const factorId = verifiedFactorId ?? enrollment.factorId;
  return (
    <div className="mt-8 grid gap-6">
      {!verifiedFactorId ? (
        <form action={enroll}>
          <button disabled={enrolling} className="action">
            {enrolling
              ? "Preparant…"
              : enrollment.secret
                ? "Generar una clau nova"
                : "Configurar autenticador"}
          </button>
          <p role="status" className="mt-4">
            {enrollment.message}
          </p>
        </form>
      ) : null}
      {enrollment.secret ? (
        <div className="border border-line p-5">
          <p className="mb-3 text-sm">
            Clau privada de configuració. Desa-la només al teu autenticador.
          </p>
          <code className="break-all select-all">{enrollment.secret}</code>
        </div>
      ) : null}
      {factorId ? (
        <form action={verify} className="grid gap-4">
          <input type="hidden" name="factorId" value={factorId} />
          <label className="grid gap-2">
            Codi de l’autenticador
            <input
              className="field"
              name="token"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              required
            />
          </label>
          <button disabled={verifying} className="action">
            {verifying ? "Verificant…" : "Verificar autenticador"}
          </button>
          <p role="status">{verification.message}</p>
        </form>
      ) : null}
    </div>
  );
}
