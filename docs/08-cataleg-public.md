# Catàleg públic connectat

## Implementació

La portada, /cataleg i /productes/[slug] comparteixen capçalera, navegació i peu. Marca provisional centralitzada a src/lib/brand.ts. Tokens ivori, sorra i verd fosc; serif del sistema per als títols. No s'han afegit fotografies fictícies de productes ni condicions comercials inventades.

El repositori de catàleg és exclusiu del servidor i consulta la Data API amb la clau pública. No rep cookies ni tokens d'usuari, i no accepta una clau legacy service_role. La BD continua aplicant grants i RLS. La consulta selecciona camps explícits, productes publicats i variants actives; el DTO validat amb Zod elimina camps aliens.

Paginació de 12 peces, ordre estable per nom i ID, màxim 1.000 pàgines. Consulta d'una peça per slug validat. Timeout de 5 segons, redireccions rebutjades, URL HTTPS o HTTP de loopback, sense memòria cau compartida. Els errors del proveïdor no es retornen al navegador ni es registren amb claus o payloads.

La presentació de preus només admet EUR en aquest increment: no s'aplica una divisió per 100 a monedes amb altres unitats menors. Les variants es mostren informativament; no indiquen estoc disponible i no permeten comprar.

## Preparació local

Des de C:\Users\nerte\pwa-ecommerce-moda, amb Node 24 i Docker:

```sh
npm ci
npm run db:start
npm run db:env
npm run dev -- --hostname 127.0.0.1 --port 3100
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

Autenticació SSR, recuperació de compte, MFA i permisos del personal; filtres/cerca, fotografies i catàleg real; inventari transaccional, carret i checkout. La web continua sent una previsualització local amb compres desactivades. No s'ha publicat a Vercel ni creat infraestructura de producció.

Referències: [Next.js: dades al servidor](https://nextjs.org/docs/app/getting-started/fetching-data), [Supabase: seguretat de la Data API](https://supabase.com/docs/guides/api/securing-your-api).
