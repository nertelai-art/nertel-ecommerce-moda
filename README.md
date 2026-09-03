# E-Commerce PWA Moda

Base inicial d'una botiga modular amb Next.js App Router, TypeScript estricte i Tailwind CSS. Encara no és una botiga operativa.

## Desenvolupament

Utilitzeu **Node.js 24 LTS** i npm. El Node 20 global detectat durant la preparació no compleix el rang fixat pel projecte.

```sh
npm ci
npm run dev
```

Obriu http://localhost:3000. No calen credencials per executar aquesta base.

```sh
npm run check
npm run build
npm audit --audit-level=high
```

`npm run format` aplica el format. Les dependències directes tenen versions exactes i `package-lock.json` fixa l'arbre complet.

## Estructura

```text
src/app/                 Rutes, layouts i coordinació de la interfície
src/features/            Models i validacions de domini sense React
src/lib/                 Primitives compartides petites (imports monetaris)
src/server/              Contracte de la futura capa exclusiva del servidor
src/proxy.ts             CSP amb nonce i política de caché
tests/unit/              Proves d'entrada no fiable i imports
docs/                    Requisits, arquitectura i estat de la implementació
.github/workflows/       Controls automàtics per al futur repositori
```

Les carpetes de serveis, repositoris, integracions, components compartits i migracions s'afegiran amb la primera implementació concreta. Evitem directoris buits i abstraccions sense ús.

## Estat i següents passos

Llegiu [l'estat de la base](docs/03-base-implementada.md), [la guia de producte](docs/01-guia-producte-pwa.md) i [l'arquitectura acordada](docs/02-stack-arquitectura-seguretat.md).

Pendent: catàleg persistent i RLS, autenticació, permisos i MFA, inventari, carret persistent, checkout, comandes, devolucions i PWA. La pantalla actual és provisional i no fixa la marca.

Repositori: [nertelai-art/nertel-ecommerce-moda](https://github.com/nertelai-art/nertel-ecommerce-moda).

Pagaments: contracte independent del proveïdor i selector d'operacions històriques a `src/features/payments`. Llegiu [la guia de Stripe i pagaments](docs/04-pagaments-i-stripe.md) per començar amb un sandbox. Encara no hi ha cap proveïdor connectat ni desplegament.
