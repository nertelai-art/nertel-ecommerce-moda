# Pagaments independents del proveïdor i primers passos amb Stripe

## Estat real

Hi ha un contracte TypeScript de pagaments i un selector de proveïdor amb proves. Les reserves, les comandes persistents i l'intent intern idempotent ja estan implementats. Encara no hi ha SDK Stripe, compte connectat, sessió de Stripe Checkout ni webhook; per tant, no es poden fer cobraments.

## Com funciona

La botiga envia les regles de compra al nostre servei; aquest calcula el total, reserva estoc i crida `PaymentProvider`. Un adaptador Stripe traduirà aquest contracte a Stripe Checkout allotjat. Afegir un altre proveïdor requerirà un adaptador i proves de compatibilitat; no modificar el catàleg ni els components de compra.

Cada intent desarà proveïdor, compte lògic, entorn, referència externa i identificador intern. Canviar el proveïdor per defecte només afecta compres noves. Consultes, reconciliació i reemborsaments antics utilitzen l'original. No es migren automàticament cobraments, comptes o mètodes desats. El selector rebutja configuracions absents o ambigües i mai passa de proves a producció per defecte.

El compte lògic no és una clau secreta. El contracte és intern: els tipus no validen peticions HTTP. Abans de cridar-lo, el servei validarà permisos, imports, moneda admesa, suma de línies, límits, estoc i idempotència. Les URLs de retorn es configuraran al servidor. Enviament, impostos i descomptes han de quedar reflectits explícitament en el total autoritatiu abans de construir les línies de pagament.

Els webhooks s'autentiquen amb bytes originals, es desen amb deduplicació i només després s'acusen com a rebuts. Normalitzar un esdeveniment no autoritza una venda: cal contrastar compte, entorn, intent, import i moneda amb les dades locals. Ni una redirecció ni `checkout.session.completed` sense comprovar el pagament confirmen una comanda.

L'adaptador ha de rebutjar característiques que no suporti, respectar el TTL del proveïdor i traduir errors sense exposar secrets. Un timeout de creació/cancel·lació és un resultat desconegut: es reconcilia, sense crear un altre intent ni alliberar reserves cegament. Els reemborsaments pendents també requeriran reconciliació persistent abans de donar el flux per complet.

## Què has de fer ara

1. Entra a [Stripe Dashboard](https://dashboard.stripe.com/register) i crea un compte del negoci, o inicia sessió si ja existeix. Activa l'autenticació en dos passos.
2. En el selector de compte, entra a **Sandboxes** i crea o obre un entorn de proves, per exemple «Moda desenvolupament». No activis cobraments reals per començar a desenvolupar.
3. Confirma que ets dins d'aquest entorn. Aquí les operacions de prova no mouen diners reals. Consulta [la guia oficial de Sandboxes](https://docs.stripe.com/sandboxes).
4. Digues-me que ja pots entrar al sandbox. Si la pantalla és diferent, podem revisar-la junts; no cal enviar claus ni contrasenyes.

## Claus: quan connectem l'adaptador

Les claus es consulten a la secció **API keys** del sandbox. La clau secreta només anirà a `.env.local` i a la configuració privada de l'entorn de desplegament. No la copiïs al xat, al README ni a GitHub. [Documentació oficial de claus](https://docs.stripe.com/keys).

Noms previstos, encara no consumits pel codi:

| Variable                | Funció                                                 |
| ----------------------- | ------------------------------------------------------ |
| `PAYMENT_PROVIDER`      | Proveïdor de les compres noves; inicialment Stripe     |
| `PAYMENT_ENVIRONMENT`   | Entorn de proves; cap selecció automàtica de producció |
| `STRIPE_SECRET_KEY`     | Credencial privada del servidor per al sandbox         |
| `STRIPE_WEBHOOK_SECRET` | Secret per verificar un endpoint concret               |
| `APP_ORIGIN`            | Origen fix per construir les URLs de retorn            |

La clau del webhook és diferent de la clau API. La CLI local i l'endpoint desplegat tenen secrets diferents. Amb Checkout allotjat i redirecció del servidor no necessitem introduir ara una clau pública ni el SDK Stripe al navegador.

## Què prepararem després

- Adaptador Stripe protegit amb `server-only`, inicialment limitat a sandbox i pagaments amb targeta.
- Ordres i reserves transaccionals, seguides de Checkout amb idempotència estable per intent.
- Endpoint real de webhook amb verificació de signatura, persistència, deduplicació i reconciliació. No configurar una destinació de webhook fins que existeixi.
- Stripe CLI per reenviar esdeveniments al servidor local; provarem també el checkout complet, perquè un esdeveniment sintètic no prova les nostres comandes.
- Proves de pagament correcte, rebutjat, autenticació addicional, duplicats i cancel·lació amb [les targetes oficials de proves](https://docs.stripe.com/testing).
- Desplegament de proves i comprovació completa abans de configurar credencials reals.

Referència del flux: [Stripe Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment). El retorn del comprador no substitueix el webhook.
