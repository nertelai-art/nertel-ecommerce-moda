# Base de dades local de la botiga

> Aquest document descriu la base inicial. L'estat actual de permisos, MFA i la limitació d'arrencada a Windows són a [Autenticació](09-autenticacio.md).

## Abast implementat

Supabase CLI 2.116.0, PostgreSQL 17 i serveis locals a Docker. Projecte `nertel-ecommerce-moda`, xarxa `nertel-ecommerce-moda-local` i ports 55320–55324. No s'ha enllaçat cap projecte allotjat ni utilitzat credencials de producció. L'entorn `nertel-platform` preexistent queda separat.

| Esquema   | Taules                                                                            | Accés                                                               |
| --------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `public`  | `products`, `categories`, `product_categories`, `product_variants`                | Lectura pública filtrada per publicació i activació                 |
| `public`  | `profiles`, `addresses`                                                           | Cada client només les seves dades, amb camps modificables explícits |
| `private` | `inventory_locations`, `inventory_levels`, `stock_movements`, `staff_permissions` | Sense accés de navegador ni del rol `service_role`                  |

RLS activada a les 10 taules. No hi ha funcions `security definer`, vistes ni permisos de personal funcionals encara. Les metadades editables de l'usuari no concedeixen privilegis. Els permisos sobre columnes també impedeixen canviar propietaris i dates creades pel servidor.

Imports en unitats menors enteres i compatibles amb enters segurs de JavaScript. SKU únic; claus foranes i índexs per les relacions; inventari no negatiu i reserves limitades a l'estoc físic. Els codis de país i moneda tenen validació de format; el servei haurà d'aplicar les llistes admeses pel negoci. Quantitats fraccionàries i imports d'entrada s'han de rebutjar al servidor abans de qualsevol conversió SQL.

El catàleg local és fictici, sense fotografies comercials, comptes, contrasenyes o estoc disponible. L'inventari disposa d'ajustos de saldo atòmics i idempotents amb registre del motiu i l'actor. L'operació i la seva interfície a `/admin` exigeixen una sessió AAL2 viva i el permís `inventory.manage`, bloquegen la fila de saldo i impedeixen estoc negatiu. Les reserves de compra encara estan pendents.

## Execució habitual

Requisits: Docker Desktop en marxa i Node 24. Des de l'arrel del repositori:

```sh
pnpm install --frozen-lockfile
pnpm db:start
pnpm db:test
pnpm db:advisors
pnpm db:stop
```

`db:stop` conserva les dades i només afecta aquesta botiga. No utilitzar `supabase stop --all` ni `--no-backup` com a operació habitual. Els registres de la CLI poden incloure credencials locals; es desen a `supabase/.temp`, exclòs de Git, i no s'han de compartir.

### Ports locals i compatibilitat amb Windows

En aquesta màquina, Docker Desktop publica els ports a `0.0.0.0` i `::` malgrat que la xarxa porta l'opció oficial `com.docker.network.bridge.host_binding_ipv4=127.0.0.1`. S'ha contrastat amb `docker inspect` i els sockets de Windows. Això pot permetre connexions des d'altres equips segons el tallafoc; no és un entorn de producció ni s'ha d'exposar públicament.

La incidència es resol indicant `127.0.0.1` explícitament a cada publicació de port. En Windows, `scripts/db-local.mjs` compila `scripts/windows/DockerLoopbackShim.cs` amb el compilador .NET de Windows i el posa al PATH només del procés Supabase d'aquesta botiga. No canvia el PATH global, Docker Desktop, el tallafoc ni els altres projectes.

L'adaptador reenvia arguments a Docker sense shell i conserva els fluxos binaris. Només modifica `create`/`run` per als contenidors `supabase_*_nertel-ecommerce-moda`, restringint els ports previstos 55320–55324 a loopback. El binari generat queda a `.temp`, exclòs de Git, i es comprova abans d'utilitzar-lo. És una compatibilitat pròpia del projecte, no una opció oficial de Supabase; revisar-la quan canviïn Docker o la CLI i retirar-la quan l'opció de xarxa funcioni.

`db:start` i `db:reset` comproven els ports reals; davant una exposició inesperada, aturen només aquesta pila i conserven els volums. En Linux s'utilitza la configuració de xarxa oficial i la mateixa verificació final. En aquesta màquina utilitzar els scripts npm per arrencar i reconstruir. Les operacions que creïn una base ombra també requeriran aquest tractament abans d'incorporar-les al flux habitual.

## Migracions

- `20260903123743_foundation.sql`: esquema inicial, relacions, restriccions, índexs, RLS i grants.
- `20260903124118_harden_default_privileges.sql`: futures funcions sense EXECUTE públic i esquema privat tancat.
- `seed.sql`: només desenvolupament local; mai incloure'l al desplegament de producció.
- `tests/database/001_foundation.test.sql`: proves pgTAP transaccionals que acaben amb rollback.
- `src/types/database.generated.ts`: tipus generats de l'esquema públic, sense dades.

La primera migració s'ha generat des de la BD amb `db pull --local` i s'ha revisat. El reset local ha reconstruït totes dues migracions i el seed des de zero.

Per reconstruir **només la BD local de proves**, perdent-ne les dades afegides manualment:

```sh
pnpm db:reset -- --confirm-local-reset
pnpm db:test
```

Per als següents canvis: consultar l'ajuda de la CLI, iterar en local, passar advisors, generar/revisar migracions i reconstruir la cadena. No editar una migració ja desplegada en un entorn compartit.

## Resultats i límits

- Reconstrucció local completa correcta.
- 44 proves SQL aprovades, incloent accés entre clients, manipulació de propietaris, preus i rols, publicació de catàleg i permisos de futurs objectes.
- Advisors de seguretat i rendiment sense incidències al nivell warn/error.
- API REST comprovada: només el producte publicat és visible; lectura anònima de perfils rebutjada amb HTTP 401. Studio ha tornat a respondre HTTP 200 amb la pila protegida en marxa.
- Ports 55321–55324 verificats a `127.0.0.1` amb Docker i els sockets de Windows. Arrencada amb l'adaptador comprovada; la nova ordre `db:reset` encara no s'ha executat amb l'adaptador perquè la revisió automàtica ha requerit autorització explícita per esborrar les dades locals.
- Workflow de base de dades preparat per a CI; encara no executat a GitHub.
- Sense proves de concurrència de checkout: encara no existeixen reserves transaccionals ni comandes.
- Auth local amb verificació de correu, rotació de refresh tokens i TOTP configurat. Encara no hi ha interfície de login ni imposició de MFA per operacions de personal.
- Storage arrencat però sense buckets o polítiques de càrrega; no hi ha escriptures d'usuari autoritzades.
- El desplegament allotjat i les seves opcions d'Auth, Storage, secrets i entorns estan pendents.

## Següent increment

Connectar el catàleg a l'aplicació, implementar autenticació SSR i permisos de personal amb MFA. Després, funcions d'inventari transaccionals amb auditoria i proves de concurrència. Comandes, pagaments, outbox i devolucions tindran migracions pròpies; no es dona per implementada tota l'arquitectura comercial.

Referències: [Supabase local](https://supabase.com/docs/guides/local-development), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [CLI](https://supabase.com/docs/reference/cli).
