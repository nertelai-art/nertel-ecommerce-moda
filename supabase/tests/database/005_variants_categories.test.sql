begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select plan(16);
update private.security_settings set require_staff_mfa = true where singleton;

insert into auth.users(id,email) values ('68000000-0000-4000-8000-000000000001','variants-staff@example.invalid');
insert into private.staff_permissions(user_id,permission) values
  ('68000000-0000-4000-8000-000000000001','catalog.manage'),
  ('68000000-0000-4000-8000-000000000001','inventory.manage');
insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at)
values ('69000000-0000-4000-8000-000000000001','68000000-0000-4000-8000-000000000001','totp','verified',now(),now());
insert into auth.sessions(id,user_id,factor_id,aal)
values ('6a000000-0000-4000-8000-000000000001','68000000-0000-4000-8000-000000000001','69000000-0000-4000-8000-000000000001','aal2');

select ok(not has_function_privilege('anon','public.staff_catalog_variants()','EXECUTE'),'Anon cannot list staff variants');
select ok(not has_function_privilege('anon','public.staff_categories()','EXECUTE'),'Anon cannot list staff categories');
select ok(not has_function_privilege('anon','public.create_catalog_variant(uuid,text,text,text,bigint,uuid)','EXECUTE'),'Anon cannot create variants');
select ok(not has_function_privilege('service_role','public.update_catalog_category(uuid,text,text,boolean)','EXECUTE'),'Service role is not an implicit catalog manager');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"68000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1","session_id":"6a000000-0000-4000-8000-000000000001"}',true);
select throws_ok('select * from public.staff_categories()','42501',null,'AAL1 cannot list categories');
select set_config('request.jwt.claims','{"sub":"68000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2","session_id":"6a000000-0000-4000-8000-000000000001"}',true);
select is((select count(*) from public.staff_catalog_variants()),15::bigint,'Catalog manager sees active and inactive variants');
select is((select count(*) from public.staff_categories()),6::bigint,'Catalog manager sees active and inactive categories');
select is((select count(*) from public.staff_product_categories()),11::bigint,'Catalog manager sees category assignments');
select lives_ok($$select public.create_catalog_variant('20000000-0000-4000-8000-000000000001','DEMO-DRESS-S-BLUE','S','blau',4590,'40000000-0000-4000-8000-000000000001')$$,'Manager creates a variant and inventory level atomically');
select lives_ok($$select public.update_catalog_variant((select id from public.staff_catalog_variants() where sku='DEMO-DRESS-S-BLUE'),'DEMO-DRESS-S-BLUE','S','blau',4690,true)$$,'Manager updates and activates a variant');
select lives_ok($$select public.create_catalog_category('demo-novetats','DEMO · Novetats')$$,'Manager creates an inactive category');
select lives_ok($$select public.update_catalog_category((select id from public.staff_categories() where slug='demo-novetats'),'demo-novetats','DEMO · Novetats',true)$$,'Manager activates a category');
select lives_ok($$select public.set_product_categories('20000000-0000-4000-8000-000000000001',array[(select id from public.staff_categories() where slug='demo-novetats')])$$,'Manager replaces product category assignments');
reset role;

select is((select price_minor from public.product_variants where sku='DEMO-DRESS-S-BLUE'),4690::bigint,'Variant changes persist');
select is((select count(*) from private.inventory_levels i join public.product_variants v on v.id=i.variant_id where v.sku='DEMO-DRESS-S-BLUE'),1::bigint,'New variant has one inventory level');
select is((select count(*) from public.product_categories where product_id='20000000-0000-4000-8000-000000000001'),1::bigint,'Assignments are replaced without duplicates');

select * from finish();
rollback;
