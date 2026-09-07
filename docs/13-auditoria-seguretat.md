# Millores de seguretat i integritat de dades

7 de setembre de 2026.

## Canvis

- La cotització antiga `quote_cart(jsonb)` ja no és executable pels rols de
  l'API. El servidor utilitza `server_quote_cart(jsonb,text)` amb límit de ritme.
- `x-vercel-forwarded-for` només és de confiança quan la plataforma estableix
  `VERCEL=1`. Fora de Vercel, `TRUST_FORWARDED_FOR=1` requereix un proxy que
  substitueixi la capçalera `x-forwarded-for`; no n'hi ha prou d'afegir-hi la IP.
  Cal impedir l'accés directe al servidor que esquivi aquest proxy.
- En producció les peticions comercials sense IP de confiança vàlida retornen 503. No cauen silenciosament en un límit per sessió o sense límit. En local
  es conserva el recanvi per sessió.
- Els cossos JSON i multipart es consumeixen amb un màxim de bytes durant la
  lectura, també quan són chunked o el Content-Length és incorrecte. Cal
  mantenir límits de mida i temps de lectura també a la infraestructura.
- Talles, colors i categories es calculen en SQL sobre el catàleg visible,
  sense obtenir una mostra de variants limitada per PostgREST.
- Els repositoris administratius llegeixen un resultat JSON escalar amb les
  dades completes d'una consulta. `staff_snapshot` és SECURITY INVOKER i
  delega en els permisos i MFA de cada funció existent; no accepta SQL lliure.
- El contingut de portada té timeout i registra una incidència sense dades
  personals ni respostes del proveïdor quan ha d'utilitzar el contingut de reserva.

## Límits que continuen existint

La lectura administrativa admet fins a 5.000 registres per recurs i rebutja
volums superiors amb SQLSTATE 54000. Aquest límit evita totals parcials i
respostes excessives; no substitueix la paginació del panell ni l'agregació
d'informes al servidor SQL. Les funcions internes encara poden processar més
files abans d'aplicar el límit. Per volums grans, cal construir consultes
paginades amb filtres i totals agregats, i mesurar-les amb EXPLAIN ANALYZE.
Cada recurs té la seva instantània; diverses crides paral·leles no comparteixen
una única transacció.

El límit comercial SQL continua compartint transacció amb l'operació: les
operacions que fallen fan rollback del comptador. Per limitar també intents
fallits i protegir la capacitat del servidor, cal un límit d'entrada al proxy
o un comptador independent de la transacció comercial.

No s'ha activat memòria cau compartida del catàleg, Stripe ni cap
desplegament remot. La [PWA](15-pwa-installacio-offline.md) desa només la pantalla
offline i els seus recursos públics. El [recorregut crític aïllat](14-proves-recorregut-critic.md)
ja té una porta E2E; recuperació, MFA i altres fluxos encara no hi estan inclosos.

## Desplegament

Aplicar la migració versionada abans del codi nou. No aplicar el seed fora de
desenvolupament. En una comprovació local de variables destinada a Vercel,
cal reproduir `VERCEL=1`; la plataforma l'estableix automàticament. No
establir aquesta variable en un servidor propi per eludir la validació.

Les regressions SQL comproven accés directe denegat, permisos, MFA, filtres
amb més de 100 registres i rebuig de volums excessius. Les unitàries proven
capçaleres falsificades i cancel·lació de lectures quan superen el límit.
