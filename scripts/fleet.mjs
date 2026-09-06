#!/usr/bin/env node
// Operacions sobre totes les instancies alhora. No conte cap secret: llegeix
// la referencia de projecte de scripts/instances.json i
// el testimoni d'acces de SUPABASE_ACCESS_TOKEN de l'entorn de qui l'executa.
//
//   node scripts/fleet.mjs status          estat de migracions de cada botiga
//   node scripts/fleet.mjs drift           falla si alguna ha derivat
//   node scripts/fleet.mjs push --dry-run  mostra que aplicaria a cadascuna
//   node scripts/fleet.mjs push --confirm  aplica la cadena, botiga a botiga
//
// push sense --confirm no toca res. push --confirm s'atura a la primera que
// falla i no continua: es preferible una flota parcialment migrada i coneguda
// que una flota migrada a mitges i silenciosa.

import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const manifestPath = new URL("./instances.json", import.meta.url);
const instances = JSON.parse(readFileSync(manifestPath, "utf8")).instances;
const localVersions = readdirSync(
  new URL("../supabase/migrations", import.meta.url),
)
  .filter((name) => name.endsWith(".sql"))
  .map((name) => name.split("_")[0])
  .sort();
const head = localVersions.at(-1);

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error("Falta SUPABASE_ACCESS_TOKEN a l'entorn.");
  process.exit(2);
}

function cli(args, ref) {
  return execFileSync("npx", ["supabase", ...args, "--project-ref", ref], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

// La sortida de `migration list` porta una columna local i una de remota.
// Una instancia esta al dia si totes les versions locals hi consten com a
// aplicades i no n'hi ha cap de remota que no tinguem al disc.
function remoteState(ref) {
  const rows = cli(["migration", "list"], ref)
    .split("\n")
    .map((line) => line.split("|").map((cell) => cell.trim()))
    .filter(
      (cells) => cells.length >= 2 && /^\d{14}$/.test(cells[0] || cells[1]),
    );
  const applied = new Set(rows.map((cells) => cells[1]).filter(Boolean));
  const unknown = [...applied].filter(
    (version) => !localVersions.includes(version),
  );
  const missing = localVersions.filter((version) => !applied.has(version));
  return { applied, unknown, missing };
}

const command = process.argv[2];
const flags = new Set(process.argv.slice(3));
let failures = 0;

for (const instance of instances) {
  const { shop, ref, region } = instance;
  let state;
  try {
    state = remoteState(ref);
  } catch (error) {
    console.error(
      `${shop.padEnd(20)} INABASTABLE  ${String(error.message).split("\n")[0]}`,
    );
    failures += 1;
    continue;
  }

  const label =
    state.unknown.length > 0
      ? "DERIVA"
      : state.missing.length > 0
        ? `ENDARRERIDA (${state.missing.length})`
        : "AL DIA";

  if (command === "status" || command === "drift") {
    console.log(
      `${shop.padEnd(20)} ${region.padEnd(14)} ${label.padEnd(18)} cap: ${head}`,
    );
    if (state.unknown.length > 0) {
      console.log(
        `  versions remotes que no tenim al disc: ${state.unknown.join(", ")}`,
      );
    }
    if (state.missing.length > 0) {
      console.log(`  pendents d'aplicar: ${state.missing.join(", ")}`);
    }
    // `drift` nomes falla per versions desconegudes: anar endarrerit es
    // recuperable, tenir DDL que ningu ha registrat no ho es.
    if (state.unknown.length > 0) failures += 1;
    if (command === "status" && state.missing.length > 0) failures += 1;
    continue;
  }

  if (command === "push") {
    if (state.unknown.length > 0) {
      console.error(`${shop}: te deriva. Resol-la abans de continuar.`);
      process.exit(1);
    }
    if (state.missing.length === 0) {
      console.log(`${shop.padEnd(20)} ja esta al dia`);
      continue;
    }
    console.log(`${shop.padEnd(20)} aplicaria: ${state.missing.join(", ")}`);
    if (!flags.has("--confirm")) continue;
    try {
      cli(["db", "push", "--include-all"], ref);
      console.log(`${shop.padEnd(20)} aplicada fins a ${head}`);
    } catch (error) {
      console.error(`${shop}: ha fallat. La flota queda a mitges a proposit.`);
      console.error(String(error.stdout || error.message));
      process.exit(1);
    }
    continue;
  }

  console.error("Ordre desconeguda. Fes servir status, drift o push.");
  process.exit(2);
}

process.exit(failures > 0 ? 1 : 0);
