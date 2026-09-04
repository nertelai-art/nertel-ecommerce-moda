begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();

update private.security_settings set require_staff_mfa = true where singleton;
insert into auth.users(id,email) values
  ('8a000000-0000-4000-8000-000000000001','orders-staff@example.invalid'),
  ('8a000000-0000-4000-8000-000000000002','limited-staff@example.invalid');
insert into private.staff_permissions(user_id,permission) values
  ('8a000000-0000-4000-8000-000000000001','orders.fulfill'),
  ('8a000000-0000-4000-8000-000000000001','customers.read'),
  ('8a000000-0000-4000-8000-000000000002','orders.fulfill');
insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at) values
  ('8b000000-0000-4000-8000-000000000001','8a000000-0000-4000-8000-000000000001','totp','verified',now(),now()),
  ('8b000000-0000-4000-8000-000000000002','8a000000-0000-4000-8000-000000000002','totp','verified',now(),now());
insert into auth.sessions(id,user_id,factor_id,aal) values
  ('8c000000-0000-4000-8000-000000000001','8a000000-0000-4000-8000-000000000001','8b000000-0000-4000-8000-000000000001','aal2'),
  ('8c000000-0000-4000-8000-000000000002','8a000000-0000-4000-8000-000000000002','8b000000-0000-4000-8000-000000000002','aal2');

select ok(not has_function_privilege('anon','public.staff_orders()','EXECUTE'),'Anon cannot list orders');
select ok(not has_function_privilege('service_role','public.staff_orders()','EXECUTE'),'Service role cannot bypass staff order authorization');
select ok(not (select prosecdef from pg_proc where oid='public.staff_orders()'::regprocedure),'Public order RPC is security invoker');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"8a000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2","session_id":"8c000000-0000-4000-8000-000000000002"}',true);
select throws_ok('select * from public.staff_orders()','42501',null,'Order permission alone cannot expose customer data');
select set_config('request.jwt.claims','{"sub":"8a000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1","session_id":"8c000000-0000-4000-8000-000000000001"}',true);
select throws_ok('select * from public.staff_orders()','42501',null,'AAL1 cannot list orders when MFA policy is enabled');
select set_config('request.jwt.claims','{"sub":"8a000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2","session_id":"8c000000-0000-4000-8000-000000000001"}',true);
select lives_ok('select * from public.staff_orders()','Authorized fulfillment staff can list orders');
select ok(
  not exists(
    select 1
    from public.staff_orders() o
    cross join lateral jsonb_object_keys(to_jsonb(o)) key
    where key in ('checkout_session_id','customer_id','idempotency_key','provider_reference')
  ),
  'Order RPC excludes internal and provider identifiers'
);

select * from finish();
rollback;
