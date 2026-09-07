begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select plan(21);

select has_table('private','checkout_sessions','Checkout sessions are private');
select has_table('private','stock_reservations','Reservations are private');
select ok(not has_table_privilege('anon','private.stock_reservations','SELECT'),'Anon cannot read reservation rows');
select ok(not has_function_privilege('anon','public.quote_cart(jsonb)','EXECUTE'),'Anon cannot bypass the rate-limited quote gateway');
select ok(not has_function_privilege('anon','public.reserve_cart(jsonb,uuid,uuid)','EXECUTE'),'Anon cannot bypass the server reservation gateway');
select ok(has_function_privilege('service_role','public.server_reserve_cart(jsonb,uuid,uuid,uuid,text)','EXECUTE'),'Only the backend role may reserve');
select ok(not has_function_privilege('service_role','public.reserve_cart(jsonb,uuid,uuid)','EXECUTE'),'Service role is not implicitly allowed');

update private.inventory_levels set on_hand=2,reserved=0
where variant_id='30000000-0000-4000-8000-000000000001' and location_id='40000000-0000-4000-8000-000000000001';

set local role service_role;
select is((public.server_quote_cart('[{"variantId":"30000000-0000-4000-8000-000000000001","quantity":1}]'::jsonb,'audit-quote-test-key')->>'totalMinor')::bigint,8990::bigint,'Quote uses the database price');
select is(public.server_quote_cart('[{"variantId":"30000000-0000-4000-8000-000000000001","quantity":1}]'::jsonb,'audit-quote-test-key')#>>'{items,0,name}','Vestit Alba','Quote returns public product data');
select throws_ok($$select public.server_quote_cart('[{"variantId":"30000000-0000-4000-8000-000000000001","quantity":1,"unitPriceMinor":1}]'::jsonb,'audit-quote-test-key')$$,'22023',null,'Injected prices are rejected');
select throws_ok($$select public.server_quote_cart('[{"variantId":"30000000-0000-4000-8000-000000000001","quantity":1},{"variantId":"30000000-0000-4000-8000-000000000001","quantity":1}]'::jsonb,'audit-quote-test-key')$$,'22023',null,'Duplicate variants are rejected');
reset role;
set local role service_role;
select lives_ok($$select public.server_reserve_cart('[{"variantId":"30000000-0000-4000-8000-000000000001","quantity":1}]'::jsonb,'81000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001',null,'aaaaaaaaaaaaaaaa')$$,'Guest reserves one unit');
select lives_ok($$select public.server_reserve_cart('[{"variantId":"30000000-0000-4000-8000-000000000001","quantity":1}]'::jsonb,'81000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001',null,'aaaaaaaaaaaaaaaa')$$,'Identical retry is idempotent');
select throws_ok($$select public.server_reserve_cart('[{"variantId":"30000000-0000-4000-8000-000000000001","quantity":2}]'::jsonb,'81000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001',null,'aaaaaaaaaaaaaaaa')$$,'23505',null,'A request key cannot be reused with another cart');
select throws_ok($$select public.server_reserve_cart('[{"variantId":"30000000-0000-4000-8000-000000000001","quantity":2}]'::jsonb,'81000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002',null,'bbbbbbbbbbbbbbbb')$$,'22003',null,'A second session cannot over-reserve stock');
reset role;
select is((select reserved from private.inventory_levels where variant_id='30000000-0000-4000-8000-000000000001' and location_id='40000000-0000-4000-8000-000000000001'),1,'Idempotent retry reserves stock only once');
set local role service_role;
select lives_ok($$select public.server_cancel_cart_reservation('82000000-0000-4000-8000-000000000001',null,'aaaaaaaaaaaaaaaa')$$,'Guest can cancel its reservation');
reset role;
select is((select reserved from private.inventory_levels where variant_id='30000000-0000-4000-8000-000000000001' and location_id='40000000-0000-4000-8000-000000000001'),0,'Cancellation releases stock immediately');
set local role service_role;
select lives_ok($$select public.server_reserve_cart('[{"variantId":"30000000-0000-4000-8000-000000000001","quantity":1}]'::jsonb,'81000000-0000-4000-8000-000000000003','82000000-0000-4000-8000-000000000001',null,'cccccccccccccccc')$$,'A cancelled session can reserve again');
reset role;
update private.stock_reservations set expires_at=now()-interval '1 minute' where checkout_session_id='82000000-0000-4000-8000-000000000001' and status='active';
update private.checkout_sessions set expires_at=now()-interval '1 minute' where id='82000000-0000-4000-8000-000000000001' and status='reserved';
select is(private.release_expired_reservations(100),1,'Expired reservation is released once');
select is((select reserved from private.inventory_levels where variant_id='30000000-0000-4000-8000-000000000001' and location_id='40000000-0000-4000-8000-000000000001'),0,'Released stock becomes available again');

select * from finish();
rollback;
