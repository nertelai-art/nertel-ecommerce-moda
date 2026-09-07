# Guia Stripe: funcionament, implementació i operació

> Estat de la guia: preparada el 4 de setembre de 2026. No hi ha cap integració ni credencial Stripe activa al projecte. Abans d'implementar, un agent ha de tornar a comprovar la documentació oficial i la versió estable de l'SDK.

## 1. Objectiu i abast

Aquesta guia explica Stripe i defineix el pla d'implementació per a aquesta botiga. No pretén reproduir tot el catàleg de productes de Stripe: recull la documentació necessària per vendre productes físics amb pagament únic, en EUR, mitjançant Stripe Checkout allotjat.

La primera versió queda deliberadament limitada a:

- `mode: payment`, sense subscripcions;
- Checkout allotjat per Stripe, no un formulari de targeta propi;
- targetes amb confirmació immediata;
- imports i línies calculats exclusivament pel nostre servidor;
- comanda, estoc i adreça autoritatius a Supabase;
- confirmació mitjançant webhook verificat;
- entorn Stripe Sandbox abans de qualsevol dada real.

Queden fora de la primera integració: Connect, Billing, subscripcions, Payment Links, pagaments fraccionats, captura manual, monedes múltiples, impostos automàtics, mètodes de pagament diferits i desar targetes.

## 2. Què és cada peça

| Concepte                  | Funció                                                              | Font autoritativa                |
| ------------------------- | ------------------------------------------------------------------- | -------------------------------- |
| Checkout Session          | Sessió temporal que presenta el formulari de pagament allotjat      | Stripe                           |
| PaymentIntent             | Intent de cobrament gestionat per Checkout                          | Stripe                           |
| Comanda                   | Instantània dels articles, imports, client i lliurament             | Supabase                         |
| Intent intern             | Enllaç idempotent entre la comanda i Stripe                         | Supabase                         |
| Reserva                   | Unitats retingudes temporalment per evitar sobreventa               | Supabase                         |
| Webhook/Event Destination | Notificació servidor-a-servidor de canvis a Stripe                  | Stripe, reconciliat localment    |
| Event ID                  | Identificador únic d'una notificació Stripe                         | Stripe                           |
| Idempotency key           | Clau estable que permet repetir una crida sense duplicar l'operació | La genera i persisteix la botiga |

Stripe Checkout recull les dades de pagament i gestiona autenticacions com 3D Secure. La nostra aplicació no ha de rebre, registrar ni desar números complets de targeta o CVC. Checkout Sessions és l'opció recomanada per Stripe per a la majoria d'integracions perquè redueix codi i gestiona el cicle de Checkout ([Checkout Sessions API](https://docs.stripe.com/payments/checkout-sessions), [Checkout allotjat](https://docs.stripe.com/payments/checkout)).

## 3. Estat actual del projecte

Ja existeix:

- cotització autoritativa del carret;
- reserva atòmica d'estoc i recuperació de reserves caducades;
- comanda pendent amb línies i preus immutables;
- `private.payment_attempts` amb clau d'idempotència, import i moneda congelats;
- contracte `PaymentProvider` independent del proveïdor;
- rutes de preparació i recuperació del checkout;
- límits distribuïts i límits reals de mida del cos HTTP;
- proves unitàries, SQL i E2E de reserva, concurrència i cancel·lació.

Encara no existeix:

- paquet `stripe` ni client Stripe de servidor;
- configuració de compte o Sandbox;
- adaptador `StripePaymentProvider`;
- creació d'una Checkout Session;
- persistència de l'estat extern i dels events;
- endpoint webhook;
- transacció SQL de confirmació de pagament;
- pàgina de retorn/reconciliació;
- reemborsaments, disputes, alertes o conciliació periòdica.

### Bloqueig de disseny que s'ha de resoldre primer

La reserva actual caduca als 15 minuts. Stripe Checkout permet configurar `expires_at` entre 30 minuts i 24 hores, i per defecte caduca al cap de 24 hores ([cicle de Checkout](https://docs.stripe.com/payments/checkout/how-checkout-works)). Abans de crear sessions Stripe cal ampliar la reserva a 30 minuts i usar el mateix instant de caducitat per a reserva, comanda i Checkout. No s'ha de publicar una integració amb TTL divergents.

## 4. Decisió d'arquitectura

Flux previst:

1. El navegador envia només variants, quantitats i dades de lliurament.
2. El servidor valida origen, sessió, identitat, límits i payload.
3. Supabase reserva estoc i crea una comanda pendent i un intent intern.
4. El servidor llegeix la comanda congelada; mai confia en preus del navegador.
5. L'adaptador crea una Checkout Session amb una clau d'idempotència estable.
6. Es desa `provider = stripe`, compte lògic, entorn i identificador de la sessió.
7. El navegador rep només la URL allotjada i hi navega.
8. Stripe cobra i envia events al webhook.
9. El webhook verifica la signatura sobre els bytes originals, desa l'event i confirma la comanda de forma idempotent.
10. La pàgina de retorn consulta el servidor i mostra l'estat local; no declara una venda pagada pel simple fet d'haver tornat de Stripe.

Supabase és autoritatiu per a comandes i inventari. Stripe és autoritatiu per saber si el cobrament extern ha tingut èxit. Els dos estats es reconcilien; cap redirecció del navegador substitueix el webhook. Stripe exigeix webhooks per a un compliment fiable i pot reintentar entregues fallides ([fulfillment](https://docs.stripe.com/checkout/fulfillment)).

## 5. Configuració que haurà de fer una persona

No cal fer aquests passos ara. Quan arribi el moment:

1. Crear o obrir el compte a [Stripe Dashboard](https://dashboard.stripe.com/register).
2. Activar MFA per als usuaris del Dashboard.
3. Crear un Sandbox separat, per exemple `Moda desenvolupament`. Stripe recomana Sandboxes perquè aïllen dades, configuració i accessos ([entorns de proves](https://docs.stripe.com/testing-use-cases)).
4. Invitar només les persones necessàries i aplicar privilegis mínims.
5. Definir nom comercial, descriptor, correu de suport, política de devolució i dades fiscals.
6. No activar Live mode ni introduir dades bancàries només per desenvolupar.
7. Quan existeixi l'endpoint, crear una destinació de webhook exclusiva per entorn.
8. Copiar els secrets directament al gestor d'entorn local o de desplegament. No enviar-los per xat ni guardar-los en Git.

No s'han d'enganxar claus reals en incidències, captures, logs, Markdown o prompts d'agents.

## 6. Variables d'entorn

Noms previstos:

| Variable                | Exposició      | Exemple conceptual                               |
| ----------------------- | -------------- | ------------------------------------------------ |
| `PAYMENT_PROVIDER`      | servidor       | `stripe`                                         |
| `PAYMENT_ENVIRONMENT`   | servidor       | `test` o `live`                                  |
| `PAYMENT_ACCOUNT_KEY`   | servidor       | identificador lògic intern, no secret            |
| `STRIPE_SECRET_KEY`     | només servidor | comença habitualment per `sk_test_` o `sk_live_` |
| `STRIPE_WEBHOOK_SECRET` | només servidor | comença per `whsec_`; és propi de cada endpoint  |
| `APP_ORIGIN`            | servidor       | origen exacte usat en URLs de retorn             |

Amb Checkout allotjat no cal una clau publicable ni els paquets del navegador. Si en el futur s'usa Elements o Embedded Checkout, llavors sí que caldrà una clau publicable i una revisió específica.

Les claus secretes permeten operar sobre el compte. Han d'estar en variables xifrades, mai amb prefix `NEXT_PUBLIC_`, i s'han de rotar si poden haver estat exposades. Stripe també ofereix claus restringides, rols i historial de seguretat ([claus API](https://docs.stripe.com/keys), [seguretat](https://docs.stripe.com/security)).

### Matriu d'entorns

| Aplicació  | Base de dades      | Stripe     | Claus                    | Webhook                       |
| ---------- | ------------------ | ---------- | ------------------------ | ----------------------------- |
| Local      | Supabase local     | Sandbox    | només `.env.local`       | secret temporal de Stripe CLI |
| Preview/QA | Supabase QA        | Sandbox QA | secrets del desplegament | endpoint QA propi             |
| Producció  | Supabase producció | Live       | secrets de producció     | endpoint Live propi           |

No s'ha de permetre que una base de dades de proves utilitzi claus Live. L'adaptador ha de validar que entorn, prefix de clau i configuració coincideixen i fallar de manera tancada.

## 7. Pla d'implementació per fases

Cada fase es fa en una branca `feature/stripe-...` creada des de `develop`, amb migració i proves quan correspongui.

### Fase 0 — Revalidació documental

- Consultar la [documentació Stripe](https://docs.stripe.com), el [changelog de l'API](https://docs.stripe.com/changelog) i les notes de l'SDK Node.
- Confirmar la versió API actual. A data d'aquesta guia és `2026-02-25.clover`, però no s'ha de copiar cegament quan s'implementi ([versionat](https://docs.stripe.com/api/versioning)).
- Fixar versions exactes de dependències i actualitzar el lockfile.
- Tornar a llegir la documentació Next.js inclosa a `node_modules/next/dist/docs/`.

### Fase 1 — Alinear TTL i model de dades

- Canviar la reserva de 15 a 30 minuts, o a un valor superior justificat.
- Fer que reserva, comanda i Checkout Session comparteixin `expires_at`.
- Ampliar `payment_attempts` amb identitat de compte, entorn, tipus de referència, últim error sanititzat i timestamps d'estat.
- No reutilitzar una referència externa entre intents.
- Crear una taula privada d'events Stripe amb almenys `event_id` únic, entorn, compte, tipus, data Stripe, hash/payload mínim necessari, estat de processament, intents i error sanititzat.
- Crear transicions SQL explícites i bloqueig de files per confirmar, fallar, expirar i reemborsar.
- Mantenir RLS a totes les taules i revocar l'execució pública de funcions privilegiades.

### Fase 2 — Client i adaptador Stripe de servidor

- Instal·lar només `stripe` amb versió exacta. No instal·lar SDKs de navegador per al Checkout allotjat.
- Crear el client sota `src/server/integrations/stripe/` amb `server-only`.
- Validar variables amb un esquema estricte; no usar assercions `!` sobre secrets sense validació.
- Fixar explícitament la versió API que suporten el codi i els tipus.
- Implementar el contracte `PaymentProvider` sense filtrar objectes Stripe cap al domini o la UI.
- Mapar errors a categories internes: configuració, validació, temporal, desconegut i definitiu.
- No registrar headers, payloads complets, correu, adreça ni claus.

### Fase 3 — Crear Checkout de manera idempotent

L'endpoint de servidor ha de:

1. Validar origen, rate limit, cookie opaca i propietat de la comanda.
2. Bloquejar o reclamar l'intent `requires_provider` de forma atòmica.
3. Llegir línies, import, moneda i expiració congelats de la base de dades.
4. Construir `line_items` amb `price_data` des del servidor; no acceptar `priceId`, preu o URL del client.
5. Configurar `mode: payment`, `success_url`, `cancel_url` i `expires_at` al servidor.
6. Afegir només identificadors opacs a `client_reference_id`/`metadata`, per exemple `order_id` i `payment_attempt_id`. No posar-hi adreces ni dades sensibles.
7. Enviar l'UUID immutable de l'intent com a idempotency key a la crida `POST`.
8. Desar la referència retornada amb una actualització condicionada.
9. Retornar al navegador únicament una URL Stripe validada.

Stripe conserva el resultat inicial d'una petició idempotent i compara els paràmetres en reintents. Les claus de l'API v1 es poden eliminar després d'almenys 24 hores; per això la base local ha de conservar igualment la referència i l'estat ([peticions idempotents](https://docs.stripe.com/api/idempotent_requests)).

Si la crida acaba amb timeout o connexió interrompuda, el resultat és desconegut. S'ha de repetir amb la mateixa clau o recuperar/reconciliar l'intent; mai crear-ne un altre ni alliberar estoc cegament.

### Fase 4 — Webhook verificat i persistent

Crear `POST /api/webhooks/stripe` amb runtime Node.js. Algoritme obligatori:

1. Aplicar un límit de mida abans de processar el cos.
2. Llegir els bytes originals una sola vegada; no fer `request.json()` abans de verificar.
3. Exigir el header `Stripe-Signature`.
4. Verificar payload, signatura i `STRIPE_WEBHOOK_SECRET` amb l'SDK oficial.
5. Rebutjar signatura invàlida amb `400`.
6. Inserir `event.id` amb restricció única. Un duplicat ja processat respon `2xx` sense repetir efectes.
7. Validar que event, sessió, compte, entorn, intent, import i moneda coincideixen amb l'estat local.
8. Recuperar l'objecte actual de Stripe quan l'event no contingui prou informació o arribi fora d'ordre.
9. Aplicar la transició local dins una transacció curta i idempotent.
10. Respondre `2xx` ràpidament després de persistir/processar. Correu, logística i altres efectes van a una outbox.

Stripe no garanteix l'ordre dels events i reintenta entregues. Un reenviament manual no anul·la necessàriament els reintents automàtics ([webhooks](https://docs.stripe.com/webhooks?lang=node)).

Events inicials:

| Event                        | Acció local                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `checkout.session.completed` | Recuperar/validar sessió; marcar pagat només si `payment_status` i el PaymentIntent confirmen èxit |
| `checkout.session.expired`   | Expirar intent i alliberar reserva només si encara no hi ha pagament                               |

Quan s'habilitin mètodes diferits també caldran `checkout.session.async_payment_succeeded` i `checkout.session.async_payment_failed`. Fins que aquest flux existeixi, no habilitar mètodes diferits. Stripe indica que un pagament `processing` no garanteix els fons ([mètodes de pagament](https://docs.stripe.com/payments/payment-methods)).

### Fase 5 — Confirmació i pàgina de retorn

- Crear una pàgina de retorn que rebi `{CHECKOUT_SESSION_ID}` però no confiï en aquest valor per autoritzar accés.
- Recuperar la sessió al servidor, relacionar-la amb la cookie/usuari i executar la mateixa funció idempotent de reconciliació que el webhook.
- Mostrar `confirmant`, `pagat`, `fallit` o `caducat` segons l'estat local.
- No exposar adreça, correu ni detalls de la comanda sense una prova de propietat.
- El webhook continua sent obligatori encara que la pàgina de retorn acceleri la confirmació ([pàgina de retorn](https://docs.stripe.com/payments/checkout/custom-success-page)).

### Fase 6 — Caducitat i reconciliació

- En caducar una reserva, intentar expirar la Checkout Session externa abans d'alliberar estoc.
- Si Stripe no respon, marcar l'operació com a resultat desconegut i reconciliar-la; no assumir que està cancel·lada.
- Crear un procés periòdic que revisi intents `processing` o desconeguts, events fallits, sessions caducades i imports divergents.
- Un pagament tardà sobre una comanda caducada no pot reobrir automàticament l'estoc. Ha d'anar a revisió i, segons política, reemborsament.
- Alertar si el webhook acumula retard, errors o signatures invàlides anòmales.

### Fase 7 — Reemborsaments i disputes

No afegir un botó de reemborsament fins a tenir:

- permís intern `refunds.create` i MFA recent;
- límit entre zero i import reemborsable;
- registre persistent de la petició abans de la crida externa;
- clau d'idempotència pròpia del reemborsament;
- suport per estat pendent, completat i fallit;
- events `refund.created`, `refund.updated` i `refund.failed`;
- auditoria sense dades de targeta.

Stripe recomana escoltar com a mínim `refund.created` i verificar sempre les signatures ([reemborsaments](https://docs.stripe.com/refunds)). Les disputes poden retirar immediatament import i comissió, i tenen terminis de resposta; s'han de tractar com un flux operatiu separat amb alertes ([disputes](https://docs.stripe.com/disputes/how-disputes-work)).

### Fase 8 — Pas a producció

Només després que Sandbox i QA siguin verds:

- completar verificació legal i bancària del negoci;
- definir impostos, enviaments, devolucions, privacitat i termes;
- crear claus i webhook Live nous, mai reutilitzar els de Sandbox;
- verificar HTTPS i `APP_ORIGIN` exacte;
- configurar alertes de pagaments, disputes, webhooks i saldo;
- fer una compra real de valor mínim i un reemborsament controlat;
- documentar rollback: desactivar checkout nou sense perdre recepció de webhooks;
- restringir accés al Dashboard i revisar l'historial de seguretat.

## 8. Model d'estats recomanat

No s'ha d'usar un únic estat per representar pagament, comanda, inventari i logística.

### Intent de pagament

`requires_provider -> processing -> succeeded`

Sortides alternatives: `failed`, `cancelled`, `expired`, `unknown`, `refund_pending`, `refunded`.

### Comanda

`pending_payment -> paid -> preparing -> shipped -> delivered`

Sortides alternatives: `cancelled`, `expired`, `refund_pending`, `refunded`, `payment_review`.

Regles:

- només una funció SQL privilegiada pot marcar `paid`;
- `succeeded` és terminal per al cobrament original;
- un event vell no pot fer retrocedir un estat més nou;
- la logística no deriva directament d'un event sense una comanda pagada local;
- els reemborsaments no esborren el pagament original: creen el seu propi historial.

## 9. Pla de proves obligatori

### Unitats

- mapatge Stripe ↔ contracte intern;
- validació estricta de configuració;
- imports zero, negatius, massa grans i monedes divergents;
- errors temporals, definitius i desconeguts;
- resolució correcta per compte i entorn.

### Base de dades

- transicions permeses i rebutjades;
- dos events iguals només produeixen un efecte;
- dos events diferents del mateix pagament tampoc dupliquen la venda;
- import o moneda divergents van a revisió;
- confirmació concurrent i expiració no sobrevenen;
- reemborsament no supera l'import pagat.

### Integració/E2E en Sandbox

- targeta correcta;
- targeta rebutjada;
- autenticació 3D Secure correcta i fallida;
- client tanca la pestanya després de pagar;
- webhook abans i després de la redirecció;
- webhook duplicat i events fora d'ordre;
- timeout en crear la sessió i reintent amb la mateixa clau;
- reserva caducada durant Checkout;
- signatura incorrecta;
- reemborsament complet i parcial quan aquesta fase existeixi.

Usar només valors oficials de prova. Stripe prohibeix provar Live mode amb dades reals i proporciona targetes per simular èxit, rebuig i 3D Secure ([proves](https://docs.stripe.com/testing)). No fer proves de càrrega contra el Sandbox.

### Prova local del webhook

Quan l'endpoint existeixi:

```powershell
stripe login
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

El secret `whsec_...` que mostra la CLI és temporal i diferent del secret del webhook desplegat. S'ha de guardar només a `.env.local`. Una prova completa ha de passar pel Checkout real del Sandbox; `stripe trigger` per si sol no demostra que les nostres metadades, comanda i imports coincideixin.

## 10. Checklist per a agents

Abans de tocar codi:

- [ ] Treballar des de l'últim `develop` en una branca `feature/stripe-*`.
- [ ] Llegir `AGENTS.md`, aquesta guia i `docs/02-stack-arquitectura-seguretat.md`.
- [ ] Consultar documentació i changelog oficials actuals.
- [ ] No demanar a l'usuari que enganxi secrets al xat.
- [ ] No modificar `main`, Live mode ni recursos externs sense autorització explícita.
- [ ] Resoldre primer la incompatibilitat de TTL.

Durant la implementació:

- [ ] SDK i claus exclusivament al servidor.
- [ ] Imports, moneda, línies, URLs i metadata derivats del servidor.
- [ ] Clau d'idempotència persistent en totes les operacions `POST` externes.
- [ ] Webhook verificat sobre bytes originals i event persistent abans dels efectes.
- [ ] Comparar compte, entorn, referència, import i moneda.
- [ ] Tractar timeouts com a desconeguts.
- [ ] No registrar secrets ni dades personals completes.
- [ ] Crear migracions amb `supabase migration new` i revisar RLS/grants.

Abans de donar una fase per acabada:

- [ ] `pnpm check`
- [ ] `pnpm build`
- [ ] `pnpm db:test`
- [ ] `pnpm db:advisors`
- [ ] E2E de Checkout i concurrència en Sandbox
- [ ] cap credencial ni payload sensible al diff, logs o artefactes
- [ ] documentació i variables d'exemple actualitzades
- [ ] CI verda a la branca remota

## 11. Resposta a incidències

| Símptoma                        | Acció segura                                                                              |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| Timeout creant Checkout         | Reintentar amb la mateixa idempotency key o reconciliar; no crear un intent nou           |
| Webhook duplicat                | Retornar `2xx` si ja està processat; no repetir efectes                                   |
| Events fora d'ordre             | Recuperar l'objecte actual de Stripe i aplicar una transició monotònica                   |
| Import/moneda no coincideixen   | No confirmar; marcar `payment_review` i alertar                                           |
| Pagament després de caducar     | No reobrir reserva; revisar disponibilitat i reemborsar si cal                            |
| Secret possiblement exposat     | Revocar/rotar, actualitzar entorns i investigar logs; no limitar-se a esborrar el commit  |
| Webhook caigut                  | Restaurar endpoint, revisar entregues pendents i reconciliar abans de preparar enviaments |
| Stripe disponible però DB falla | Recuperar per referència/idempotència i reconciliar; no cobrar una segona vegada          |

## 12. Índex de documentació oficial

- [Documentació Stripe](https://docs.stripe.com)
- [Checkout](https://docs.stripe.com/payments/checkout)
- [Checkout Sessions API](https://docs.stripe.com/payments/checkout-sessions)
- [Com funciona Checkout](https://docs.stripe.com/payments/checkout/how-checkout-works)
- [Fulfillment de comandes](https://docs.stripe.com/checkout/fulfillment)
- [Webhooks](https://docs.stripe.com/webhooks?lang=node)
- [Idempotència](https://docs.stripe.com/api/idempotent_requests)
- [Versionat de l'API](https://docs.stripe.com/api/versioning)
- [Claus API](https://docs.stripe.com/keys)
- [Seguretat](https://docs.stripe.com/security)
- [Sandboxes i estratègia de proves](https://docs.stripe.com/testing-use-cases)
- [Targetes i valors de prova](https://docs.stripe.com/testing)
- [Mètodes de pagament](https://docs.stripe.com/payments/payment-methods)
- [Opcions d'integració](https://docs.stripe.com/payments/payment-methods/integration-options)
- [Pàgina de retorn](https://docs.stripe.com/payments/checkout/custom-success-page)
- [Reemborsaments](https://docs.stripe.com/refunds)
- [Disputes](https://docs.stripe.com/disputes/how-disputes-work)
- [Tipus d'events](https://docs.stripe.com/api/events/types)
- [Changelog](https://docs.stripe.com/changelog)

## 13. Criteri per reprendre el projecte

Quan tinguis temps, no cal que coneguis Stripe per avançar. Només cal que puguis entrar al Dashboard i confirmar que tens accés a un Sandbox. L'agent ha de començar per la Fase 0, explicar qualsevol decisió que requereixi negoci —mètodes de pagament, devolucions, impostos o termini de reserva— i no activar Live mode sense una aprovació explícita.
