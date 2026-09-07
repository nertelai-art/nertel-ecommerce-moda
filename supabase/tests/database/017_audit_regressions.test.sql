begin;
set search_path = public, extensions;
select no_plan();

select ok(not has_function_privilege('anon', 'public.quote_cart(jsonb)', 'EXECUTE'), 'Legacy quote is closed to anon');
select ok(not has_function_privilege('authenticated', 'public.quote_cart(jsonb)', 'EXECUTE'), 'Legacy quote is closed to authenticated clients');
select ok(not has_function_privilege('service_role', 'public.quote_cart(jsonb)', 'EXECUTE'), 'Backend must use the rate limited quote');
select ok(not has_function_privilege('anon', 'public.staff_snapshot(text,integer)', 'EXECUTE'), 'Anonymous users cannot request staff snapshots');
select ok(not (select prosecdef from pg_proc where oid = 'public.staff_snapshot(text,integer)'::regprocedure), 'Snapshot preserves caller authorization');
select ok(not (select prosecdef from pg_proc where oid = 'public.catalog_filters()'::regprocedure), 'Catalog filters preserve RLS');

insert into public.categories(slug, name, is_active)
select 'audit-category-' || i, 'Audit category ' || i, true from generate_series(1, 150) i;
insert into public.categories(slug, name, is_active) values ('audit-hidden-category', 'Hidden audit category', false);
insert into public.products(id, slug, name, status) values
  ('bd000000-0000-4000-8000-000000000001', 'audit-public-product', 'Audit public product', 'published'),
  ('bd000000-0000-4000-8000-000000000002', 'audit-draft-product', 'Audit draft product', 'draft');
insert into public.product_variants(product_id, sku, size, color, price_minor, currency, is_active)
select 'bd000000-0000-4000-8000-000000000001'::uuid, 'AUDIT-' || i, 'audit-size-' || i, 'audit-color-' || i, 100, 'EUR', true
from generate_series(1, 150) i;
insert into public.product_variants(product_id, sku, size, color, price_minor, currency, is_active) values
('bd000000-0000-4000-8000-000000000002', 'AUDIT-HIDDEN', 'hidden-size', 'hidden-color', 100, 'EUR', true);

set local role anon;
select throws_ok($$select public.quote_cart('[]'::jsonb)$$, '42501', null, 'Direct anonymous quote actually fails');
select is((select count(*)::integer from jsonb_array_elements(public.catalog_filters()->'categories') c where c->>'slug' like 'audit-category-%'), 150, 'All categories beyond the 100-row API cap are included');
select ok((public.catalog_filters()->'sizes') ? 'audit-size-150', 'Facets include variants beyond the first page');
select ok(not ((public.catalog_filters()->'sizes') ? 'hidden-size'), 'Draft variants are excluded');
select ok(not exists(select 1 from jsonb_array_elements(public.catalog_filters()->'categories') c where c->>'slug' = 'audit-hidden-category'), 'Inactive categories are excluded');
reset role;

insert into auth.users(id, email) values ('be000000-0000-4000-8000-000000000001', 'audit-staff@example.invalid');
insert into private.staff_permissions(user_id, permission) values ('be000000-0000-4000-8000-000000000001', 'catalog.manage');
update private.security_settings set require_staff_mfa = false;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"be000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}', true);
select is(jsonb_array_length(public.staff_snapshot('categories')), (select count(*)::integer from public.staff_categories()), 'Staff snapshot contains every row in one statement');
select throws_ok($$select public.staff_snapshot('orders')$$, '42501', null, 'Catalog permission does not grant order access');
select throws_ok($$select public.staff_snapshot('finance')$$, '42501', null, 'Catalog permission does not grant finance access');
select throws_ok($$select public.staff_snapshot('unknown')$$, '22023', null, 'Resource names are allowlisted');
reset role;
update private.security_settings set require_staff_mfa = true;
set local role authenticated;
select throws_ok($$select public.staff_snapshot('categories')$$, '42501', null, 'Snapshot cannot bypass staff MFA');
reset role;

update private.security_settings set require_staff_mfa = false;
insert into public.categories(slug, name, is_active)
select 'audit-overflow-' || i, 'Overflow ' || i, false from generate_series(1, 5001) i;
set local role authenticated;
select throws_ok($$select public.staff_snapshot('categories')$$, '54000', null, 'Oversized snapshots fail instead of returning partial totals');
reset role;
select * from finish();
rollback;
