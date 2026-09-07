# Catàleg públic connectat

## Implementació

La portada, /cataleg i /productes/[slug] comparteixen capçalera, navegació i peu. Marca provisional centralitzada a src/lib/brand.ts. Tokens ivori, sorra i verd fosc; serif del sistema per als títols. No s'han afegit fotografies fictícies de productes ni condicions comercials inventades.

El repositori de catàleg és exclusiu del servidor i consulta la Data API amb la clau pública. No rep cookies ni tokens d'usuari, i no accepta una clau legacy service_role. La BD continua aplicant grants i RLS. La consulta selecciona camps explícits, productes publicats i variants actives; el DTO validat amb Zod elimina camps aliens.

Paginació de 12 peces, ordre estable per nom i ID, màxim 1.000 pàgines. Consulta d'una peça per slug validat. Timeout de 5 segons, redireccions rebutjades, URL HTTPS o HTTP de loopback, sense memòria cau compartida. Els errors del proveïdor no es retornen al navegador ni es registren amb claus o payloads.

La presentació de preus només admet EUR en aquest increment: no s'aplica una divisió per 100 a monedes amb altres unitats menors. Les variants es mostren informativament; no indiquen estoc disponible i no permeten comprar.

## Preparació local

Des de la carpeta del projecte, amb Node 24 i Docker:

```sh
pnpm install --frozen-lockfile
pnpm db:start
pnpm db:env
pnpm dev
```

db:env crea .env.local amb URL i clau anon de la pila local, sense imprimir credencials. No sobreescriu fitxers existents. .env.local i els registres de la CLI estan exclosos de Git. Per a un altre entorn configurar SUPABASE_URL i SUPABASE_PUBLISHABLE_KEY al gestor de variables corresponent.

## Verificació

- 17 proves unitàries aprovades; inclouen camps privats eliminats del DTO, preus invàlids, moneda no suportada, slugs amb injeccions i rebuig de claus privilegiades.
- Lint, TypeScript, format i compilació de producció correctes.
- Navegador: portada, entrada al catàleg, fitxa amb preu 49,90 EUR i variant M/sorra; revisió visual en escriptori i mòbil. Sense errors registrats pel navegador.
- HTTP: producte publicat visible; esborrany i paginació invàlida retornen 404. Pàgina 2 mostra l'estat buit. Cap dada d'esborranys ni productes arxivats a les respostes comprovades.
- No hi ha loading.tsx compartit: permet determinar el 404 abans d'iniciar l'stream de resposta.
- No s'han modificat migracions ni reinicialitzat la BD.

## Pendent

Autenticació SSR, recuperació de compte, MFA i permisos del personal; alta atòmica de producte, primera variant i nivell d'inventari; edició protegida de productes; múltiples variants; categories i assignacions; i ajustos transaccionals d'inventari estan implementats. Les variants noves neixen inactives amb estoc zero i les categories noves neixen inactives. Les funcions SQL tornen a autoritzar amb una sessió AAL2 viva dins la transacció i no són executables per `anon` ni `service_role`.

Les fitxes públiques mostren només categories actives. El catàleg permet cercar per nom, filtrar per categoria activa i ordenar alfabèticament amb paràmetres d'URL validats i paginació que conserva els criteris.

Les fotografies viuen al bucket privat `product-images`. Només s'accepten JPEG, PNG i WebP de fins a 5 MB; el servidor comprova la signatura binària a més del MIME declarat. Les pujades exigeixen sessió AAL2 i `catalog.manage`, usen noms aleatoris sense sobreescriptura i registren metadades després de pujar. Si el registre falla, s'intenta retirar l'objecte. La lectura anònima només és possible per a metadades i objectes vinculats a productes publicats. `next/image` serveix les imatges a través d'una ruta local amb `nosniff`; els productes sense imatges conserven el placeholder.

El carret desa exclusivament identificadors de variant i quantitats al navegador. La cotització del servidor torna a comprovar producte publicat, variant activa, preu, moneda i disponibilitat. La reserva bloqueja files d'inventari en ordre estable, és atòmica i idempotent, substitueix de forma transaccional la reserva anterior de la mateixa sessió i caduca al cap de 15 minuts. Una cookie opaca HttpOnly identifica la sessió; no conté imports ni dades personals.

El carret pot convertir una reserva vigent en una única comanda pendent amb línies immutables, adreça normalitzada i un intent intern de pagament idempotent. Una recàrrega recupera la comanda mitjançant la cookie opaca i una cancel·lació allibera l'estoc i cancel·la l'intent.

Les mutacions passen per Route Handlers amb límit real de cos i una credencial exclusiva del servidor. PostgreSQL aplica límits distribuïts, vincula les claus d'idempotència amb el contingut, congela el preu en reservar i executa cada minut la caducitat i neteja d'estoc. Les dades personals de comandes cancel·lades o caducades s'anonimitzen al cap de 90 dies.

Falten la connexió de Stripe i el webhook que confirmarà el pagament. La web continua sent una previsualització local sense cobrament. No s'ha publicat a Vercel ni creat infraestructura de producció.

Referències: [Next.js: dades al servidor](https://nextjs.org/docs/app/getting-started/fetching-data), [Supabase: seguretat de la Data API](https://supabase.com/docs/guides/api/securing-your-api).
