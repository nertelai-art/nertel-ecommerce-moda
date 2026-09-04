begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

insert into auth.users(id,email) values
  ('54000000-0000-4000-8000-000000000001','inventory-staff@example.invalid'),
  ('54000000-0000-4000-8000-000000000002','inventory-customer@example.invalid');
insert into private.staff_permissions(user_id,permission) values
  ('54000000-0000-4000-8000-000000000001','inventory.manage');
insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at)
values ('55000000-0000-4000-8000-000000000001','54000000-0000-4000-8000-000000000001','totp','verified',now(),now());
insert into auth.sessions(id,user_id,factor_id,aal)
values ('56000000-0000-4000-8000-000000000001','54000000-0000-4000-8000-000000000001','55000000-0000-4000-8000-000000000001','aal2');

select ok(not has_function_privilege('anon','public.adjust_inventory(uuid,uuid,integer,text,text)','EXECUTE'), 'Anon cannot adjust inventory');
select ok(not has_function_privilege('service_role','public.adjust_inventory(uuid,uuid,integer,text,text)','EXECUTE'), 'Service role has no universal inventory writer');
select ok(not has_function_privilege('anon','private.adjust_inventory(uuid,uuid,integer,text,text)','EXECUTE'), 'Anon cannot bypass the public inventory RPC');
select ok(not has_function_privilege('anon','public.staff_inventory()','EXECUTE'), 'Anon cannot list staff inventory');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"54000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',true);
select throws_ok($$select public.adjust_inventory('30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',5,'Entrada','test-denied')$$,'42501',null,'Customer cannot adjust stock');
select throws_ok('select * from public.staff_inventory()','42501',null,'Customer cannot list staff inventory');
select set_config('request.jwt.claims','{"sub":"54000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1","session_id":"56000000-0000-4000-8000-000000000001"}',true);
select throws_ok($$select public.adjust_inventory('30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',5,'Entrada','test-aal1')$$,'42501',null,'AAL1 staff cannot adjust stock');
select set_config('request.jwt.claims','{"sub":"54000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2","session_id":"56000000-0000-4000-8000-000000000001"}',true);
select is(public.adjust_inventory('30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',5,'Entrada de prova','test-adjust-1'),13,'Authorized adjustment returns new stock');
select is((select count(*) from public.staff_inventory()),14::bigint,'Authorized staff can list inventory');
select is(public.adjust_inventory('30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',5,'Entrada de prova','test-adjust-1'),13,'Repeated key is idempotent');
reset role;
select is((select count(*) from private.stock_movements where reference_key='test-adjust-1'),1::bigint,'Idempotent adjustment creates one audit row');
select is((select actor_id from private.stock_movements where reference_key='test-adjust-1'),'54000000-0000-4000-8000-000000000001'::uuid,'Audit row records the actor');
set local role authenticated;
select throws_ok($$select public.adjust_inventory('30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',-14,'Sortida excessiva','test-adjust-2')$$,'22003',null,'Stock cannot become negative');
reset role;
select is((select on_hand from private.inventory_levels where variant_id='30000000-0000-4000-8000-000000000001' and location_id='40000000-0000-4000-8000-000000000001'),13,'Failed adjustment leaves stock unchanged');

select * from finish();
rollback;
