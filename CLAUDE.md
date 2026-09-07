@AGENTS.md

# Nertel Moda

Botiga de moda en línia. Next.js App Router, TypeScript estricte, Tailwind i
Supabase. En desenvolupament: el catàleg, l'administració i el carret
funcionen; **no es cobra res encara**.

## El model mana sobre tota la resta

**Multi-instància, no multi-inquilí.** Cada botiga té el seu projecte de
Supabase i el seu desplegament, tots des d'aquest repositori. Decisió avaluada
i presa; no es reobre sense dades noves.

La conseqüència pràctica, i és la regla que més fàcil és incomplir sense
adonar-se'n: **aquest repositori no és el codi d'una botiga, és la definició de
qualsevol botiga.** Abans d'escriure res, pregunta't si serviria per a la
botiga número 2. Si la resposta és no, va a configuració, no a codi.

- **No afegeixis `tenant_id` enlloc.** No és un descuit, és el model.
- **Res específic d'un client al codi ni a l'esquema.** Ni noms de fitxer, ni
  textos de campanya, ni monedes, ni dominis.
- On va cada cosa:
  - Credencials, `APP_ORIGIN`, `DEPLOYMENT_ENV`, `PAYMENTS_MODE` → variables
    d'entorn del desplegament.
  - Moneda i país → `private.instance_settings`, escriptura única en crear la
    botiga. **No editable des del panell**: canviar-la amb comandes existents
    corromp el llibre.
  - Nom comercial, textos legals, contingut de portada → taules que la botiga
    edita des del panell.
  - Logotip, imatges, tipografies → actius del repositori, per desplegament.
- **Les taules singleton són correctes.** `storefront_content`,
  `storefront_drafts`, `security_settings` i `instance_settings` amb clau
  primària booleana i `CHECK (singleton)` són una garantia en aquest model, no
  una limitació. No les toquis.

## Git

**No s'obren pull requests.** El desenvolupador és una sola persona i una PR
sense revisor és cerimònia buida. Es manté la branca temporal i el merge commit
cap a `develop`; les portes s'executen igual, al hook de pre-push i a CI en
pujar. El detall és a [CONTRIBUTING.md](CONTRIBUTING.md).

Això es desvia de la regla de casa que demana PR per branca, i el motiu és
aquest. Quan hi hagi una segona persona tocant codi, es revisa.

## Base de dades

**Les migracions són l'únic camí per canviar l'esquema.** Res de `psql` ni de
l'editor SQL de Studio per modificar. CI ho comprova amb `supabase db diff`
contra una base ombra i falla si la base viva té res que cap migració expliqui.

- `supabase/seed.sql` és **només per a desenvolupament**: carrega catàleg
  fictici i desactiva l'MFA del personal. No s'aplica mai a una botiga real.
- Una instància real necessita dades d'arrencada que el seed no li dona: com a
  mínim una ubicació d'inventari. Vegeu el runbook.
- L'MFA del personal és obligatòria per defecte a totes les instàncies noves.
  Qui la desactiva és el seed, i només en local.

## Diners

Cada botiga té **el seu propi compte de Stripe**, amb les seves claus al seu
desplegament i el seu punt d'entrada de webhook amb secret propi. Els diners no
passen per Nertel en cap moment i no es proposa cap disseny on ho facin.

No es desa mai cap dada de targeta: ni número, ni últims quatre dígits, ni
caducitat, ni token de navegador. El pagament és allotjat pel proveïdor.

## Gestor de paquets

**pnpm**, com la resta de projectes de casa. El deute d'npm que hi havia aquí
està saldat: `pnpm-lock.yaml` versionat, `package-lock.json` fora, la versió de
pnpm fixada a `packageManager` del `package.json` i `pnpm install --frozen-lockfile`
a tots els workflows. El `preinstall` para qualsevol altre gestor.

**Els scripts d'instal·lació de les dependències es decideixen un per un** a
`pnpm-workspace.yaml`, amb el motiu escrit al costat. Ara mateix n'hi ha un de
sol i està **rebutjat**: el `postinstall` d'`unrs-resolver` crida
`napi-postinstall`, que en el camí de reserva executa `npm install`, `pnpm i` o
`yarn add` i baixa tarballs durant la instal·lació. No cal aprovar-lo: el binari
natiu arriba com a dependència opcional normal i eslint passa igualment.
Comprovat, no suposat. **Abans d'aprovar-ne cap altre, mira què fa.**

## Verificació

Si el canvi es veu al navegador, mira-t'ho al navegador amb el mecanisme de
previsualització (`.claude/launch.json`), no des del terminal. Llegeix la
consola i la xarxa abans de dir que funciona.

**El servidor de desenvolupament va fix al port 3300**, i `APP_ORIGIN` hi
coincideix. No és una manía: `APP_ORIGIN` ha de ser exacte per als POST, i amb
un port que canvia segons què hi hagi ocupat, les pàgines es veuen bé mentre
tota escriptura dona 403. Si el 3300 t'apareix ocupat, canvia'l als dos llocs
alhora — `package.json` i `APP_ORIGIN` — mai només a un.

## Documentació

En català. Codi, identificadors, branques i commits en anglès.
