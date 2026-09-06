-- NO ES UNA MIGRACIO. No moure mai a supabase/migrations.
--
-- Dades minimes d'arrencada d'una botiga nova. NO va a supabase/migrations:
-- els valors canvien a cada instancia, i una migracio ha de ser identica a
-- totes. S'executa una sola vegada, a ma, just despres d'aplicar la cadena.
--
-- No confondre amb supabase/seed.sql, que carrega catleg de demostracio i
-- desactiva l'MFA. seed.sql NO s'ha d'executar mai en una instancia real.
--
-- Que aporta cada migracio ja aplicada, i que falta:
--   private.security_settings   -> fila creada per migracio, require_staff_mfa = true.  OK
--   public.storefront_content   -> fila creada per migracio amb text neutre.            OK
--   private.storefront_drafts   -> idem.                                                OK
--   private.instance_settings   -> fila creada per migracio amb EUR/ES.  REVISAR sota.
--   private.inventory_locations -> BUIDA. Nomes la crea seed.sql.        OBLIGATORI sota.
--   private.staff_permissions   -> BUIDA. Cap administrador permanent.   OBLIGATORI sota.

begin;

-- 1. Moneda i pais de la instancia. Nomes cal si la botiga no ven en EUR des
--    d'Espanya. Canviar-ho DESPRES de tenir comandes corromp el llibre: o es
--    fa aqui, abans d'obrir, o no es fa.
-- update private.instance_settings set currency = 'GBP', country_code = 'GB' where singleton;

-- 2. Ubicacio d'inventari. Sense almenys una, el panell no pot crear cap
--    producte: create_catalog_product exigeix un inventory_location.
insert into private.inventory_locations (code, name)
values ('MAGATZEM', 'Magatzem principal');

-- 3. Permisos del primer administrador.
--    Substitueix l'identificador pel de l'usuari creat al pas d'alta del
--    runbook. Es concedeixen tots els permisos perque es l'unic operador
--    inicial de la botiga; si n'hi ha mes d'un, dona a cadascu nomes els seus.
--
--    Recorda que require_staff_mfa es true: aquest usuari no tindra cap permis
--    efectiu fins que hagi inscrit i verificat un TOTP i la sessio sigui aal2.
insert into private.staff_permissions (user_id, permission)
select '00000000-0000-0000-0000-000000000000'::uuid, permission
from unnest(array[
  'catalog.manage', 'inventory.manage', 'orders.fulfill', 'customers.read',
  'suppliers.manage', 'finance.read', 'content.manage', 'refunds.create',
  'staff.manage'
]) as permission
on conflict do nothing;

commit;

-- Verificacio immediata, ha de retornar 1, 9 i true:
--   select count(*) from private.inventory_locations;
--   select count(*) from private.staff_permissions;
--   select require_staff_mfa from private.security_settings;
