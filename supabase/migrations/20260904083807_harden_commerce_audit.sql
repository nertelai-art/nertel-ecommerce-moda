begin;

alter table private.reservation_requests add column request_hash text;
alter table private.checkout_requests add column request_hash text;
alter table private.stock_reservations
  add column sku text,
  add column product_name text,
  add column size text,
  add column color text,
  add column unit_price_minor bigint,
  add column currency text;

create or replace function private.snapshot_reservation_item()
returns trigger language plpgsql security definer set search_path=''
as $f$ begin
  select v.sku,p.name,v.size,v.color,v.price_minor,v.currency
  into new.sku,new.product_name,new.size,new.color,new.unit_price_minor,new.currency
  from public.product_variants v join public.products p on p.id=v.product_id
  where v.id=new.variant_id and v.is_active and p.status='published' and v.currency='EUR';
  if not found then raise exception 'variant unavailable' using errcode='P0002'; end if;
  return new;
end $f$;
revoke all on function private.snapshot_reservation_item() from public,anon,authenticated,service_role;
create trigger stock_reservations_snapshot before insert on private.stock_reservations
for each row execute function private.snapshot_reservation_item();

create or replace function private.freeze_order_snapshot()
returns trigger language plpgsql security definer set search_path=''
as $f$ begin
  select coalesce(sum(r.unit_price_minor::numeric*r.quantity),0)::bigint
  into new.amount_minor from private.stock_reservations r
  where r.checkout_session_id=new.checkout_session_id and r.status='active' and r.expires_at>now();
  new.currency='EUR';
  return new;
end $f$;
revoke all on function private.freeze_order_snapshot() from public,anon,authenticated,service_role;
create trigger orders_freeze_total before insert on private.orders
for each row execute function private.freeze_order_snapshot();

create or replace function private.freeze_order_item_snapshot()
returns trigger language plpgsql security definer set search_path=''
as $f$ declare snapshot private.stock_reservations%rowtype; begin
  select r.* into snapshot from private.stock_reservations r join private.orders o on o.checkout_session_id=r.checkout_session_id
  where o.id=new.order_id and r.variant_id=new.variant_id and r.status='active' order by r.id limit 1;
  if not found then raise exception 'reservation snapshot missing'; end if;
  new.sku=snapshot.sku; new.product_name=snapshot.product_name; new.size=snapshot.size; new.color=snapshot.color;
  new.unit_price_minor=snapshot.unit_price_minor; new.line_total_minor=snapshot.unit_price_minor*new.quantity; new.currency=snapshot.currency;
  return new;
end $f$;
revoke all on function private.freeze_order_item_snapshot() from public,anon,authenticated,service_role;
create trigger order_items_freeze_snapshot before insert on private.order_items
for each row execute function private.freeze_order_item_snapshot();

create or replace function private.freeze_payment_amount()
returns trigger language plpgsql security definer set search_path=''
as $f$ begin
  select amount_minor,currency into new.amount_minor,new.currency from private.orders where id=new.order_id;
  if not found then raise exception 'order not found'; end if;
  return new;
end $f$;
revoke all on function private.freeze_payment_amount() from public,anon,authenticated,service_role;
create trigger payment_attempts_freeze_amount before insert on private.payment_attempts
for each row execute function private.freeze_payment_amount();

create table private.commerce_rate_limits(
  rate_key text not null,
  operation text not null,
  window_start timestamptz not null,
  hits integer not null check(hits>0),
  primary key(rate_key,operation)
);
alter table private.commerce_rate_limits enable row level security;

create table private.storage_cleanup_queue(
  object_path text primary key,
  attempts integer not null default 0,
  last_error_at timestamptz,
  created_at timestamptz not null default now()
);
alter table private.storage_cleanup_queue enable row level security;

create or replace function public.queue_product_image_cleanup(object_path text)
returns void language plpgsql volatile security definer set search_path=''
as $f$ begin
  perform private.require_catalog_manager();
  if object_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$' then raise exception 'invalid object path'; end if;
  insert into private.storage_cleanup_queue(object_path) values(object_path) on conflict do nothing;
end $f$;
revoke all on function public.queue_product_image_cleanup(text) from public,anon,authenticated,service_role;
grant execute on function public.queue_product_image_cleanup(text) to authenticated;

create or replace function private.verify_product_image_metadata()
returns trigger language plpgsql security definer set search_path=''
as $f$ declare object_row storage.objects%rowtype; begin
  if split_part(new.object_path,'/',1)<>new.product_id::text then raise exception 'image product path mismatch'; end if;
  select * into object_row from storage.objects where bucket_id='product-images' and name=new.object_path;
  if not found or coalesce(object_row.metadata->>'mimetype','')<>new.mime_type
    or coalesce((object_row.metadata->>'size')::integer,0)<>new.byte_size then raise exception 'image metadata mismatch'; end if;
  return new;
end $f$;
revoke all on function private.verify_product_image_metadata() from public,anon,authenticated,service_role;
create trigger product_images_verify_metadata before insert on public.product_images
for each row execute function private.verify_product_image_metadata();

create or replace function private.consume_commerce_limit(input_rate_key text,input_operation text,max_hits integer,window_seconds integer)
returns void language plpgsql volatile security definer set search_path=''
as $f$ declare current_hits integer; begin
  if length(input_rate_key) not between 16 and 128 or input_operation not in ('reserve','checkout','cancel')
    or max_hits not between 1 and 100 or window_seconds not between 1 and 86400 then
    raise exception 'invalid rate limit'; end if;
  insert into private.commerce_rate_limits values(input_rate_key,input_operation,now(),1)
  on conflict on constraint commerce_rate_limits_pkey do update set
    window_start=case when private.commerce_rate_limits.window_start<=now()-make_interval(secs=>window_seconds) then now() else private.commerce_rate_limits.window_start end,
    hits=case when private.commerce_rate_limits.window_start<=now()-make_interval(secs=>window_seconds) then 1 else private.commerce_rate_limits.hits+1 end
  returning hits into current_hits;
  if current_hits>max_hits then raise exception 'rate limit exceeded' using errcode='P0001'; end if;
end $f$;
revoke all on function private.consume_commerce_limit(text,text,integer,integer) from public,anon,authenticated,service_role;

create or replace function public.server_reserve_cart(cart jsonb,request_key uuid,session_token uuid,actor_id uuid,rate_key text)
returns jsonb language plpgsql volatile security definer set search_path=''
as $f$ declare hash text:=encode(extensions.digest(cart::text,'sha256'),'hex'); result jsonb; begin
  perform private.consume_commerce_limit(rate_key,'reserve',10,60);
  if exists(select 1 from private.reservation_requests where reservation_requests.request_key=server_reserve_cart.request_key and request_hash is distinct from hash)
    then raise exception 'idempotency payload conflict' using errcode='23505'; end if;
  perform set_config('request.jwt.claim.sub',coalesce(actor_id::text,''),true);
  result:=public.reserve_cart(cart,request_key,session_token);
  update private.reservation_requests set request_hash=hash where reservation_requests.request_key=server_reserve_cart.request_key;
  return result-'sessionId';
end $f$;
revoke all on function public.server_reserve_cart(jsonb,uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.server_reserve_cart(jsonb,uuid,uuid,uuid,text) to service_role;
revoke all on function public.reserve_cart(jsonb,uuid,uuid) from anon,authenticated,service_role;

create or replace function public.server_create_pending_order(session_token uuid,request_key uuid,checkout_details jsonb,actor_id uuid,rate_key text)
returns jsonb language plpgsql volatile security definer set search_path=''
as $f$ declare normalized jsonb:=private.validate_checkout_details(checkout_details); hash text; result jsonb; begin
  hash:=encode(extensions.digest(normalized::text,'sha256'),'hex');
  perform private.consume_commerce_limit(rate_key,'checkout',5,300);
  if exists(select 1 from private.checkout_requests where checkout_requests.request_key=server_create_pending_order.request_key and request_hash is distinct from hash)
    then raise exception 'idempotency payload conflict' using errcode='23505'; end if;
  perform set_config('request.jwt.claim.sub',coalesce(actor_id::text,''),true);
  result:=public.create_pending_order(session_token,request_key,normalized);
  update private.checkout_requests set request_hash=hash where checkout_requests.request_key=server_create_pending_order.request_key;
  return result;
end $f$;
revoke all on function public.server_create_pending_order(uuid,uuid,jsonb,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.server_create_pending_order(uuid,uuid,jsonb,uuid,text) to service_role;
revoke all on function public.create_pending_order(uuid,uuid,jsonb) from anon,authenticated,service_role;

create or replace function public.server_current_pending_order(session_token uuid,actor_id uuid)
returns jsonb language plpgsql volatile security definer set search_path=''
as $f$ begin
  perform set_config('request.jwt.claim.sub',coalesce(actor_id::text,''),true);
  perform private.release_expired_reservations(1000);
  return public.current_pending_order(session_token);
end $f$;
revoke all on function public.server_current_pending_order(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.server_current_pending_order(uuid,uuid) to service_role;
revoke all on function public.current_pending_order(uuid) from anon,authenticated,service_role;

create or replace function public.server_quote_cart(cart jsonb)
returns jsonb language plpgsql volatile security definer set search_path=''
as $f$ begin
  perform private.release_expired_reservations(1000);
  return public.quote_cart(cart);
end $f$;
revoke all on function public.server_quote_cart(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.server_quote_cart(jsonb) to service_role;

create or replace function public.server_cancel_cart_reservation(session_token uuid,actor_id uuid,rate_key text)
returns boolean language plpgsql volatile security definer set search_path=''
as $f$ begin
  perform private.consume_commerce_limit(rate_key,'cancel',10,60);
  perform set_config('request.jwt.claim.sub',coalesce(actor_id::text,''),true);
  return public.cancel_cart_reservation(session_token);
end $f$;
revoke all on function public.server_cancel_cart_reservation(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.server_cancel_cart_reservation(uuid,uuid,text) to service_role;
revoke all on function public.cancel_cart_reservation(uuid) from anon,authenticated,service_role;

create or replace function private.maintenance_commerce()
returns void language plpgsql volatile security definer set search_path=''
as $f$ begin
  while private.release_expired_reservations(1000)>0 loop end loop;
  delete from private.commerce_rate_limits where window_start<now()-interval '1 day';
  delete from private.checkout_requests where created_at<now()-interval '90 days';
  delete from private.stock_reservations where status<>'active' and created_at<now()-interval '30 days';
  delete from private.reservation_requests r where created_at<now()-interval '30 days'
    and not exists(select 1 from private.stock_reservations s where s.request_key=r.request_key);
  update private.orders set email='deleted@example.invalid',shipping_address='{}'::jsonb,updated_at=now()
    where status in ('cancelled','expired') and updated_at<now()-interval '90 days' and email<>'deleted@example.invalid';
end $f$;
revoke all on function private.maintenance_commerce() from public,anon,authenticated,service_role;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('moda-commerce-maintenance','* * * * *',$$select private.maintenance_commerce()$$);

notify pgrst,'reload schema';
commit;
