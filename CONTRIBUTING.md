# Flux de treball Git

## Branques permanents

- `main`: versions estables i desplegables. No s'hi treballa directament.
- `develop`: integració de la pròxima versió.

## Branques temporals

- `feature/<nom>`: funcionalitats noves, creades des de `develop`.
- `fix/<nom>`: correccions funcionals, creades des de `develop`.
- `chore/<nom>`: manteniment, dependències i infraestructura.
- `hotfix/<nom>`: incidències urgents de producció, creades des de `main` i integrades a `main` i `develop`.

Cada branca ha de tenir un objectiu concret, proves proporcionals al risc i un pull request cap a `develop`. Una versió es promou de `develop` a `main` mitjançant un pull request separat. Les branques temporals es poden eliminar després de la fusió perquè els commits i el pull request en conserven la traçabilitat.

## Dependabot

Les actualitzacions compatibles s'integren primer en una branca `chore/*` i han de passar `npm run check`, `npm run build`, les proves de base de dades i els assessors de Supabase. Les pujades majors de la cadena d'eines es mantenen bloquejades fins que Next.js i els seus plugins declarin compatibilitat.
