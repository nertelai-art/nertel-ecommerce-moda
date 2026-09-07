# Muntar una botiga nova

Procediment per crear una instància des de zero. Escrit per a un tècnic que no
coneix el projecte. Model: **multi-instància**, un projecte de Supabase i un
desplegament per botiga, tots des d'aquest repositori.

## Abans de començar

- Accés d'administració al compte de Supabase, amb `SUPABASE_ACCESS_TOKEN` a
  l'entorn.
- Accés al projecte de Vercel.
- Node segons `.node-version`.
- El domini definitiu de la botiga i accés al seu DNS.
- Nom, moneda i país confirmats **per escrit** pel client. La moneda no es pot
  canviar després d'obrir.

## 1. Crear el projecte de Supabase · 15 min

**La regió es tria ara i no es pot canviar mai més.** Ha de ser europea:
`eu-central-1` (Frankfurt) o `eu-west-3` (París). Fes servir la mateixa que la
resta de la flota; mira `scripts/instances.json`.

```sh
npx supabase projects create nertel-moda-CLIENT \
  --org-id ID_ORGANITZACIO \
  --region eu-central-1 \
  --db-password "$(openssl rand -base64 32)"
```

Apunta la referència del projecte i desa la contrasenya al gestor de
contrasenyes abans de tancar el terminal: no es pot tornar a consultar.
Verifica la regió al tauler. Si no és la que volies, esborra el projecte ara:
és l'únic moment barat per fer-ho.

## 2. Configurar l'autenticació · 20 min

`supabase/config.toml` configura només la pila local. Un projecte allotjat no
el llegeix. Al tauler, a _Authentication_:

| Opció                   | Valor                              | Per què                                     |
| ----------------------- | ---------------------------------- | ------------------------------------------- |
| Site URL                | domini definitiu amb `https://`    | base dels enllaços dels correus             |
| Redirect URLs           | només el domini definitiu          | una llista permissiva permet robar sessions |
| Confirm email           | **activat**                        | en local està desactivat                    |
| Minimum password length | `12`                               | igual que en local                          |
| Refresh token rotation  | activat, reüs 10 s                 | igual que en local                          |
| Secure password change  | activat                            | exigeix la contrasenya actual               |
| MFA · TOTP              | inscripció i verificació           | sense això el personal no obté cap permís   |
| Anonymous sign-ins      | **desactivat**                     | el projecte no en fa servir                 |
| Plantilles              | contingut de `supabase/templates/` | ja són genèriques                           |

Si fas servir `npx supabase config push`, comprova després al tauler que
_Confirm email_ ha quedat **activat**: el fitxer local el porta desactivat i
seria el pitjor valor a propagar.

Configura un SMTP propi de la botiga a _Authentication · SMTP_. El correu de
cortesia de Supabase té un límit baix i els missatges es perdran amb volum.

## 3. Aplicar la cadena de migracions · 10 min

```sh
npx supabase link --project-ref REF_DEL_PROJECTE
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
```

**No facis servir `--include-seed`.** `supabase/seed.sql` carrega catàleg de
demostració i desactiva l'MFA obligatòria del personal.

Comprovació obligatòria:

```sh
npx supabase db diff --linked --schema public,private,storage
```

Ha de dir exactament `No schema changes found`. Si diu qualsevol altra cosa, la
botiga neix amb deriva: atura't i resol-ho.

## 4. Dades mínimes d'arrencada · 10 min

Les migracions deixen creades la política de seguretat, el contingut de portada
amb text neutre i la configuració d'instància. **Falta la ubicació
d'inventari**: sense almenys una, el panell no pot crear cap producte.

Executa les dues primeres parts de `supabase/bootstrap-instancia.sql` a
l'editor SQL del projecte:

```sql
-- Nom, moneda i país. Últim moment per fer-ho.
update private.instance_settings
   set shop_name = 'Nom de la botiga', currency = 'EUR', country_code = 'ES'
 where singleton;

insert into private.inventory_locations (code, name)
values ('MAGATZEM', 'Magatzem principal');
```

Els permisos de l'administrador van al pas 6: encara no hi ha cap usuari.

```sql
select count(*) from private.inventory_locations;          -- 1
select require_staff_mfa from private.security_settings;   -- true
select shop_name, currency from private.instance_settings;
select count(*) from public.products;                      -- 0
```

## 5. Configurar el desplegament · 25 min

| Variable                   | Valor                              | Secret |
| -------------------------- | ---------------------------------- | ------ |
| `SUPABASE_URL`             | `https://REF.supabase.co`          | No     |
| `SUPABASE_PUBLISHABLE_KEY` | clau publicable                    | No     |
| `SUPABASE_SECRET_KEY`      | clau de servei                     | **Sí** |
| `APP_ORIGIN`               | domini amb `https://`, sense barra | No     |
| `DEPLOYMENT_ENV`           | `production`                       | No     |
| `PAYMENTS_MODE`            | `disabled`                         | No     |

`SUPABASE_SECRET_KEY` no pot dur mai el prefix `NEXT_PUBLIC_`, ni aparèixer al
repositori, ni enviar-se per xat. Es copia del tauler al gestor de variables. Si
sospites que s'ha exposat, es rota.

```sh
pnpm env:production
```

Només mostra noms i motius d'error, mai valors. Si passa, connecta el domini,
espera el certificat i desplega.

## 6. Alta de l'administrador · 20 min

Es crea pel formulari de registre de la botiga, no des del tauler.

1. Registre a `https://domini/auth/registre` amb el correu real del responsable.
2. Confirmació per correu. Si no arriba, revisa l'SMTP del pas 2.
3. **TOTP a `/compte/seguretat`.** No és opcional: amb `require_staff_mfa` a
   `true`, un administrador sense TOTP verificat obté una llista de permisos
   buida i veu el panell com si no en tingués cap.
4. Copia el seu UUID de _Authentication · Users_.

```sql
insert into private.staff_permissions (user_id, permission)
select 'UUID_DE_L_ADMINISTRADOR'::uuid, permission
from unnest(array[
  'catalog.manage','inventory.manage','orders.fulfill','customers.read',
  'suppliers.manage','finance.read','content.manage','refunds.create','staff.manage'
]) as permission
on conflict do nothing;
```

Concedeix els nou permisos només si és l'únic operador. `finance.read` i
`refunds.create` són els que convé repartir amb més cura. Que tanqui la sessió i
torni a entrar: els permisos es llegeixen amb una sessió `aal2` nova.

## 7. Stripe · ajornat

Avui no es fa: els pagaments no estan implementats i la botiga s'entrega amb
`PAYMENTS_MODE=disabled`. Quan arribi, **el compte de Stripe el crea i el
posseeix la botiga**, amb les seves claus al seu desplegament i el seu punt
d'entrada de webhook amb secret propi. Els diners no passen per Nertel.

## Llista de verificació final

Al domini definitiu, amb navegador. No la donis per bona des de `localhost`.

**Botiga pública**

- [ ] La portada carrega i mostra el text de la botiga, no el d'una altra
- [ ] El catàleg llista, filtra per talla, color i preu, i cerca per nom
- [ ] La fitxa mostra variants i preu en la moneda correcta
- [ ] Afegir al carret, canviar quantitats i buidar-lo
- [ ] El carret avisa que la compra encara no està activa
- [ ] Una imatge pujada des del panell es veu a la botiga pública

**Comptes**

- [ ] Registre, confirmació per correu, entrada i sortida
- [ ] Recuperació de contrasenya, amb correu rebut
- [ ] Canvi de contrasenya des del compte

**Administració**

- [ ] Sense TOTP verificat, el panell no deixa fer res
- [ ] Amb TOTP: crear producte, afegir variant i publicar-lo
- [ ] Pujar una fotografia i veure-la a la fitxa
- [ ] Ajustar estoc i veure el moviment a l'històric
- [ ] Editar i publicar el contingut de la portada

**Seguretat i infraestructura**

- [ ] Tot per `https`, amb certificat vàlid
- [ ] Cap error a la consola ni cap 500 a la xarxa
- [ ] `db diff --linked` segueix dient `No schema changes found`
- [ ] Cap dada de demostració
- [ ] La regió del tauler és l'europea correcta
- [ ] Còpies actives, i anotat que **no inclouen Storage**

**Registre**

- [ ] Botiga afegida a `scripts/instances.json`
- [ ] `node scripts/fleet.mjs status` la mostra al dia

## Quant es triga

Estimació, no mesura: ningú ha executat encara aquest procediment sencer.

- Primera vegada: 6–8 h, repartides en dos dies per l'espera del DNS.
- Un cop rodat: 3–4 h de feina efectiva.
- Esperes que no depenen de tu: 1–24 h (DNS, certificat, aprovisionament).

Cronometra el primer cop i corregeix aquestes xifres aquí. No hi entra definir
el catàleg real, les fotografies, els textos legals ni la formació del client.

## Què no s'automatitza, i per què

Els passos 3 i 4 són mecànics i es poden encadenar. Els altres no:

- **Pas 1**: la regió és irreversible. Una elecció irreversible mereix que algú
  l'escrigui a mà i la comprovi.
- **Pas 2**: `config push` propagaria les confirmacions de correu desactivades
  del fitxer local. A mà, amb la taula al davant.
- **Pas 6**: crear administradors amb permisos totals des d'un script és el camí
  pel qual apareixen comptes privilegiats que ningú recorda haver creat. Que hi
  hagi una persona i un TOTP real al mig és la protecció, no la molèstia.

## Manteniment de la flota

```sh
node scripts/fleet.mjs status          # en quina versió és cada botiga
node scripts/fleet.mjs drift           # falla si alguna té DDL no registrat
node scripts/fleet.mjs push --dry-run  # què aplicaria a cadascuna
node scripts/fleet.mjs push --confirm  # ho aplica, botiga a botiga
```

`push` s'atura a la primera botiga que falla i deixa la flota a mitges a
propòsit: una flota parcialment migrada i coneguda és millor que una on tres
botigues han fallat en silenci.

Regla per no trencar res: **migració primer, desplegament després, i migracions
compatibles cap enrere.** Esborrar o renombrar es fa en dos passos separats per
un desplegament.

**A partir d'unes deu instàncies això deixa de ser sostenible a mà.** El senyal
real no és el recompte: és el dia que ajornis una migració perquè aplicar-la a
totes és massa feina. Aquell dia toca reobrir la conversa sobre multi-inquilí.
