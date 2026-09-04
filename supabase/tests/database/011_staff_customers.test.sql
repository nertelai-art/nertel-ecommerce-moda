begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();

update private.security_settings set require_staff_mfa = true where singleton;
insert into auth.users(id,email) values
  ('9a000000-0000-4000-8000-000000000001','customers-staff@example.invalid'),
  ('9a000000-0000-4000-8000-000000000002','orders-only@example.invalid');
insert into private.staff_permissions(user_id,permission) values
  ('9a000000-0000-4000-8000-000000000001','customers.read'),
  ('9a000000-0000-4000-8000-000000000002','orders.fulfill');
insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at) values
  ('9b000000-0000-4000-8000-000000000001','9a000000-0000-4000-8000-000000000001','totp','verified',now(),now()),
  ('9b000000-0000-4000-8000-000000000002','9a000000-0000-4000-8000-000000000002','totp','verified',now(),now());
insert into auth.sessions(id,user_id,factor_id,aal) values
  ('9c000000-0000-4000-8000-000000000001','9a000000-0000-4000-8000-000000000001','9b000000-0000-4000-8000-000000000001','aal2'),
  ('9c000000-0000-4000-8000-000000000002','9a000000-0000-4000-8000-000000000002','9b000000-0000-4000-8000-000000000002','aal2');

select ok(not has_function_privilege('anon','public.staff_customers()','EXECUTE'),'Anon cannot list customers');
select ok(not has_function_privilege('service_role','public.staff_customers()','EXECUTE'),'Service role cannot bypass customer authorization');
select ok(not (select prosecdef from pg_proc where oid='public.staff_customers()'::regprocedure),'Public customer RPC is security invoker');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"9a000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2","session_id":"9c000000-0000-4000-8000-000000000002"}',true);
select throws_ok('select * from public.staff_customers()','42501',null,'Order fulfillment permission cannot read the customer directory');
select set_config('request.jwt.claims','{"sub":"9a000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1","session_id":"9c000000-0000-4000-8000-000000000001"}',true);
select throws_ok('select * from public.staff_customers()','42501',null,'AAL1 cannot list customers when MFA policy is enabled');
select set_config('request.jwt.claims','{"sub":"9a000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2","session_id":"9c000000-0000-4000-8000-000000000001"}',true);
select lives_ok('select * from public.staff_customers()','Authorized staff can list customers');
select ok(not exists(select 1 from public.staff_customers() where email='deleted@example.invalid'),'Anonymized customers are excluded');
select ok(not exists(select 1 from public.staff_customers() c cross join lateral jsonb_object_keys(to_jsonb(c)) key where key in ('customer_id','user_id','encrypted_password')),'Customer RPC excludes authentication identifiers and secrets');

select * from finish();
rollback;
