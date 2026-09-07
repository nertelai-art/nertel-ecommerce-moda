# E-Commerce PWA Moda

Botiga modular en desenvolupament: Next.js, TypeScript, Tailwind i Supabase local. Compres desactivades i dades de demostració.

Un projecte de Supabase i un desplegament per botiga; per muntar-ne una de nova, vegeu [muntar una botiga nova](docs/12-botiga-nova.md).

## Desenvolupament

Node 24 LTS i Docker Desktop. Amb la pila local activa:

```sh
pnpm install --frozen-lockfile
pnpm db:env
pnpm dev
```

db:env crea l'entorn local o hi afegeix la credencial secreta si falta, sense substituir els valors existents. Genera la clau publicable i la credencial exclusiva del servidor. `.env.local` està exclòs de Git; la credencial secreta mai no ha de tenir prefix `NEXT_PUBLIC_`. La web és a http://localhost:3000. En producció, APP_ORIGIN ha de coincidir exactament amb l'origen de la petició; en desenvolupament, els hosts de loopback localhost, 127.0.0.1 i [::1] són equivalents quan protocol i port coincideixen.

Windows ha bloquejat l'executable de compatibilitat de db:start a la nova carpeta. La pila existent funciona amb ports de loopback; no aturar-la per provar una arrencada nova fins a resoldre aquesta limitació amb un flux admès. No desactivar el Control d'aplicacions. Vegeu [operació local](docs/09-autenticacio.md).

## Verificació

```sh
pnpm check
pnpm build
pnpm db:test
pnpm db:advisors
pnpm release:check
```

Recorregut crític en contenidors efímers i HTTPS local, sense tocar la base
local. Requereix Docker i OpenSSL (inclòs a Git for Windows):

```sh
pnpm exec playwright install chromium webkit
pnpm test:e2e
```

Prova entrada, carret, comanda pendent, recàrrega, cancel·lació i concurrència
sobre l'última unitat. Vegeu [aïllament i diagnòstic](docs/14-proves-recorregut-critic.md).

## Implementat

Catàleg i fitxes amb RLS; registre, confirmació, entrada, recuperació, canvi de contrasenya i logout; cookies HttpOnly i MFA TOTP; alta, edició i arxivat de productes; gestió de múltiples variants, categories, assignacions i fotografies; carret local amb cotització autoritativa i reserves d'estoc atòmiques; administració d'inventari protegida per permisos i MFA; ajustos d'estoc idempotents amb auditoria. Cap administrador permanent creat. Migracions i proves versionades.

PWA: manifest per instància, icones, instal·lació opcional, pantalla offline i actualitzacions sense recàrrega forçada. No desa pàgines privades ni permet comprar sense connexió. Vegeu [PWA i verificació en dispositius](docs/15-pwa-installacio-offline.md).

Pendent: connexió de Stripe, webhook de confirmació, correus, devolucions i desplegament de producció. La comanda pendent i l'intent intern de pagament ja es creen de manera transaccional, però encara no es cobra res.

## Documentació

- [Producte](docs/01-guia-producte-pwa.md) i [arquitectura](docs/02-stack-arquitectura-seguretat.md).
- [Base SQL](docs/06-base-dades-local.md), [catàleg](docs/08-cataleg-public.md) i [autenticació](docs/09-autenticacio.md).
- [Pagaments](docs/04-pagaments-i-stripe.md), [guia completa de Stripe](docs/10-guia-stripe-implementacio.md), [direcció visual](docs/05-direccio-visual.md) i [VPS](docs/07-opcio-vps.md).
- [Runbook de preproducció, desplegament i recuperació](docs/11-preproduccio-i-desplegament.md) i [muntar una botiga nova](docs/12-botiga-nova.md).
- [GitHub](https://github.com/nertelai-art/nertel-ecommerce-moda).
