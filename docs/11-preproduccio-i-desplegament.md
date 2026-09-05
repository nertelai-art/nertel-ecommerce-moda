# Preproducció i desplegament

Aquest document és el runbook operatiu abans de connectar Stripe. Preproducció ha de tenir projecte Supabase, variables, usuaris i dades separats de producció. No s'hi copien clients reals.

## Estat preparat al repositori

- `develop` executa una porta completa de qualitat, build, migracions, proves SQL i assessors.
- `npm run env:preproduction` rebutja HTTP, hosts locals, claus intercanviades, variables absents i pagaments activats.
- Les migracions són l'única font de canvis d'esquema. No es modifica l'esquema remot des del Dashboard.
- Stripe queda desactivat amb `PAYMENTS_MODE=disabled`.

## 1. Crear els entorns

1. Crear un projecte Supabase exclusiu per a preproducció i un altre per a producció.
2. Activar confirmació de correu, configurar les URL de redirecció HTTPS i conservar MFA obligatori per al personal.
3. A Vercel, vincular el repositori. Fer servir `develop` per a Preview i reservar `main` per a producció.
4. Configurar les variables de Preview a partir de `.env.preproduction.example`. Els secrets només van al gestor de variables de Vercel.
5. No donar mai a Preview les credencials ni la base de dades de producció.

## 2. Validar variables sense revelar-les

Per validar una còpia local de la configuració de Preview:

```powershell
Copy-Item .env.preproduction.example .env.local
# Ompliu .env.local fora de Git
npm run env:preproduction
```

La comprovació només mostra noms i motius d'error. No imprimeix cap valor. `SUPABASE_SECRET_KEY` és exclusiva del servidor i no pot tenir prefix `NEXT_PUBLIC_`.

## 3. Migrar preproducció

Cal instal·lar/autenticar la CLI i enllaçar explícitament el projecte correcte. Abans d'aplicar res, comprovar l'identificador del projecte dues vegades.

```powershell
npx supabase link --project-ref <REF_PREPRODUCCIO>
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
```

No utilitzar `--include-seed`: els seeds contenen dades de demostració i configuració local. Crear el primer administrador de preproducció de manera controlada i activar-li TOTP abans de concedir accés.

## 4. Porta de promoció

```powershell
npm ci
npm run db:start
npm run release:check
npm run db:stop
```

Després del desplegament Preview, comprovar manualment: inici de sessió, MFA del personal, catàleg, pujada d'imatges, inventari, reserva/cancel·lació, comandes, enviaments i publicació de contingut. Confirmar també HTTPS, cookies `Secure`, CSP i absència d'errors de servidor. No provar amb dades personals reals.

## 5. Còpies i recuperació

- En un pla de pagament, verificar al Dashboard que les còpies diàries estan actives i documentar la retenció contractada.
- Si el negoci necessita un RPO inferior a un dia, valorar PITR abans del llançament.
- Les còpies de base de dades no inclouen els objectes de Storage. Cal una còpia separada de les fotografies i una prova de restauració periòdica.
- Abans de cada migració de producció, prendre una còpia lògica xifrada o verificar un punt restaurable recent.
- Provar la restauració en un projecte aïllat; mai sobre producció com a simulacre.

## 6. Ordre de producció i rollback

1. Bloquejar temporalment canvis administratius.
2. Verificar còpia recuperable i `supabase migration list`.
3. Executar `supabase db push --dry-run` i revisar exactament les migracions pendents.
4. Aplicar migracions una sola vegada.
5. Desplegar el mateix artefacte validat a Preview o promocionar-lo.
6. Fer smoke tests i revisar logs.

Si falla l'aplicació, revertir/promocionar l'artefacte anterior. No es reverteixen migracions destructivament a cegues: restaurar només amb un pla de dades aprovat. Registrar incident, hora, versió i impacte.

## Pendent abans del llançament públic

- Domini i correu transaccional definitius.
- Canal privat de notificació de vulnerabilitats i monitoratge d'errors.
- Política legal, privacitat, cookies, devolucions i conservació de dades revisades pel client.
- Prova real de restauració de base de dades i Storage.
- Implementació i auditoria de Stripe segons `docs/10-guia-stripe-implementacio.md`.
