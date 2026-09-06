# Flux de treball Git

## Model del projecte

Multi-instància: **cada botiga té el seu projecte de Supabase i el seu
desplegament, tots des d'aquest repositori**. No hi ha `tenant_id` enlloc i no
n'hi ha d'haver. Vegeu [el runbook de botiga nova](docs/12-botiga-nova.md).

Això vol dir que aquest repositori no és el codi d'una botiga: és la definició
de qualsevol botiga. El que hi quedi específic d'un client el tindran totes.

## Branques

- `main`: versions desplegables. No s'hi treballa ni s'hi puja a mà; hi arriba
  per promoció des de `develop` amb les portes en verd.
- `develop`: única branca d'integració.
- `feature/<nom>`, `fix/<nom>`, `chore/<nom>`: temporals, creades des de
  `develop`.
- `hotfix/<nom>`: creada des de `main` i integrada a `main` i a `develop`.

## Sense pull requests

**El desenvolupament el fa una sola persona, i per això no s'obre un pull
request per cada canvi.** Una PR és una petició de revisió a algú altre; amb un
sol desenvolupador seria una cerimònia buida que no aporta cap parell d'ulls i
que endarreriria cada canvi.

El que sí que es manté, perquè no depèn de tenir revisor:

- **Branca temporal per a cada feina**, per curta que sigui.
- **Integració amb merge commit** (`git merge --no-ff`). Mai squash ni rebase:
  el squash deixa les branques fusionades com a línies òrfenes al graf i es
  perd el punt de retorn.
- **Les portes s'executen igual.** Localment al hook de pre-push, i a CI en
  pujar a `develop`.

Quan hi hagi una segona persona tocant codi, això es revisa.

## Portes

Barates i gratuïtes, al hook local. S'activa un cop per clon:

```sh
git config core.hooksPath .githooks
```

`.githooks/pre-push` comprova, abans que res surti de la màquina: patrons de
credencial als canvis, que no es pugi cap `.env` amb valors, `npm run check`
(lint, tipus, proves unitàries i format) i, si s'ha tocat SQL i la pila local
està aixecada, que no hi hagi deriva d'esquema.

Cares o que necessiten Docker, a CI en pujar a `develop`:

| Workflow          | Quan                                     | Què                                                                       |
| ----------------- | ---------------------------------------- | ------------------------------------------------------------------------- |
| Quality           | push a `develop`                         | `npm run check` i `npm run build`                                         |
| Database          | push a `develop` que toqui `supabase/**` | migracions des de zero, proves SQL, assessors i **comprovació de deriva** |
| Secrets           | push a `develop`                         | gitleaks sobre tot l'historial                                            |
| Release readiness | manual                                   | porta completa abans de promoure a `main`                                 |

`main` no dispara res: promou un arbre que ja s'ha validat a `develop`, i
tornar-lo a provar és pagar dues vegades pel mateix.

## Esquema de base de dades

**Les migracions són l'únic camí per canviar l'esquema.** Res de `psql` ni de
l'editor SQL de Studio per modificar: per llegir, endavant. El workflow
Database ho comprova amb `supabase db diff` contra una base ombra, i falla si
la base viva té res que cap migració expliqui.

Amb N instàncies, una migració que no s'aplica a totes desincronitza la flota.
Regla: **migració primer, desplegament després, i migracions compatibles cap
enrere.** Esborrar o renombrar es fa en dos passos separats per un desplegament.

## Dependabot

Les actualitzacions compatibles s'integren en una branca `chore/*` i han de
passar `npm run check`, `npm run build`, les proves de base de dades i els
assessors. Les pujades majors de la cadena d'eines es mantenen bloquejades fins
que Next.js i els seus plugins declarin compatibilitat.
