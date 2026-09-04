-- Four fictitious orders for LOCAL UI development only. Never seed production.
insert into private.checkout_sessions (id, status, expires_at, created_at) values
  ('90000000-0000-4000-8000-000000000001', 'converted', now() + interval '7 days', now() - interval '18 minutes'),
  ('90000000-0000-4000-8000-000000000002', 'converted', now() + interval '7 days', now() - interval '1 day'),
  ('90000000-0000-4000-8000-000000000003', 'cancelled', now() + interval '7 days', now() - interval '3 days'),
  ('90000000-0000-4000-8000-000000000004', 'expired', now() - interval '1 day', now() - interval '5 days');

insert into private.reservation_requests (request_key, checkout_session_id) values
  ('91000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001'),
  ('91000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-000000000002'),
  ('91000000-0000-4000-8000-000000000003', '90000000-0000-4000-8000-000000000003'),
  ('91000000-0000-4000-8000-000000000004', '90000000-0000-4000-8000-000000000004');

insert into private.stock_reservations
  (id, checkout_session_id, request_key, variant_id, location_id, quantity, status, expires_at) values
  ('92000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000001', 1, 'active', now() + interval '7 days'),
  ('92000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000014', '40000000-0000-4000-8000-000000000001', 1, 'active', now() + interval '7 days'),
  ('92000000-0000-4000-8000-000000000003', '90000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000001', 1, 'active', now() + interval '7 days'),
  ('92000000-0000-4000-8000-000000000004', '90000000-0000-4000-8000-000000000003', '91000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000012', '40000000-0000-4000-8000-000000000001', 2, 'active', now() + interval '7 days'),
  ('92000000-0000-4000-8000-000000000005', '90000000-0000-4000-8000-000000000004', '91000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000015', '40000000-0000-4000-8000-000000000001', 1, 'active', now() + interval '7 days');

insert into private.orders
  (id, checkout_session_id, status, email, shipping_address, amount_minor, currency, expires_at, created_at, updated_at) values
  ('93000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001', 'pending_payment', 'laia@example.invalid', '{"recipient":"Laia Puig","line1":"Carrer de la Marina, 42","line2":"2n 1a","city":"Barcelona","region":"Barcelona","postalCode":"08005","countryCode":"ES"}', 0, 'EUR', now() + interval '7 days', now() - interval '18 minutes', now() - interval '18 minutes'),
  ('93000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-000000000002', 'pending_payment', 'jordi@example.invalid', '{"recipient":"Jordi Serra","line1":"Carrer Major, 18","line2":"","city":"Girona","region":"Girona","postalCode":"17001","countryCode":"ES"}', 0, 'EUR', now() + interval '7 days', now() - interval '1 day', now() - interval '1 day'),
  ('93000000-0000-4000-8000-000000000003', '90000000-0000-4000-8000-000000000003', 'pending_payment', 'emma@example.invalid', '{"recipient":"Emma Vidal","line1":"Plaça del Mercat, 7","line2":"3r","city":"Tarragona","region":"Tarragona","postalCode":"43001","countryCode":"ES"}', 0, 'EUR', now() + interval '7 days', now() - interval '3 days', now() - interval '3 days'),
  ('93000000-0000-4000-8000-000000000004', '90000000-0000-4000-8000-000000000004', 'pending_payment', 'nil@example.invalid', '{"recipient":"Nil Costa","line1":"Avinguda del Port, 21","line2":"","city":"València","region":"València","postalCode":"46021","countryCode":"ES"}', 0, 'EUR', now() + interval '7 days', now() - interval '5 days', now() - interval '5 days');

insert into private.order_items
  (id, order_id, variant_id, sku, product_name, size, color, unit_price_minor, quantity, line_total_minor, currency) values
  ('94000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', '', '', '', '', 0, 1, 0, 'EUR'),
  ('94000000-0000-4000-8000-000000000002', '93000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000014', '', '', '', '', 0, 1, 0, 'EUR'),
  ('94000000-0000-4000-8000-000000000003', '93000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000008', '', '', '', '', 0, 1, 0, 'EUR'),
  ('94000000-0000-4000-8000-000000000004', '93000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000012', '', '', '', '', 0, 2, 0, 'EUR'),
  ('94000000-0000-4000-8000-000000000005', '93000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000015', '', '', '', '', 0, 1, 0, 'EUR');

insert into private.checkout_requests (request_key, checkout_session_id, order_id) values
  ('95000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000001'),
  ('95000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-000000000002', '93000000-0000-4000-8000-000000000002'),
  ('95000000-0000-4000-8000-000000000003', '90000000-0000-4000-8000-000000000003', '93000000-0000-4000-8000-000000000003'),
  ('95000000-0000-4000-8000-000000000004', '90000000-0000-4000-8000-000000000004', '93000000-0000-4000-8000-000000000004');

insert into private.payment_attempts
  (id, order_id, idempotency_key, status, amount_minor, currency, created_at, updated_at) values
  ('96000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000001', 'requires_provider', 0, 'EUR', now() - interval '18 minutes', now() - interval '18 minutes'),
  ('96000000-0000-4000-8000-000000000002', '93000000-0000-4000-8000-000000000002', '95000000-0000-4000-8000-000000000002', 'succeeded', 0, 'EUR', now() - interval '1 day', now() - interval '1 day'),
  ('96000000-0000-4000-8000-000000000003', '93000000-0000-4000-8000-000000000003', '95000000-0000-4000-8000-000000000003', 'cancelled', 0, 'EUR', now() - interval '3 days', now() - interval '3 days'),
  ('96000000-0000-4000-8000-000000000004', '93000000-0000-4000-8000-000000000004', '95000000-0000-4000-8000-000000000004', 'cancelled', 0, 'EUR', now() - interval '5 days', now() - interval '5 days');

update private.orders set status = 'paid' where id = '93000000-0000-4000-8000-000000000002';
update private.orders set status = 'cancelled' where id = '93000000-0000-4000-8000-000000000003';
update private.orders set status = 'expired' where id = '93000000-0000-4000-8000-000000000004';
update private.stock_reservations set status = 'converted' where checkout_session_id in ('90000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-000000000003');
update private.stock_reservations set status = 'released' where checkout_session_id = '90000000-0000-4000-8000-000000000004';
update private.inventory_levels set reserved = reserved + 1 where variant_id in ('30000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000014') and location_id = '40000000-0000-4000-8000-000000000001';
