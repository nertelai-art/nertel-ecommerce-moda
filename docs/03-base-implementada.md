# Base tècnica implementada

Data: 3 de setembre de 2026.

## Abast

Primera estructura executable, amb una pàgina provisional en català, errors públics genèrics, pàgina 404 i enllaç de salt accessible. No implementa encara la fase 1 completa ni els fluxos de compra dels documents originals.

Next.js App Router, TypeScript estricte, Tailwind CSS, ESLint, Prettier i Vitest. Les versions exactes queden a `package.json` i al lockfile. Node 24 és la versió de desenvolupament i de CI.

Les validacions del carret només accepten identificador de variant i quantitat. El límit de 99 unitats i 100 línies és tècnic i provisional; l'estoc i els límits comercials s'han de validar contra dades autoritatives quan s'implementi el checkout. No hi ha cap endpoint que processi aquestes dades encara.

`features` conté domini pur; ESLint impedeix importar React, Next.js, la capa de servidor i els SDK de Supabase/Stripe en aquests mòduls. Els components futurs es col·locaran fora d'aquesta capa. Les integracions tindran fitxers protegits per `server-only`.

## Proper increment

Nota de manteniment: ESLint queda fixat a 9.39.5 perquè el plugin React d'`eslint-config-next@16.3.4` falla amb ESLint 10 (`contextOrFilename.getFilename`). npm marca la branca 9 com a no suportada. És una dependència de desenvolupament; cal actualitzar-la quan el conjunt sigui compatible. No ignorar aquest pendent encara que l'audit no trobi vulnerabilitats.

1. Definir l'esquema de catàleg i variants amb permisos SQL i RLS en migracions locals.
2. Afegir proves de lectura pública de productes publicats i denegació d'esborranys/escriptura anònima.
3. Implementar adaptador Supabase, servei i primer llistat paginat.
4. Afegir Auth SSR i proves de propietat; després permisos de personal amb MFA.
5. Construir inventari i reserves transaccionals abans de connectar Stripe.

La base PWA incorpora manifest per instància, icones genèriques, instal·lació opcional i pantalla offline. Cal adaptar les icones a la marca i validar la instal·lació en dispositius físics abans de publicar; vegeu [PWA](15-pwa-installacio-offline.md).

## Verificació local

- `pnpm check`: lint sense avisos, tipus correctes, 10 proves aprovades i format correcte.
- `pnpm build`: compilació de producció correcta.
- Servidor de producció a localhost: HTTP 200 i contingut esperat; dues peticions amb nonce diferent; els 11 scripts HTML porten nonce; `Cache-Control` inclou `no-store` i `X-Frame-Options` és `DENY`.
- Instal·lació amb audit: cap vulnerabilitat coneguda detectada en aquell moment.
- La CI remota, la revisió visual en navegador, les integracions i les proves comercials encara no s'han executat.

## Referències tècniques

- [Instal·lació de Next.js](https://nextjs.org/docs/app/getting-started/installation).
- [CSP i renderització dinàmica amb nonce](https://nextjs.org/docs/app/guides/content-security-policy).

## Git i CI

El repositori local ja existia; no s'ha substituït. `origin` apunta a `https://github.com/nertelai-art/nertel-ecommerce-moda.git`. El workflow de qualitat executa format, lint, tipus, proves, build i audit. El workflow de secrets utilitza Gitleaks; en repositoris d'organització, l'acció pot requerir `GITLEAKS_LICENSE`. Cal configurar protecció de branca i comprovacions obligatòries.

Increment de pagaments: contracte independent del proveïdor i selector que conserva compte i entorn originals. Verificat amb 12 proves totals, lint, tipus, format i build. La guia pas a pas es troba a `04-pagaments-i-stripe.md`; Stripe encara no està connectat.
