// Porta de gestor de paquets.
//
// Aquest projecte va amb pnpm i pnpm-lock.yaml, com la resta de projectes de
// casa. El motiu no és que npm sigui pitjor programari: és que pnpm no executa
// els scripts d'instal·lació de les dependències sense permís explícit, i és
// per aquí per on han entrat els atacs de cadena de subministrament dels últims
// anys. El segon motiu és de correcció: node_modules no és pla, així que un
// import no declarat no compila el primer dia en comptes de petar mesos després.
//
// Barrejar gestors crea un segon lockfile i desfà totes dues coses. La versió
// de pnpm surt de «packageManager» al package.json, en un sol lloc.

const agent = process.env.npm_config_user_agent ?? "";
const manager = agent.split("/", 1)[0];

// Sense agent vol dir que algú ha executat l'script a mà. No hi ha res a barrar.
if (manager && manager !== "pnpm") {
  process.stderr.write(
    [
      "",
      `  Aquest projecte va amb pnpm, no amb ${manager}.`,
      "",
      "    pnpm install --frozen-lockfile   en clonar i a CI",
      "    pnpm install                     per afegir o actualitzar dependències",
      "    pnpm dev                         per treballar",
      "",
      `  Si ${manager} ja ha tocat node_modules, esborra'l i torna a fer`,
      "  «pnpm install --frozen-lockfile». El perquè és al CLAUDE.md de casa.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}
