#!/usr/bin/env node
// La cadena de migracions ha de reproduir l'esquema real.
//
// `supabase db diff` munta una base ombra, hi aplica NOMES les migracions i la
// compara amb la base viva. Si en surt SQL, hi ha alguna cosa que cap migracio
// explica: DDL aplicat a ma amb psql o des de Studio.
//
// La forma de la sortida no es estable entre entorns, i aixo ja ens ha enganyat
// dues vegades. Els missatges llegibles van sempre a stderr; a stdout hi pot
// haver tres coses:
//
//   1. Res, quan no hi ha diferencies en algun entorn (CI).
//   2. Un sobre JSON que SEMPRE es no buit, fins i tot sense diferencies:
//      {"diff":"\n","file":null,...,"message":"Diff complete."}  (local)
//   3. El SQL de la diferencia, en cru.
//
// Per aixo no serveix ni «stdout te contingut» ni assumir JSON. Es tracten els
// tres casos, i qualsevol SQL que no sapiguem explicar compta com a deriva.

import { execSync } from "node:child_process";

const schemas = "public,private,storage";
let stdout;

try {
  // Ordre literal i sense cap valor de fora: no hi ha res que interpolar, aixi
  // que la shell aqui es segura i evita el .cmd de Windows amb execFile.
  stdout = execSync(`npx supabase db diff --local --schema ${schemas}`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
} catch (error) {
  console.error("No s'ha pogut executar supabase db diff.");
  console.error(String(error.message).split("\n")[0]);
  process.exit(2);
}

function extractDiff(output) {
  const trimmed = output.trim();
  if (trimmed === "") return "";

  const lastLine = trimmed.split("\n").at(-1) ?? "";
  if (lastLine.startsWith("{") && lastLine.endsWith("}")) {
    try {
      const parsed = JSON.parse(lastLine);
      if (typeof parsed.diff === "string") return parsed.diff;
    } catch {
      // No era el sobre JSON; es tracta com a SQL en cru.
    }
  }
  return trimmed;
}

const diff = extractDiff(stdout);

if (diff.trim() === "") {
  console.log("Sense deriva: la cadena reprodueix l'esquema real.");
  process.exit(0);
}

console.error("L'esquema real no coincideix amb les migracions:");
console.error(diff);
console.error(
  "\nEscriu una migracio que ho expliqui. No apliquis DDL fora de la cadena.",
);
process.exit(1);
