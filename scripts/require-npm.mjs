// Porta de gestor de paquets.
//
// Aquest projecte va amb npm i package-lock.json, cosa que es desvia de la
// regla de casa de pnpm. És deute conegut, anterior a la regla: el lockfile,
// `npm ci` a tots els workflows i `release:check` hi depenen. El motiu llarg és
// al CLAUDE.md. Mentre no es migri, barrejar gestors crea un segon lockfile i
// desfà l'aïllament, i el fitxer orfe fa caure `format:check`, que és el que
// sosté el hook de pre-push i la porta de qualitat.
//
// pnpm i yarn executen els scripts de cicle de vida del projecte arrel encara
// que bloquegin els de les dependències, de manera que aquesta comprovació els
// atura. No ho atura tot: pnpm enllaça paquets i escriu el seu lockfile abans
// d'arribar aquí, per això `pnpm-lock.yaml` i `pnpm-workspace.yaml` també són
// a .gitignore i a .prettierignore. Això és el que evita el dany real; aquest
// fitxer només fa que l'error digui la veritat.

const agent = process.env.npm_config_user_agent ?? "";
const manager = agent.split("/", 1)[0];

// Sense agent vol dir que algú ha executat l'script a mà. No hi ha res a barrar.
if (manager && manager !== "npm") {
  process.stderr.write(
    [
      "",
      `  Aquest projecte va amb npm, no amb ${manager}.`,
      "",
      "    npm ci        en clonar, o per tornar a deixar net node_modules",
      "    npm install   per afegir o actualitzar dependències",
      "    npm run dev   per treballar",
      "",
      `  El perquè és al CLAUDE.md. Si ${manager} ja ha tocat node_modules,`,
      "  «npm ci» ho refà des de package-lock.json i tot torna al seu lloc.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}
