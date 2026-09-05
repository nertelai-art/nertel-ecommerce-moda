begin;

create table private.checkout_sessions (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'open' check(status in ('open','reserved','cancelled','converted','expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table private.checkout_sessions enable row level security;
create index checkout_sessions_expiry_idx on private.checkout_sessions(expires_at) where status='reserved';

create table private.reservation_requests (
  request_key uuid primary key,
  checkout_session_id uuid not null references private.checkout_sessions(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table private.reservation_requests enable row level security;

create table private.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  checkout_session_id uuid not null references private.checkout_sessions(id) on delete restrict,
  request_key uuid not null references private.reservation_requests(request_key) on delete restrict,
  variant_id uuid not null,
  location_id uuid not null,
  quantity integer not null check(quantity between 1 and 99),
  status text not null default 'active' check(status in ('active','released','converted')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key(variant_id,location_id) references private.inventory_levels(variant_id,location_id) on delete restrict
);
alter table private.stock_reservations enable row level security;
create index stock_reservations_session_idx on private.stock_reservations(checkout_session_id,status);
create index stock_reservations_expiry_idx on private.stock_reservations(expires_at,id) where status='active';

create or replace function private.validated_cart_items(cart jsonb)
returns table(variant_id uuid,quantity integer)
language plpgsql stable security invoker set search_path=''
as $f$ begin
  if jsonb_typeof(cart) <> 'array' or jsonb_array_length(cart) not between 1 and 100 then
    raise exception 'invalid cart' using errcode='22023';
  end if;
  if exists(
    select 1 from jsonb_array_elements(cart) item
    where jsonb_typeof(item) <> 'object'
      or (select array_agg(key order by key) from jsonb_object_keys(item) key) <> array['quantity','variantId']
      or coalesce(item->>'variantId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or coalesce(item->>'quantity','') !~ '^[1-9][0-9]?$'
      or (item->>'quantity')::integer not between 1 and 99
  ) then raise exception 'invalid cart item' using errcode='22023'; end if;
  if (select count(*) <> count(distinct item->>'variantId') from jsonb_array_elements(cart) item) then
    raise exception 'duplicate variant' using errcode='22023';
  end if;
  return query select (item->>'variantId')::uuid,(item->>'quantity')::integer
    from jsonb_array_elements(cart) item order by (item->>'variantId')::uuid;
end $f$;
revoke all on function private.validated_cart_items(jsonb) from public,anon,authenticated,service_role;

create or replace function private.release_expired_reservations(batch_size integer default 500)
returns integer language plpgsql volatile security definer set search_path=''
as $f$ declare released_count integer:=0; held record; begin
  if batch_size not between 1 and 1000 then raise exception 'invalid batch size' using errcode='22023'; end if;
  for held in select r.id,r.variant_id,r.location_id,r.quantity,r.checkout_session_id
    from private.stock_reservations r where r.status='active' and r.expires_at<=now()
    order by r.expires_at,r.id for update skip locked limit batch_size
  loop
    update private.inventory_levels set reserved=reserved-held.quantity
      where variant_id=held.variant_id and location_id=held.location_id and reserved>=held.quantity;
    if not found then raise exception 'reservation invariant violated'; end if;
    update private.stock_reservations set status='released' where id=held.id;
    released_count:=released_count+1;
  end loop;
  update private.checkout_sessions s set status='expired',updated_at=now()
    where status='reserved' and expires_at<=now()
      and not exists(select 1 from private.stock_reservations r where r.checkout_session_id=s.id and r.status='active');
  return released_count;
end $f$;
revoke all on function private.release_expired_reservations(integer) from public,anon,authenticated,service_role;

create or replace function public.quote_cart(cart jsonb)
returns jsonb language plpgsql stable security definer set search_path=''
as $f$ declare requested record; details record; result_items jsonb:='[]'::jsonb; total numeric:=0; begin
  for requested in select * from private.validated_cart_items(cart) loop
    select v.id,p.slug,p.name,v.size,v.color,v.price_minor,v.currency,
      coalesce((select max(l.on_hand-l.reserved) from private.inventory_levels l where l.variant_id=v.id),0) available
    into details from public.product_variants v join public.products p on p.id=v.product_id
    where v.id=requested.variant_id and v.is_active and p.status='published' and v.currency='EUR';
    if not found then raise exception 'variant unavailable' using errcode='P0002'; end if;
    total:=total+(details.price_minor::numeric*requested.quantity);
    if total>9007199254740991 then raise exception 'cart total too large' using errcode='22003'; end if;
    result_items:=result_items||jsonb_build_array(jsonb_build_object(
      'variantId',details.id,'slug',details.slug,'name',details.name,'size',details.size,'color',details.color,
      'unitPriceMinor',details.price_minor,'currency',details.currency,'quantity',requested.quantity,
      'lineTotalMinor',details.price_minor*requested.quantity,'available',details.available>=requested.quantity));
  end loop;
  return jsonb_build_object('items',result_items,'totalMinor',total::bigint,'currency','EUR');
end $f$;
revoke all on function public.quote_cart(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.quote_cart(jsonb) to anon,authenticated;

create or replace function private.reservation_result(session_token uuid)
returns jsonb language sql stable security definer set search_path=''
as $f$ select jsonb_build_object(
  'sessionId',s.id,'status',s.status,'expiresAt',s.expires_at,
  'items',coalesce((select jsonb_agg(jsonb_build_object('variantId',r.variant_id,'quantity',r.quantity) order by r.variant_id)
    from private.stock_reservations r where r.checkout_session_id=s.id and r.status='active'),'[]'::jsonb))
  from private.checkout_sessions s where s.id=session_token $f$;
revoke all on function private.reservation_result(uuid) from public,anon,authenticated,service_role;

create or replace function public.reserve_cart(cart jsonb,request_key uuid,session_token uuid)
returns jsonb language plpgsql volatile security definer set search_path=''
as $f$ declare actor uuid:=auth.uid(); requested record; selected_location uuid; expiry timestamptz:=now()+interval '15 minutes'; existing_session private.checkout_sessions%rowtype; begin
  perform private.release_expired_reservations(500);
  perform 1 from private.validated_cart_items(cart);
  insert into private.checkout_sessions(id,user_id) values(session_token,actor) on conflict(id) do nothing;
  select * into existing_session from private.checkout_sessions where id=session_token for update;
  if existing_session.user_id is not null and existing_session.user_id is distinct from actor then raise exception 'session ownership mismatch' using errcode='42501'; end if;
  if existing_session.user_id is null and actor is not null then update private.checkout_sessions set user_id=actor where id=session_token; end if;
  if exists(select 1 from private.reservation_requests r where r.request_key=reserve_cart.request_key) then
    if not exists(select 1 from private.reservation_requests r where r.request_key=reserve_cart.request_key and r.checkout_session_id=session_token) then raise exception 'request key conflict' using errcode='23505'; end if;
    return private.reservation_result(session_token);
  end if;
  insert into private.reservation_requests(request_key,checkout_session_id) values(request_key,session_token);
  for requested in select * from private.stock_reservations r where r.checkout_session_id=session_token and r.status='active' order by r.variant_id for update loop
    update private.inventory_levels set reserved=reserved-requested.quantity where variant_id=requested.variant_id and location_id=requested.location_id and reserved>=requested.quantity;
    if not found then raise exception 'reservation invariant violated'; end if;
    update private.stock_reservations set status='released' where id=requested.id;
  end loop;
  perform public.quote_cart(cart);
  for requested in select * from private.validated_cart_items(cart) loop
    selected_location:=null;
    select l.location_id into selected_location from private.inventory_levels l
      where l.variant_id=requested.variant_id and l.on_hand-l.reserved>=requested.quantity
      order by l.location_id limit 1 for update;
    if selected_location is null then raise exception 'insufficient available stock' using errcode='22003'; end if;
    update private.inventory_levels set reserved=reserved+requested.quantity where variant_id=requested.variant_id and location_id=selected_location;
    insert into private.stock_reservations(checkout_session_id,request_key,variant_id,location_id,quantity,expires_at)
      values(session_token,request_key,requested.variant_id,selected_location,requested.quantity,expiry);
  end loop;
  update private.checkout_sessions set status='reserved',expires_at=expiry,updated_at=now() where id=session_token;
  return private.reservation_result(session_token);
end $f$;
revoke all on function public.reserve_cart(jsonb,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.reserve_cart(jsonb,uuid,uuid) to anon,authenticated;

comment on function public.quote_cart(jsonb) is 'Server-authoritative public cart quote; accepts only variant IDs and quantities.';
comment on function public.reserve_cart(jsonb,uuid,uuid) is 'Atomic idempotent 15-minute pre-checkout reservation for an opaque session capability.';
notify pgrst,'reload schema';
commit;
