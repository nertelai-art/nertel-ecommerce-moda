begin;

create table private.orders (
  id uuid primary key default gen_random_uuid(),
  checkout_session_id uuid not null unique references private.checkout_sessions(id) on delete restrict,
  customer_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'paid', 'cancelled', 'expired')),
  email text not null check (length(email) between 3 and 320),
  shipping_address jsonb not null check (jsonb_typeof(shipping_address) = 'object'),
  amount_minor bigint not null check (amount_minor between 0 and 9007199254740991),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table private.orders enable row level security;
create index orders_customer_idx on private.orders(customer_id, created_at desc) where customer_id is not null;
create index orders_pending_expiry_idx on private.orders(expires_at) where status = 'pending_payment';

create table private.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references private.orders(id) on delete restrict,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  sku text not null,
  product_name text not null,
  size text not null,
  color text not null,
  unit_price_minor bigint not null check (unit_price_minor between 0 and 9007199254740991),
  quantity integer not null check (quantity between 1 and 99),
  line_total_minor bigint not null check (line_total_minor between 0 and 9007199254740991),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  unique(order_id, variant_id)
);
alter table private.order_items enable row level security;

create table private.checkout_requests (
  request_key uuid primary key,
  checkout_session_id uuid not null references private.checkout_sessions(id) on delete restrict,
  order_id uuid not null references private.orders(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table private.checkout_requests enable row level security;

create table private.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references private.orders(id) on delete restrict,
  idempotency_key uuid not null unique,
  provider text check (provider in ('stripe')),
  provider_reference text unique,
  status text not null default 'requires_provider' check (status in ('requires_provider', 'processing', 'succeeded', 'failed', 'cancelled')),
  amount_minor bigint not null check (amount_minor between 0 and 9007199254740991),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table private.payment_attempts enable row level security;
create index payment_attempts_order_idx on private.payment_attempts(order_id, created_at desc);

create or replace function private.prevent_converted_checkout_reopen()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if old.status = 'converted' and new.status = 'reserved' then
    raise exception 'converted checkout cannot be reopened' using errcode = '55000';
  end if;
  return new;
end
$function$;
revoke all on function private.prevent_converted_checkout_reopen() from public, anon, authenticated, service_role;
create trigger checkout_sessions_no_reopen
before update of status on private.checkout_sessions
for each row execute function private.prevent_converted_checkout_reopen();

create or replace function private.validate_checkout_details(details jsonb)
returns jsonb
language plpgsql
immutable
security invoker
set search_path = ''
as $function$
declare
  normalized jsonb;
begin
  if jsonb_typeof(details) <> 'object'
    or (select array_agg(key order by key) from jsonb_object_keys(details) key)
      <> array['city', 'countryCode', 'email', 'line1', 'line2', 'postalCode', 'recipient', 'region']
    or jsonb_typeof(details->'email') <> 'string'
    or jsonb_typeof(details->'recipient') <> 'string'
    or jsonb_typeof(details->'line1') <> 'string'
    or jsonb_typeof(details->'line2') <> 'string'
    or jsonb_typeof(details->'city') <> 'string'
    or jsonb_typeof(details->'region') <> 'string'
    or jsonb_typeof(details->'postalCode') <> 'string'
    or jsonb_typeof(details->'countryCode') <> 'string'
  then
    raise exception 'invalid checkout details' using errcode = '22023';
  end if;

  normalized := jsonb_build_object(
    'email', lower(btrim(details->>'email')),
    'recipient', btrim(details->>'recipient'),
    'line1', btrim(details->>'line1'),
    'line2', btrim(details->>'line2'),
    'city', btrim(details->>'city'),
    'region', btrim(details->>'region'),
    'postalCode', btrim(details->>'postalCode'),
    'countryCode', upper(btrim(details->>'countryCode'))
  );

  if length(normalized->>'email') not between 3 and 320
    or normalized->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    or length(normalized->>'recipient') not between 1 and 120
    or length(normalized->>'line1') not between 1 and 200
    or length(normalized->>'line2') > 200
    or length(normalized->>'city') not between 1 and 120
    or length(normalized->>'region') > 120
    or length(normalized->>'postalCode') not between 1 and 32
    or normalized->>'countryCode' !~ '^[A-Z]{2}$'
  then
    raise exception 'invalid checkout details' using errcode = '22023';
  end if;

  return normalized;
end
$function$;
revoke all on function private.validate_checkout_details(jsonb) from public, anon, authenticated, service_role;

create or replace function private.pending_order_result(target_order uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select jsonb_build_object(
    'orderId', o.id,
    'paymentAttemptId', p.id,
    'status', o.status,
    'paymentStatus', p.status,
    'amountMinor', o.amount_minor,
    'currency', o.currency,
    'expiresAt', o.expires_at
  )
  from private.orders o
  join private.payment_attempts p on p.order_id = o.id
  where o.id = target_order
  order by p.created_at
  limit 1
$function$;
revoke all on function private.pending_order_result(uuid) from public, anon, authenticated, service_role;

create or replace function public.create_pending_order(
  session_token uuid,
  request_key uuid,
  checkout_details jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  actor uuid := auth.uid();
  session_row private.checkout_sessions%rowtype;
  existing_order uuid;
  normalized jsonb;
  new_order uuid;
  total numeric := 0;
  held record;
begin
  normalized := private.validate_checkout_details(checkout_details);
  perform private.release_expired_reservations(500);

  select * into session_row
  from private.checkout_sessions
  where id = session_token
  for update;

  if not found then
    raise exception 'checkout session not found' using errcode = 'P0002';
  end if;
  if session_row.user_id is distinct from actor then
    raise exception 'session ownership mismatch' using errcode = '42501';
  end if;

  select r.order_id into existing_order
  from private.checkout_requests r
  where r.request_key = create_pending_order.request_key;
  if found then
    if not exists (
      select 1 from private.checkout_requests r
      where r.request_key = create_pending_order.request_key
        and r.checkout_session_id = session_token
    ) then
      raise exception 'request key conflict' using errcode = '23505';
    end if;
    return private.pending_order_result(existing_order);
  end if;

  select id into existing_order
  from private.orders
  where checkout_session_id = session_token;
  if found then
    insert into private.checkout_requests(request_key, checkout_session_id, order_id)
    values(request_key, session_token, existing_order);
    return private.pending_order_result(existing_order);
  end if;

  if session_row.status <> 'reserved' or session_row.expires_at <= now() then
    raise exception 'reservation unavailable' using errcode = '22003';
  end if;
  if not exists (
    select 1 from private.stock_reservations
    where checkout_session_id = session_token and status = 'active' and expires_at > now()
  ) then
    raise exception 'reservation unavailable' using errcode = '22003';
  end if;

  for held in
    select r.variant_id, r.quantity, v.sku, v.size, v.color, v.price_minor, v.currency, p.name
    from private.stock_reservations r
    join public.product_variants v on v.id = r.variant_id
    join public.products p on p.id = v.product_id
    where r.checkout_session_id = session_token and r.status = 'active' and r.expires_at > now()
    order by r.variant_id
    for update of r, v
  loop
    if held.currency <> 'EUR' then
      raise exception 'unsupported currency' using errcode = '22023';
    end if;
    total := total + held.price_minor::numeric * held.quantity;
    if total > 9007199254740991 then
      raise exception 'order total too large' using errcode = '22003';
    end if;
  end loop;

  insert into private.orders(
    checkout_session_id, customer_id, email, shipping_address, amount_minor, currency, expires_at
  ) values (
    session_token,
    actor,
    normalized->>'email',
    normalized - 'email',
    total::bigint,
    'EUR',
    session_row.expires_at
  ) returning id into new_order;

  insert into private.order_items(
    order_id, variant_id, sku, product_name, size, color, unit_price_minor,
    quantity, line_total_minor, currency
  )
  select new_order, r.variant_id, v.sku, p.name, v.size, v.color, v.price_minor,
    r.quantity, v.price_minor * r.quantity, v.currency
  from private.stock_reservations r
  join public.product_variants v on v.id = r.variant_id
  join public.products p on p.id = v.product_id
  where r.checkout_session_id = session_token and r.status = 'active' and r.expires_at > now();

  insert into private.checkout_requests(request_key, checkout_session_id, order_id)
  values(request_key, session_token, new_order);

  insert into private.payment_attempts(order_id, idempotency_key, amount_minor, currency)
  values(new_order, request_key, total::bigint, 'EUR');

  update private.checkout_sessions
  set status = 'converted', updated_at = now()
  where id = session_token;

  return private.pending_order_result(new_order);
end
$function$;

revoke all on function public.create_pending_order(uuid, uuid, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.create_pending_order(uuid, uuid, jsonb) to anon, authenticated;

create or replace function public.current_pending_order(session_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  actor uuid := auth.uid();
  session_owner uuid;
  target_order uuid;
begin
  select user_id into session_owner
  from private.checkout_sessions
  where id = session_token;
  if not found then return null; end if;
  if session_owner is distinct from actor then
    raise exception 'session ownership mismatch' using errcode = '42501';
  end if;
  select id into target_order
  from private.orders
  where checkout_session_id = session_token;
  if not found then return null; end if;
  return private.pending_order_result(target_order);
end
$function$;
revoke all on function public.current_pending_order(uuid) from public, anon, authenticated, service_role;
grant execute on function public.current_pending_order(uuid) to anon, authenticated;

create or replace function public.cancel_cart_reservation(session_token uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  actor uuid := auth.uid();
  session_row private.checkout_sessions%rowtype;
  held record;
begin
  select * into session_row
  from private.checkout_sessions
  where id = session_token
  for update;
  if not found then return false; end if;
  if session_row.user_id is distinct from actor then
    raise exception 'session ownership mismatch' using errcode = '42501';
  end if;

  for held in
    select * from private.stock_reservations
    where checkout_session_id = session_token and status = 'active'
    order by variant_id
    for update
  loop
    update private.inventory_levels
    set reserved = reserved - held.quantity
    where variant_id = held.variant_id and location_id = held.location_id and reserved >= held.quantity;
    if not found then raise exception 'reservation invariant violated'; end if;
    update private.stock_reservations set status = 'released' where id = held.id;
  end loop;

  update private.orders
  set status = 'cancelled', updated_at = now()
  where checkout_session_id = session_token and status = 'pending_payment';
  update private.payment_attempts p
  set status = 'cancelled', updated_at = now()
  where status = 'requires_provider'
    and exists (
      select 1 from private.orders o
      where o.id = p.order_id and o.checkout_session_id = session_token
    );
  update private.checkout_sessions
  set status = 'cancelled', expires_at = null, updated_at = now()
  where id = session_token;
  return true;
end
$function$;
revoke all on function public.cancel_cart_reservation(uuid) from public, anon, authenticated, service_role;
grant execute on function public.cancel_cart_reservation(uuid) to anon, authenticated;

create or replace function private.release_expired_reservations(batch_size integer default 500)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  released_count integer := 0;
  held record;
begin
  if batch_size not between 1 and 1000 then
    raise exception 'invalid batch size' using errcode = '22023';
  end if;
  for held in
    select r.id, r.variant_id, r.location_id, r.quantity, r.checkout_session_id
    from private.stock_reservations r
    where r.status = 'active' and r.expires_at <= now()
    order by r.expires_at, r.id
    for update skip locked
    limit batch_size
  loop
    update private.inventory_levels
    set reserved = reserved - held.quantity
    where variant_id = held.variant_id and location_id = held.location_id and reserved >= held.quantity;
    if not found then raise exception 'reservation invariant violated'; end if;
    update private.stock_reservations set status = 'released' where id = held.id;
    released_count := released_count + 1;
  end loop;

  update private.checkout_sessions s
  set status = 'expired', updated_at = now()
  where status in ('reserved', 'converted') and expires_at <= now()
    and not exists (
      select 1 from private.stock_reservations r
      where r.checkout_session_id = s.id and r.status = 'active'
    );
  update private.orders
  set status = 'expired', updated_at = now()
  where status = 'pending_payment' and expires_at <= now();
  update private.payment_attempts p
  set status = 'cancelled', updated_at = now()
  where status = 'requires_provider'
    and exists (
      select 1 from private.orders o where o.id = p.order_id and o.status = 'expired'
    );
  return released_count;
end
$function$;
revoke all on function private.release_expired_reservations(integer) from public, anon, authenticated, service_role;

comment on function public.create_pending_order(uuid, uuid, jsonb) is
  'Creates one immutable pending order and internal payment attempt from an owned, unexpired stock reservation.';

notify pgrst, 'reload schema';
commit;
