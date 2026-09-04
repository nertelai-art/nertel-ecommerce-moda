begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(21);

select has_table('private', 'orders', 'Orders are private');
select has_table('private', 'order_items', 'Order items are private');
select has_table('private', 'payment_attempts', 'Payment attempts are private');
select ok(not has_table_privilege('anon', 'private.orders', 'SELECT'), 'Anon cannot enumerate orders');
select ok(not has_function_privilege('anon', 'public.create_pending_order(uuid,uuid,jsonb)', 'EXECUTE'), 'Anon cannot bypass the checkout gateway');
select ok(has_function_privilege('service_role', 'public.server_create_pending_order(uuid,uuid,jsonb,uuid,text)', 'EXECUTE'), 'Backend role may create orders');

update private.inventory_levels set on_hand = 2, reserved = 0
where variant_id = '30000000-0000-4000-8000-000000000001'
  and location_id = '40000000-0000-4000-8000-000000000001';

set local role service_role;
select lives_ok(
  $$select public.server_reserve_cart('[{"variantId":"30000000-0000-4000-8000-000000000001","quantity":1}]', '83000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-000000000001',null,'dddddddddddddddd')$$,
  'Guest creates a reservation'
);
select throws_ok(
  $$select public.server_create_pending_order('84000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000001', '{"email":"client@example.test","recipient":"Client","line1":"Carrer 1","line2":"","city":"Barcelona","region":"Barcelona","postalCode":"08001","countryCode":"ES","amountMinor":1}',null,'eeeeeeeeeeeeeeee')$$,
  '22023', null, 'Client-supplied monetary fields are rejected'
);
reset role;
update public.product_variants set price_minor=5990 where id='30000000-0000-4000-8000-000000000001';
set local role service_role;
select is(
  (public.server_create_pending_order(
    '84000000-0000-4000-8000-000000000001',
    '85000000-0000-4000-8000-000000000001',
    '{"email":"CLIENT@EXAMPLE.TEST","recipient":" Client ","line1":" Carrer 1 ","line2":"","city":" Barcelona ","region":"Barcelona","postalCode":"08001","countryCode":"es"}',null,'eeeeeeeeeeeeeeee'
  )->>'amountMinor')::bigint,
  4990::bigint,
  'Order total is calculated from authoritative prices'
);
select lives_ok(
  $$select public.server_create_pending_order('84000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000001', '{"email":"client@example.test","recipient":"Client","line1":"Carrer 1","line2":"","city":"Barcelona","region":"Barcelona","postalCode":"08001","countryCode":"ES"}',null,'eeeeeeeeeeeeeeee')$$,
  'Identical request retry is idempotent'
);
select lives_ok(
  $$select public.server_create_pending_order('84000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000002', '{"email":"client@example.test","recipient":"Client","line1":"Carrer 1","line2":"","city":"Barcelona","region":"Barcelona","postalCode":"08001","countryCode":"ES"}',null,'ffffffffffffffff')$$,
  'A second request key still returns the session order'
);
reset role;

select is((select count(*) from private.orders where checkout_session_id = '84000000-0000-4000-8000-000000000001'), 1::bigint, 'Only one order exists per checkout session');
select is((select count(*) from private.payment_attempts), 1::bigint, 'Only one initial payment attempt exists');
select is((select amount_minor from private.payment_attempts limit 1), 4990::bigint, 'Payment attempt uses the reserved price snapshot');
select is((select count(*) from private.order_items), 1::bigint, 'Reservation becomes one immutable order line');
select is((select unit_price_minor from private.order_items limit 1), 4990::bigint, 'Order line snapshots the unit price');
select is((select email from private.orders limit 1), 'client@example.test', 'Email is normalized server-side');
select is((select shipping_address->>'recipient' from private.orders limit 1), 'Client', 'Address fields are normalized server-side');
select is((select status from private.checkout_sessions where id = '84000000-0000-4000-8000-000000000001'), 'converted', 'Checkout session is marked converted');

update private.stock_reservations set expires_at = now() - interval '1 minute' where status = 'active';
update private.checkout_sessions set expires_at = now() - interval '1 minute' where id = '84000000-0000-4000-8000-000000000001';
update private.orders set expires_at = now() - interval '1 minute' where checkout_session_id = '84000000-0000-4000-8000-000000000001';
select is(private.release_expired_reservations(100), 1, 'Expired order reservation releases stock');
select is((select status from private.orders limit 1), 'expired', 'Pending order expires with its reservation');

select * from finish();
rollback;
