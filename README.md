# E-Commerce PWA Moda

Botiga modular en desenvolupament: Next.js, TypeScript, Tailwind i Supabase local. Compres desactivades i dades de demostració.

Carpeta de treball: C:\Users\nerte\pwa-ecommerce-moda.

## Desenvolupament

Node 24 LTS i Docker Desktop. Amb la pila local activa:

```sh
npm ci
npm run db:env
npm run dev -- --hostname 127.0.0.1 --port 3100
```

db:env crea l'entorn local o hi afegeix la credencial secreta si falta, sense substituir els valors existents. Genera la clau publicable i la credencial exclusiva del servidor. `.env.local` està exclòs de Git; la credencial secreta mai no ha de tenir prefix `NEXT_PUBLIC_`. La web és a http://127.0.0.1:3100. En producció, APP_ORIGIN ha de coincidir exactament amb l'origen de la petició; en desenvolupament, els hosts de loopback localhost, 127.0.0.1 i [::1] són equivalents quan protocol i port coincideixen.

Windows ha bloquejat l'executable de compatibilitat de db:start a la nova carpeta. La pila existent funciona amb ports de loopback; no aturar-la per provar una arrencada nova fins a resoldre aquesta limitació amb un flux admès. No desactivar el Control d'aplicacions. Vegeu [operació local](docs/09-autenticacio.md).

## Verificació

```sh
npm run check
npm run build
npm run db:test
npm run db:advisors
```

Prova completa d'autenticació amb web i Docker actius (PowerShell):

```powershell
$env:LOCAL_AUTH_E2E = '1'
npm run test:e2e
```

Crea un compte fictici local, prova confirmació, recuperació, MFA i permisos, i elimina només aquest compte. No envia correus externs ni grava captures/traces amb secrets.

## Implementat

Catàleg i fitxes amb RLS; registre, confirmació, entrada, recuperació, canvi de contrasenya i logout; cookies HttpOnly i MFA TOTP; alta, edició i arxivat de productes; gestió de múltiples variants, categories, assignacions i fotografies; carret local amb cotització autoritativa i reserves d'estoc atòmiques; administració d'inventari protegida per permisos i MFA; ajustos d'estoc idempotents amb auditoria. Cap administrador permanent creat. Migracions i proves versionades.

Pendent: connexió de Stripe, webhook de confirmació, correus, devolucions, PWA i desplegament de producció. La comanda pendent i l'intent intern de pagament ja es creen de manera transaccional, però encara no es cobra res.

## Documentació

- [Producte](docs/01-guia-producte-pwa.md) i [arquitectura](docs/02-stack-arquitectura-seguretat.md).
- [Base SQL](docs/06-base-dades-local.md), [catàleg](docs/08-cataleg-public.md) i [autenticació](docs/09-autenticacio.md).
- [Pagaments](docs/04-pagaments-i-stripe.md), [direcció visual](docs/05-direccio-visual.md) i [VPS](docs/07-opcio-vps.md).
- [GitHub](https://github.com/nertelai-art/nertel-ecommerce-moda).
