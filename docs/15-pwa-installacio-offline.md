# PWA: instal·lació i falta de connexió

La botiga incorpora una base PWA instal·lable. La compra continua funcionant
al navegador sense instal·lació. Stripe es deixa per a una fase posterior.

## Identitat i instal·lació

El manifest `/manifest.webmanifest` llegeix el nom de la instància i declara
identitat i abast `/`, inici `/`, idioma català i visualització `standalone`.
No conté dominis, usuaris ni identificadors de sessió. La identitat d'Apple
també utilitza el nom de la botiga.

Les icones PNG de 192 i 512 píxels, la icona maskable de 512 i la d'Apple de
180 són a `public/pwa`. El logotip provisional és una M de traç plegat sobre
verd fosc, amb un petit detall daurat. El dibuix mestre és `icon.svg`; es pot
substituir per la identitat de cada desplegament. La icona
maskable manté el dibuix dins de la zona segura central.

`node scripts/generate-brand-icons.mjs` regenera les icones PNG i els favicons
SVG i ICO (16, 32 i 48 píxels). El favicon té un enquadrament més proper per
mantenir la llegibilitat a la pestanya. El mateix símbol apareix a la capçalera.
Després de regenerar-los, incrementar també la versió del service worker.

El peu de pàgina ofereix «Instal·lar la botiga». Quan el navegador emet
`beforeinstallprompt`, apareix un botó per demanar la instal·lació amb un gest
explícit de l'usuari. També hi ha instruccions per a Safari i per al menú del
navegador. No es demanen notificacions ni permisos de push.

En un desplegament cal HTTPS. El registre del worker només s'activa en mode
producció; el desenvolupament no deixa un worker interferint amb HMR. Les
proves utilitzen una compilació de producció en HTTPS de loopback amb un
certificat efímer, sense modificar la confiança del sistema operatiu.

## Política offline

El service worker `/sw.js` desa exclusivament una llista tancada de recursos:
`offline.html`, els seus CSS i JS, i quatre icones. Els baixa sense cookies,
rebutja errors i redireccions i no desa altres respostes en temps d'execució.

Quan una navegació completa falla per xarxa, mostra la pantalla «Ara no tens
connexió». La pantalla no depèn de Next.js ni de Supabase i permet reintentar
o tornar a l'inici. Una resposta HTTP d'error del servidor no se substitueix
silenciosament per aquesta pantalla.

**No hi ha navegació offline del catàleg en aquesta primera versió.** L'HTML
actual utilitza nonces de CSP per petició; no es reutilitza. Tampoc es desen
RSC, APIs, compte, administració, carret, comandes ni dades de clients. Les
pàgines que ja eren obertes poden continuar visibles en memòria; això no és
una còpia persistent del service worker.

El carret local continua guardant només referències i quantitats. Sense
connexió s'avisa que preus i disponibilitat poden haver canviat i es bloquegen
reserva, cancel·lació i creació de comandes. En recuperar connexió es torna a
consultar el preu i l'estat actual. `navigator.onLine` és només un indicador:
els errors reals de petició continuen gestionant-se a cada operació.

Si el navegador denega l'emmagatzematge local o n'esgota la quota, el carret
continua funcionant en memòria i avisa que no sobreviurà a una recàrrega.
Una dada local amb JSON malmès es descarta; no impedeix continuar comprant.

No hi ha Background Sync, cua de compres ni reintent automàtic d'escriptures.
No s'activa l'opció experimental de Next.js que reintenta Server Actions en
recuperar connexió.

## Actualitzacions

No es crida `skipWaiting`, ni es recarrega la pàgina en `controllerchange`.
Una actualització espera que s'acabin totes les finestres i pestanyes que
utilitzen la versió anterior. La interfície informa de la versió pendent.

En modificar qualsevol recurs precachejat, incrementar `VERSION` a
`public/sw.js`. En activar-se, només elimina memòries cau amb el prefix
`moda-pwa-shell-` d'altres versions. No elimina dades d'altres funcionalitats.
El worker es serveix amb `no-store` i es registra amb `updateViaCache: none`.

## Verificació

`pnpm test:e2e` comprova en un entorn efímer:

- Manifest llegible per Chromium, dimensions PNG i capçaleres del worker.
- Ajuda d'instal·lació en amplada mòbil i gestió del prompt opcional simulat.
- Compte autenticat que no reapareix en navegar offline, APIs sense còpia i
  llista exacta d'entrades de Cache Storage.
- Bloqueig de reserva offline, persistència del carret mínim i recuperació de
  connexió sense enviar cap operació comercial automàticament.
- Actualització en espera amb una finestra oberta i purga limitada a la
  memòria cau pròpia després de tancar-la.
- Les regressions del recorregut de compra i de concurrència anteriors.
- Navegació tàctil, ajust a la pantalla, favicon, icona d'Apple, avís de
  desconnexió i recuperació en Chromium amb perfil Pixel 7 i WebKit amb perfil
  iPhone 13. La recàrrega offline amb service worker es prova només a Chromium:
  [Playwright limita aquest suport a Chromium](https://playwright.dev/docs/service-workers).
  També es prova la denegació d'emmagatzematge en tots dos motors.

Cal instal·lar els dos motors amb `pnpm exec playwright install chromium webkit`.
CI ho fa automàticament. Els perfils mòbils simulen mida, tacte i agent d'usuari;
no executen Android ni iOS.

Abans de publicar, queda la comprovació **en dispositius físics**: instal·lar
des de Safari a iPhone/iPad i Chrome a Android, obrir des de la icona, comprovar
la presentació standalone, desconnectar/reconnectar i provar una actualització
amb més d'una finestra. El prompt simulat i els motors automatitzats no validen
la interfície d'instal·lació del sistema operatiu.

Per a aquesta comprovació, utilitzar una URL HTTPS de preproducció accessible
des del telèfon. `localhost` al telèfon apunta al mateix telèfon, no a l'ordinador.
No cal obrir la base de dades a la xarxa. Passos d'acceptació:

1. Obrir la botiga amb Safari a iOS o Chrome a Android i instal·lar-la des del
   menú del navegador. Comprovar el nom i el símbol M a la pantalla d'inici.
2. Tancar el navegador i obrir-la des de la icona. Comprovar l'absència de la
   barra d'adreces i que no hi hagi contingut tallat ni desplaçament lateral.
3. Afegir un producte al carret, activar el mode avió i comprovar l'avís de
   desconnexió i el bloqueig de reserva. Recarregar: ha de sortir la pantalla
   offline, sense dades personals.
4. Recuperar la connexió i prémer «Tornar-ho a provar»: el carret conservat
   ha de tornar i els preus s'han de consultar de nou, sense crear cap comanda.
5. Amb la botiga oberta, publicar una versió de prova amb una versió nova del
   worker. Comprovar que no recarrega la compra. Tancar totes les finestres
   de la botiga i reobrir per completar l'actualització.

Referències: [guia PWA de Next.js](https://nextjs.org/docs/app/guides/progressive-web-apps)
i documentació inclosa amb la versió instal·lada a `node_modules/next/dist/docs`.
