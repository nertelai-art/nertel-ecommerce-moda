# Recorregut crític automatitzat

```sh
pnpm exec playwright install chromium webkit
pnpm test:e2e
```

Cal Node compatible, dependències instal·lades, Docker actiu i OpenSSL (també
s'aprofita el que inclou Git for Windows). No cal arrencar
la base de desenvolupament ni preparar `.env.local`.

## Aïllament

Cada execució crea una xarxa i contenidors propis de PostgreSQL, Auth,
PostgREST i Storage amb noms `moda-e2e-<uuid>`. Les credencials es generen de
nou. Els ports publicats indiquen explícitament `127.0.0.1`; no es confia en
la configuració global de Docker. No es munten volums de la botiga local.

La base buida aplica les migracions versionades i el seed sintètic. El compte
de compra es crea confirmat mitjançant l'API administrativa de l'Auth efímer;
la prova entra després amb el formulari real. No prova registre, lliurament
de correu, recuperació ni MFA. Auth no té proveïdor de correu configurat.

Es copia l'aplicació a `.e2e/<uuid>/app`, sense fitxers `.env`, es compila i
s'executa en mode producció. El proxy de proves normalitza la IP reenviada.
El servidor de desenvolupament i la seva carpeta `.next` no es reutilitzen.

L'origen de la botiga de proves és HTTPS sobre `127.0.0.1`, amb una clau i un
certificat autofirmat nous per execució i vàlids durant un dia. No s'instal·la
cap certificat al sistema. Només els contextos de navegador de la suite
accepten aquest certificat; el manifest impedeix apuntar a dominis remots.
La comprovació d'arrencada de Node valida explícitament el certificat generat.
Chromium accepta per al service worker només la clau pública del certificat
efímer, identificada pel seu hash SPKI al manifest de proves.
Les connexions internes a les APIs continuen sent locals. Això permet mantenir
la CSP de producció, inclosa `upgrade-insecure-requests`, també amb WebKit.

Les proves exigeixen un manifest local vàlid i verifiquen l'etiqueta del
contenidor abans de cada consulta SQL. No admeten una URL o un nom de base
arbitraris. Executar Playwright directament sense el runner falla, no salta
les proves silenciosament.

## Què es comprova

1. L'accés a compte requereix entrada. El formulari autentica el comprador i
   les cookies de sessió són Secure, HttpOnly i SameSite=Lax.
2. El producte arriba al carret, es cotitza amb el preu autoritatiu i es
   reserva una unitat d'estoc.
3. La comanda queda pendent amb un únic intent de pagament intern, sense
   cobrar. La recàrrega recupera la mateixa comanda.
4. Cancel·lar allibera l'estoc i cancel·la comanda i intent. Tancar sessió
   torna a protegir l'accés al compte.
5. Dos clients independents intenten reservar simultàniament l'última unitat:
   només un ho aconsegueix. Repetir-ne la petició és idempotent; canviar-ne el
   contingut amb la mateixa clau es rebutja. Després de cancel·lar, l'altre
   client pot reservar la unitat.

## Neteja i diagnòstic

El runner elimina només contenidors i volums efímers de la seva execució,
comprovant-ne l'etiqueta, i la seva xarxa. Ho fa també si les proves fallen.
Una interrupció abrupta del sistema o de Docker pot requerir neteja manual
dels recursos d'aquell UUID; no utilitzar `docker system prune`.

Quan passa, també retira la còpia temporal. Quan falla, conserva els logs a
`.e2e/<uuid>` per al diagnòstic local. Poden contenir credencials de prova:
estan ignorats per Git i no es pugen com a artefactes de CI. Captures, vídeo
i traces automàtiques de Playwright estan desactivats. La suite mòbil genera
només una captura explícita del carret fictici amb l'avís d'emmagatzematge,
a `.e2e/mobile-cart-<projecte>.png`, per a revisió visual local; no es puja a CI.

## CI i promoció

La mateixa execució també inclou les [proves PWA](15-pwa-installacio-offline.md):
manifest, offline, privacitat de la memòria cau i actualització del worker.

`Critical journey` executa el recorregut en cada push a `develop` i manualment.
`release:check` també l'inclou. Les imatges Docker i Playwright necessàries es
descarreguen a CI; no necessita secrets de preproducció ni de producció.

El fitxer antic `auth.e2e.ts` no forma part d'aquesta suite: es conserva per
adaptar-ne en una feina separada les proves de recuperació i administració.
