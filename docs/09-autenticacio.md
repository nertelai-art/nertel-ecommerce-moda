# Autenticació i accés del personal

## Implementació

Clients fixats: @supabase/ssr 0.12.5 i @supabase/supabase-js 2.114.0. Tot l'accés a Auth es fa al servidor. Cookies HttpOnly, SameSite=Lax i Secure quan APP_ORIGIN és HTTPS. Cada petició crea el seu client; no es comparteixen sessions entre usuaris.

Rutes: /auth/registre, /auth/confirmar, /auth/entrar, /auth/recuperar, /auth/validar-recuperacio, /compte, /compte/contrasenya, /compte/seguretat i /admin. Confirmació i recuperació amb codi de sis dígits. Respostes de registre i recuperació sense revelar si el compte existeix.

El proxy renova amb getClaims i propaga cookies al servidor i al navegador. Pàgines privades i accions sensibles comproven l'usuari amb getUser. El catàleg conserva la consulta pública independent de sessió.

Les accions POST comproven Origin contra APP_ORIGIN i limiten el cos a 16 KiB. La coincidència és estricta en producció; en desenvolupament, localhost, 127.0.0.1 i [::1] són equivalents només si APP_ORIGIN també és local i el protocol i el port coincideixen. Contrasenyes de 12–128 caràcters i codis de sis dígits validats al servidor. Errors genèrics. Log d'arguments de Server Functions desactivat. La clau TOTP només es mostra al titular, sense captures/traces de prova.

## Permisos i migració

20260903134804_staff_access.sql afegeix public.current_staff_permissions(), RPC SECURITY INVOKER que delega en una funció privada SECURITY DEFINER. Excepció deliberada i limitada: no accepta identitat ni permís com a paràmetres i no escriu dades.

Retorna exclusivament permisos del caller amb auth.uid(). La política protegida exigeix per defecte JWT aal2, sessió existent no caducada i factor TOTP verificat vinculat a la sessió. El seed local desactiva explícitament aquesta exigència per facilitar el desenvolupament; la taula de política no és accessible als rols web. Consulta private.staff_permissions cada vegada i no confia en user_metadata ni en permisos cachejats. Sense alguna condició retorna una llista buida.

authenticated rep USAGE de private i EXECUTE de la funció prevista, però cap accés a les taules privades. anon i service_role no poden cridar la RPC. Futures mutacions necessitaran autorització al servidor i dins la transacció SQL; la RPC no habilita escriptures.

No s'ha creat cap administrador permanent. Les proves concedeixen i retiren catalog.manage només al seu usuari fictici.

## Evidència

- 21 proves unitàries de límits d'entrada i domini.
- 56 SQL: aïllament, metadades falses, AAL1 denegat, AAL2 amb factor/sessió acceptat, revocació immediata de permisos, sessió caducada/revocada i factor no verificat.
- Advisors sense incidències warn/error.
- Playwright: registre, correu a Mailpit, confirmació, cookies HttpOnly, logout, recuperació amb nova contrasenya, login, alta/verificació TOTP, administració denegada, concessió i retirada de permís reflectides al navegador.
- Lint, tipus, format i build verificats.
- BD no reinicialitzada.

## Operació local i Windows

El Control d'aplicacions de Windows ha bloquejat DockerLoopbackShim a la nova carpeta. No s'ha desactivat la política ni tornat a executar el binari bloquejat. db:start comprova ara l'adaptador abans de poder aturar la pila activa.

db pull requeria aquest adaptador per crear la BD ombra. Alternativa utilitzada: SQL provat amb psql; fitxer creat amb supabase migration new, contingut revisat i aplicació idempotent amb migration up --local. Migració registrada i versionada.

La pila existent continua activa, però l'arrencada completa amb db:start a Windows queda pendent d'un flux admès pel Control d'aplicacions. No donar-la per reproduïble ni aturar-la per provar-ho.

pnpm db:auth utilitza Docker oficial i recrea només Auth, sense volums ni ports publicats, conservant la imatge i entorn existents. Restaura la configuració si falla la creació. No toca la BD ni altres projectes. Els fitxers temporals d'entorn contenen secrets locals i estan exclosos de Git.

moda-auth-templates és un nginx fixat per digest que serveix només dos HTML a la xarxa interna, sense ports del host i amb sistema de fitxers de només lectura. Es gestiona separadament de la CLI. config.toml també defineix content_path per a entorns on l'arrencada oficial funcioni.

## Pendent abans de producció

- Configurar domini, HTTPS, SMTP, plantilles i APP_ORIGIN al servei allotjat.
- S'utilitzen límits d'Auth del proveïdor; SSR comparteix IP del servidor. Validar protecció d'abús per client i CAPTCHA abans d'exposició pública.
- Logout global revoca sessions/refresh tokens; access tokens poden continuar fins a caducar on no es comprovi la sessió viva. La consulta de permisos del personal sí que ho comprova.
- Recuperació per pèrdua de TOTP i retirada de factors verificats requereixen un procediment segur encara pendent.
- Perfils editables, eines de gestió, inventari transaccional i compres pendents.

Referències: [SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs), [TOTP](https://supabase.com/docs/guides/auth/auth-mfa/totp), [plantilles locals](https://supabase.com/docs/guides/local-development/customizing-email-templates).

## Flux d'accés simplificat

L'entrada només mostra el formulari, «He oblidat la contrasenya» i «Crea un compte». El registre ofereix el retorn a l'entrada. Confirmació i validació de recuperació apareixen automàticament després del pas corresponent, sense menú de rutes internes ni necessitat de repetir el correu.

Una cookie temporal HttpOnly de deu minuts conserva només correu i tipus de pas, sense dades a la URL. És context de navegació no fiable, validat al servidor; no acredita identitat ni substitueix el codi verificat per Supabase. Els enllaços directes de verificació sense context retornen al primer pas.

Formulari compacte, botó de mostrar/amagar contrasenya i textos contextuals. La prova de navegador recorre els enllaços visibles i les transicions automàtiques.

## Registre local sense confirmació temporal

Per desenvolupar sense SMTP extern, config.toml desactiva enable_confirmations i db:auth aplica GOTRUE_MAILER_AUTOCONFIRM=true només al contenidor Auth local del projecte. El registre entra directament a /compte quan Supabase retorna sessió. Si el proveïdor exigeix confirmació, es conserva el flux amb codi.

Aquesta configuració no modifica cap servei allotjat. Abans de producció cal activar la confirmació de correu i configurar SMTP. La recuperació de contrasenya continua verificant el codi enviat a Mailpit local. La prova Playwright comprova registre directe sense codi, cookies HttpOnly, recuperació i permisos amb MFA.
