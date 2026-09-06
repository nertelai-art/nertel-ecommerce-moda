#!/usr/bin/env node
// La cadena de migracions ha de reproduir l'esquema real.
//
// `supabase db diff` munta una base ombra, hi aplica NOMES les migracions i la
// compara amb la base viva. Si en surt SQL, hi ha alguna cosa que cap migracio
// explica: DDL aplicat a ma amb psql o des de Studio.
//
// Compte amb la forma de la sortida: la CLI escriu a stdout un sobre JSON que
// SEMPRE es no buit, fins i tot sense cap diferencia:
//   {"diff":"\n","file":null,"files":[],...,"message":"Diff complete."}
// Comprovar si stdout te contingut, doncs, dona sempre positiu. El que val es
// el camp `diff`. El missatge llegible per humans va a stderr.

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

const payload = stdout.trim().split("\n").at(-1) ?? "";
let diff;

try {
  diff = JSON.parse(payload).diff ?? "";
} catch {
  console.error("Sortida inesperada de supabase db diff:");
  console.error(payload.slice(0, 500));
  process.exit(2);
}

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
