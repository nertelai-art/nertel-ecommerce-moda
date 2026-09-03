# Seguretat

No publiqueu credencials ni dades personals en incidències. Si detecteu una vulnerabilitat, comuniqueu-la privadament al responsable del repositori; el canal formal queda pendent de configurar abans de publicar-lo.

## Controls presents

- Base SQL local amb RLS a totes les taules d'aplicació, permisos explícits per columna i 56 proves SQL d'accés i integritat. Inventari i permisos de personal en esquema privat, sense escriptures d'aplicació habilitades.
- Arrencada Docker amb comprovació dels ports: si no estan limitats a loopback, la pila s'atura conservant dades. Incidència detectada en aquesta màquina documentada a `docs/06-base-dades-local.md`.

- Entrades del carret amb esquema estricte: sense preus, estat de pagament ni camps addicionals; variants duplicades rebutjades.
- Imports en enters segurs, amb comprovació de desbordament.
- CSP amb nonce nou per resposta HTML, sense `unsafe-inline` per a scripts; `unsafe-eval` només en desenvolupament.
- Protecció d'emmarcat, `nosniff`, política de referència i permisos de navegador limitats.
- HTML dinàmic amb `private, no-store`; indexació desactivada mentre es construeix.
- Secrets exclosos de Git i de l'exemple d'entorn; no hi ha credencials d'integracions.
- No hi ha endpoints comercials ni accés a dades de clients.

## Decisions i límits

La CSP permet estils inline per compatibilitat amb el renderitzat; s'haurà de revisar en afegir components i integracions. La CSP amb nonce implica renderització dinàmica: abans de cachejar catàleg, cal dissenyar una estratègia compatible. El proxy no és una barrera d'autorització.

HTTPS i HSTS s'han de verificar al desplegament. Les capçaleres no substitueixen autenticació, RLS, validació o límits distribuïts. La base no implementa encara aquests controls d'integració perquè tampoc exposa les operacions corresponents.

No hi ha service worker ni caché offline: s'afegiran després amb llista permesa de recursos públics i proves de canvi d'usuari. No activar pagaments fins a verificar reserves atòmiques, signatures de webhook, idempotència i reconciliació.

Abans de llançar, complir les proves i condicions de `docs/02-stack-arquitectura-seguretat.md`. Un audit de dependències sense incidències no certifica absència de vulnerabilitats.

## Autenticació actual

SSR amb cookies HttpOnly, validació d'origen, TOTP i permisos comprovats contra sessions actives. Encara no hi ha escriptures comercials. Els límits anteriors descriuen la base inicial; l'estat actual i els controls pendents abans de producció són a docs/09-autenticacio.md.

Windows bloqueja l'adaptador d'arrencada a la nova carpeta. La pila existent continua activa; no desactivar el Control d'aplicacions.
