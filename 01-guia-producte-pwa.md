# Guia de producte: PWA per a una botiga de moda

Data: 3 de setembre de 2026. Estat: especificació inicial per implementar; no descriu funcionalitats ja construïdes.

Document tècnic complementari: [Stack, arquitectura i seguretat](02-stack-arquitectura-seguretat.md).

## 1. Objectiu i abast

Crear una botiga online pròpia, ràpida i accessible, amb experiència mòbil cuidada i un panell perquè el personal gestioni productes, estoc i comandes. La compra ha de funcionar al navegador sense instal·lar la PWA.

Stack acordat: Next.js, TypeScript, Tailwind CSS, Supabase i Vercel. Stripe Checkout és la proposta inicial per als pagaments. Shopify queda fora d'aquesta arquitectura.

Primera versió: una botiga, un catàleg i una moneda de venda. EUR és la proposta inicial, pendent de confirmar. Idiomes, mercats, transportistes i polítiques comercials s'han de concretar abans del llançament. No es pressuposa cap TPV existent.

La seguretat és un requisit transversal amb proves i manteniment. Cap document ni tecnologia garanteix absència absoluta de vulnerabilitats.

## 2. Perfils i permisos

| Perfil | Accions permeses |
|---|---|
| Visitant | Consultar catàleg, gestionar el seu carret i comprar com a convidat |
| Client | Accions de visitant, perfil, adreces i accés a les seves comandes i devolucions |
| Personal | Preparar comandes i consultar les dades necessàries; estoc o catàleg només amb permís explícit |
| Administrador | Gestionar catàleg, permisos, configuració i operacions autoritzades de reemborsament |

Els permisos es comproven en cada operació al servidor i a les dades. Amagar un botó no és un control de seguretat. Cap client pot assignar-se permisos de personal. L'administrador de la botiga no necessita accés tècnic a Supabase o Vercel.

## 3. Primera versió obligatòria

### 3.1 Aparador i catàleg

- Inici amb identitat de marca, col·leccions i productes destacats editables.
- Categories, cerca, ordenació i filtres per talla, color, preu i disponibilitat.
- Filtres representats a l'URL, paginació i retorn al llistat conservant el context.
- Targetes amb fotografia, nom, preu i disponibilitat sense promeses comercials fictícies.
- Productes en esborrany, publicats i arxivats; només els publicats són visibles al públic.
- Estats de càrrega, catàleg buit, cerca sense resultats i error amb opció de tornar-ho a provar.

### 3.2 Fitxa de producte

- Galeria amb ampliació, descripció, composició, cura i guia de talles.
- Selecció explícita de talla i color; indicar combinacions no disponibles.
- Cada combinació comercial és una variant amb SKU estable i estoc propi.
- Quantitats limitades a la disponibilitat i al màxim de compra configurat.
- Informació d'enviament i devolució accessible abans d'afegir al carret.
- Preu anterior i descompte només quan hi ha dades comercials vàlides.

### 3.3 Carret i compra

- Carret persistent, editable i disponible sense compte.
- Mostrar variants, quantitats, subtotals, descomptes admesos i despeses d'enviament.
- Informar del total final abans de pagar; qualsevol canvi de preu o estoc requereix informar el comprador.
- Recollir només les dades necessàries per al lliurament i la comunicació de la comanda.
- Pagament a Stripe Checkout; la botiga no recull ni desa números complets de targeta o CVC.
- El servidor recalcula imports i disponibilitat; no confia en els imports del navegador.
- Tractar compra pendent, pagada, fallida, cancel·lada i sessió caducada.
- La pàgina de retorn pot mostrar «Estem confirmant el pagament». No declara una compra pagada només per haver rebut una redirecció.
- Si el comprador prem dues vegades, no es creen dos cobraments per al mateix intent.
- Enviar confirmació quan la comanda està confirmada, amb reintent si falla el correu.

### 3.4 Compte de client

- Registre, accés, verificació del correu, recuperació d'accés i tancament de sessió.
- Perfil, adreces i historial amb detall de les comandes pròpies.
- Compra com a convidat amb consulta posterior mitjançant verificació segura del correu o enllaç temporal.
- No permetre consultar comandes només amb un número de comanda i un correu conegut.
- Associar una compra de convidat a un compte només després de verificar-ne la propietat.
- El canvi d'una adreça del perfil no modifica comandes anteriors.

### 3.5 Administració

- Panell separat visualment de la botiga, amb autenticació i MFA per al personal.
- Alta i edició de productes, variants, fotografies, categories i publicació.
- Entrades i ajustos d'estoc amb quantitat, motiu, autor i data.
- Comandes filtrables per data i estat; vista del detall i seguiment d'enviament.
- Permisos diferenciats per modificar estoc, consultar clients i reemborsar.
- Arxivar productes sense esborrar l'historial de vendes.
- Descomptes simples amb vigència i límits si s'inclouen al llançament; combinacions complexes ajornades.
- Confirmació clara abans d'operacions sensibles, indicant l'import i l'objecte afectat.

### 3.6 Devolucions i postvenda

- Sol·licitud associada a articles i quantitats d'una comanda pròpia.
- Mostrar condicions i passos; les regles concretes s'han de validar amb el negoci.
- Flux: sol·licitada → en revisió → autoritzada o rebutjada → rebuda → resolta.
- Reemborsament amb estat propi: pendent, completat o fallit; suport parcial i total.
- La recepció de la peça no implica automàticament que sigui apta per tornar a l'estoc.
- Registrar inspecció i decisió de reposició separadament del reemborsament.
- Primera versió: retorn i nova compra per canviar talla; intercanvi automàtic de variants ajornat.
- El personal gestiona preparació, logística, inspecció i atenció al client.

### 3.7 Dashboard

- Comandes pendents de preparar, devolucions obertes i variants amb poc estoc.
- Imports pagats i reemborsats separats, amb moneda, zona horària i període visibles.
- No anomenar «benefici» a la facturació: el marge requereix costos fiables.
- No comptar intents de pagament com a vendes; definir les mètriques abans de mostrar-les.
- Accés a dades de clients limitat a les necessitats del rol.

## 4. Disseny i experiència

### Direcció visual

El disseny ha de donar protagonisme a les peces: fotografia coherent, fons neutres, tipografia llegible i jerarquia clara. La marca concreta queda pendent; no s'ha de fixar una estètica que el client no hagi validat.

- Definir tokens de color, espaiat, tipografia, radis i estats interactius.
- Reutilitzar botons, camps, targetes, diàlegs, avisos i taules.
- Limitar famílies tipogràfiques i evitar animacions que dificultin comprar.
- Fotografies amb proporció consistent al llistat i visualització suficient del producte a la fitxa.
- Dissenyar primer per mòbil i verificar també tauleta i escriptori.
- Una acció principal clara per pantalla, amb errors al costat del camp afectat.
- Els textos han de parlar de compres i productes, sense exposar errors SQL, tokens ni noms d'infraestructura.

### Accessibilitat

Objectiu del projecte: WCAG 2.2 nivell AA, amb revisió manual a més d'eines automàtiques. Referència: [W3C — WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/).

- Navegació completa amb teclat, focus visible i ordre lògic.
- Etiquetes reals als camps, errors anunciats i instruccions comprensibles.
- No comunicar disponibilitat o errors només mitjançant color.
- Text alternatiu útil a les imatges de producte; imatges decoratives sense soroll per al lector de pantalla.
- Contrastos revisats, zoom funcional i controls tàctils còmodes; objectiu de disseny de 44 × 44 píxels.
- Diàlegs amb gestió de focus i retorn al control d'origen.
- Respectar la preferència de moviment reduït.

## 5. Comportament PWA

- HTTPS, manifest, nom, icones i mode de visualització configurats.
- Instal·lació com a millora opcional, segons suport del navegador; no forçar-la per comprar.
- Informar quan no hi ha connexió i oferir una sortida clara.
- Permetre només consultar contingut públic prèviament desat offline.
- El carret local pot conservar SKU i quantitat, però no representa una reserva ni un preu garantit.
- Pagaments, confirmacions, administració i dades personals requereixen connexió.
- No posar en cua compres ni reemborsaments offline.
- No desar pàgines privades en la memòria cau del service worker.
- Actualitzacions de PWA sense recarregar forçosament una compra en curs.
- Provar instal·lació, actualització i falta de connexió en iOS i Android compatibles.

Referència d'implementació: [Next.js — PWA](https://nextjs.org/docs/app/guides/progressive-web-apps).

## 6. Qualitat, rendiment i privacitat

- Objectius de camp proposats al percentil 75: LCP ≤ 2,5 s, INP ≤ 200 ms i CLS ≤ 0,1. Validar amb trànsit real quan n'hi hagi.
- Comprimir fotografies, reservar-ne les dimensions i carregar sota demanda les que no són inicialment visibles.
- Catàleg indexable amb títols, metadades, sitemap, canonical i dades estructurades coherents amb els preus reals.
- Evitar indexació de comptes, administrador i entorns de prova; la seguretat no depèn de robots.txt.
- No enviar correus, adreces ni dades de comanda a analítica o eines de gravació de sessions.
- Analítica i màrqueting opcionals segons la configuració de consentiment aplicable.
- Textos de privacitat, venda i devolució aprovats abans de publicar; aquest document no certifica compliment legal.
- Definir conservació, exportació i supressió de dades, tenint en compte l'historial que el negoci hagi de conservar.

## 7. Fases

| Fase | Resultat esperat |
|---|---|
| 0. Definició | Marca, mercats, moneda, logística, permisos i regles comercials confirmats |
| 1. Base | Disseny, catàleg, variants, autenticació, inventari i panell inicial |
| 2. Compra | Carret, reserves, Stripe, comandes i correus transaccionals |
| 3. Operativa | Preparació, devolucions, reemborsaments i dashboard |
| 4. Llançament | PWA, accessibilitat, proves de seguretat, restauració i validació amb la botiga |
| Posterior | Favorits, reposició, fidelització, push, idiomes addicionals i integració TPV |

Les fases 1–4 formen la primera versió comercial. No posar-la en producció només perquè la pantalla de pagament funcioni.

## 8. Criteris d'acceptació del llançament

- [ ] Compra completa com a convidat i com a client, en mòbil i escriptori.
- [ ] Dues compres simultànies de l'última unitat no provoquen sobreventa.
- [ ] Preus manipulats al navegador no alteren l'import calculat pel servidor.
- [ ] Tancar la pestanya després de pagar no perd la comanda.
- [ ] Errors, pagaments pendents i cancel·lacions tenen una resposta clara.
- [ ] Un client no pot llegir ni modificar dades d'un altre client.
- [ ] Un empleat sense permís no pot reemborsar ni canviar rols.
- [ ] Reemborsament parcial i reposició d'estoc provats sense duplicacions.
- [ ] Correus, seguiment i contacte d'atenció al client funcionen.
- [ ] Catàleg, carret i formularis es poden utilitzar amb teclat.
- [ ] No apareixen dades privades offline ni després de canviar d'usuari.
- [ ] Monitoratge, còpies i restauració validats segons la guia tècnica.
- [ ] Condicions comercials i continguts validats pel responsable de la botiga.

## 9. Decisions pendents

Nom i marca; idiomes; mercats i moneda; quantitat de productes i variants; transportistes i tarifes; recollida en botiga; fiscalitat i facturació; política de devolució; nombre d'empleats; pressupost recurrent; existència de TPV/ERP i possibilitats d'integració.

Es pot començar la base tècnica amb dades fictícies. Aquestes decisions són necessàries per tancar el comportament comercial abans de publicar.
