// Arrencada del servidor de desenvolupament, amb les comprovacions que
// converteixen un error confús en una frase.
//
// Les tres coses que han fallat de veritat en aquest projecte, per ordre:
//
//   1. Un altre gestor de paquets. node_modules queda a mig fer i l'error surt
//      molt més tard, en un lloc que no hi té res a veure.
//   2. El port. Si el port d'APP_ORIGIN no és el port on escolta el servidor,
//      les pàgines es veuen perfectes i TOTA escriptura dona 403, perquè la
//      comprovació d'origen les rebutja. És el pitjor dels tres: sembla que
//      funcioni.
//   3. La pila local aturada. Sense Supabase no hi ha catàleg ni accés, i el
//      missatge que arriba a la pantalla no diu que Docker no està en marxa.
//
// Per això el port surt d'APP_ORIGIN i no d'una bandera: així no poden
// divergir. Un sol lloc on canviar-lo.

import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const bad = (...lines) => {
  process.stderr.write(`\n${lines.map((l) => `  ${l}`).join("\n")}\n\n`);
  process.exit(1);
};

// 1. Gestor de paquets.
const manager = (process.env.npm_config_user_agent ?? "").split("/", 1)[0];
if (manager && manager !== "pnpm") {
  bad(
    `Aquest projecte va amb pnpm, no amb ${manager}.`,
    "",
    "  pnpm install --frozen-lockfile",
    "  pnpm dev",
  );
}

// 2. Origen i port.
if (!existsSync(".env.local")) {
  bad(
    "Falta .env.local.",
    "",
    "  Copia .env.example i omple'l:",
    "    cp .env.example .env.local",
    "    pnpm db:env      # hi escriu la clau pública de la pila local",
  );
}
process.loadEnvFile(".env.local");

let origin;
try {
  origin = new URL(process.env.APP_ORIGIN ?? "");
} catch {
  bad(`APP_ORIGIN no és una URL vàlida: ${process.env.APP_ORIGIN ?? "(buit)"}`);
}
const port = origin.port || (origin.protocol === "https:" ? "443" : "80");

// 3. La pila local.
const supabase = process.env.SUPABASE_URL;
try {
  const health = await fetch(`${supabase}/auth/v1/health`, {
    signal: AbortSignal.timeout(4000),
  });
  if (!health.ok) throw new Error(String(health.status));
} catch {
  bad(
    `La pila local de Supabase no respon a ${supabase}.`,
    "",
    "  Arrenca-la abans del servidor:",
    "    pnpm db:start",
    "",
    "  Sense això el catàleg i l'accés fallen, i el missatge que veuràs a la",
    "  pantalla no dirà que el problema és aquest.",
  );
}

// El port surt d'APP_ORIGIN. Si està ocupat, val més aturar-se que deixar que
// Next n'agafi un altre: el servidor arrencaria i cap escriptura funcionaria.
const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, "dev", "--port", port], {
  stdio: "inherit",
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
