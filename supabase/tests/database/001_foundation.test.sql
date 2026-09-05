begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

-- Fixed local fixture identities, no password and no login-capable accounts.
insert into auth.users (id, email) values
  ('50000000-0000-4000-8000-000000000001', 'customer-a@example.invalid'),
  ('50000000-0000-4000-8000-000000000002', 'customer-b@example.invalid');
insert into public.profiles (id, display_name) values
  ('50000000-0000-4000-8000-000000000002', 'Customer B');
insert into public.addresses (id, customer_id, recipient, line1, city, postal_code, country_code) values
  ('60000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', 'B', 'Test 2', 'Test', '00000', 'ES');

select is((select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname in ('public', 'private') and c.relkind = 'r' and not c.relrowsecurity), 0::bigint, 'Every application table has RLS');
select ok(not has_table_privilege('authenticated', 'private.staff_permissions', 'SELECT'), 'Private permission table inaccessible to customers');
select ok(not has_schema_privilege('service_role', 'private', 'USAGE'), 'No universal service-role access to operational data');
select ok(not has_table_privilege('anon', 'public.products', 'TRUNCATE'), 'Anon cannot bypass RLS via truncate');
select ok(not has_table_privilege('authenticated', 'public.products', 'INSERT'), 'Customer cannot insert catalog entries');

set local role anon;
select is((select count(*) from public.products), 8::bigint, 'Anon sees published products only');
select is((select count(*) from public.categories), 5::bigint, 'Anon sees active categories only');
select is((select count(*) from public.product_variants), 14::bigint, 'Inactive and draft variants are hidden');
select is((select count(*) from public.product_categories), 9::bigint, 'Category links do not leak hidden products/categories');
select throws_ok('select * from public.profiles', '42501', null, 'Anon cannot read profiles');
select throws_ok('select * from public.addresses', '42501', null, 'Anon cannot read addresses');
select throws_ok('select * from private.inventory_levels', '42501', null, 'Anon cannot read internal inventory');
select throws_ok($$insert into public.products (slug, name) values ('attack', 'Attack')$$, '42501', null, 'Anon catalog writes denied');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"50000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1","user_metadata":{"role":"admin"}}', true);
select is((select count(*) from public.profiles), 0::bigint, 'Customer A cannot see B profile');
select is((select count(*) from public.addresses), 0::bigint, 'Customer A cannot see B address');
select lives_ok($$insert into public.profiles(id, display_name) values ('50000000-0000-4000-8000-000000000001', 'A')$$, 'Customer can create own profile');
select throws_ok($$insert into public.profiles(id, display_name) values ('50000000-0000-4000-8000-000000000003', 'Other')$$, '42501', null, 'Cannot create someone else profile');
select lives_ok($$update public.profiles set display_name = 'Updated A' where id = '50000000-0000-4000-8000-000000000001'$$, 'Customer can update own display name');
with changed as (update public.profiles set display_name = 'Hijacked' where id = '50000000-0000-4000-8000-000000000002' returning id) select is((select count(*) from changed), 0::bigint, 'Cannot update B profile');
select throws_ok($$update public.profiles set id = '50000000-0000-4000-8000-000000000002'$$, '42501', null, 'Cannot transfer profile ownership');
select throws_ok($$update public.profiles set created_at = now()$$, '42501', null, 'Cannot overwrite server timestamp');
select lives_ok($$insert into public.addresses(customer_id, recipient, line1, city, postal_code, country_code) values ('50000000-0000-4000-8000-000000000001', 'A', 'Test 1', 'Test', '00000', 'ES')$$, 'Customer can create own address');
select throws_ok($$insert into public.addresses(customer_id, recipient, line1, city, postal_code, country_code) values ('50000000-0000-4000-8000-000000000002', 'A', 'Test 1', 'Test', '00000', 'ES')$$, '42501', null, 'Cannot create address for B');
select throws_ok($$update public.addresses set customer_id = '50000000-0000-4000-8000-000000000002'$$, '42501', null, 'Cannot transfer address ownership');
with changed as (update public.addresses set city = 'Hijacked' where customer_id = '50000000-0000-4000-8000-000000000002' returning id) select is((select count(*) from changed), 0::bigint, 'Cannot update B address');
with removed as (delete from public.addresses where customer_id = '50000000-0000-4000-8000-000000000002' returning id) select is((select count(*) from removed), 0::bigint, 'Cannot delete B address');
select is((select count(*) from public.products), 8::bigint, 'Fake admin user_metadata does not unlock drafts');
select throws_ok('select * from private.staff_permissions', '42501', null, 'Fake admin cannot read staff permissions');
select throws_ok($$insert into private.staff_permissions(user_id, permission) values ('50000000-0000-4000-8000-000000000001', 'staff.manage')$$, '42501', null, 'Customer cannot grant themselves permissions');
select throws_ok($$update public.product_variants set price_minor = 1$$, '42501', null, 'Customer cannot alter price');
select throws_ok($$update private.inventory_levels set on_hand = 100$$, '42501', null, 'Customer cannot alter inventory');
reset role;

select throws_ok($$update public.product_variants set price_minor = -1$$, '23514', null, 'Database rejects negative price');
select throws_ok($$update public.product_variants set price_minor = 9007199254740992$$, '23514', null, 'Database rejects JS-unsafe price');
update private.inventory_levels set on_hand = 0, reserved = 0 where variant_id = '30000000-0000-4000-8000-000000000001' and location_id = '40000000-0000-4000-8000-000000000001';
select throws_ok($$update private.inventory_levels set reserved = 1$$, '23514', null, 'Cannot reserve more than physical stock');
select throws_ok($$update private.inventory_levels set on_hand = -1$$, '23514', null, 'Physical stock cannot be negative');
select throws_ok($$insert into public.product_variants(product_id, sku, size, color, price_minor, currency) values ('20000000-0000-4000-8000-000000000001', 'ALBA-M-SORRA', 'XL', 'blue', 100, 'EUR')$$, '23505', null, 'SKU remains unique');
select throws_ok($$delete from public.products where id = '20000000-0000-4000-8000-000000000001'$$, '23503', null, 'Deleting parent does not cascade commercial variants');
select throws_ok($$update public.addresses set country_code = 'Spain'$$, '23514', null, 'Country code shape validated');

-- Defaults must remain closed on future tables, including hosted deployments.
create table public.permission_probe(id integer);
alter table public.permission_probe enable row level security;
select ok(not has_table_privilege('anon', 'public.permission_probe', 'SELECT'), 'New tables do not auto-grant anon');
select ok(not has_table_privilege('authenticated', 'public.permission_probe', 'INSERT'), 'New tables do not auto-grant writes');
select ok(not has_table_privilege('service_role', 'public.permission_probe', 'SELECT'), 'New tables do not auto-grant service role');

create function public.permission_function_probe() returns integer language sql security invoker set search_path = '' as 'select 1';
select ok(not has_function_privilege('anon', 'public.permission_function_probe()', 'EXECUTE'), 'Future functions are not executable by anon');
select ok(not has_function_privilege('authenticated', 'public.permission_function_probe()', 'EXECUTE'), 'Future functions are not executable by customers');
select ok(not has_schema_privilege('authenticated', 'public', 'CREATE'), 'Customers cannot create database objects');

select * from finish();
rollback;
