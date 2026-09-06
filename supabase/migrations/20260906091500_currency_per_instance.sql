-- PROPOSTA · NO APLICADA
-- La moneda deixa de ser una constant del nucli comercial i passa a ser
-- configuracio d'instancia, escrita una sola vegada en crear la botiga.
-- Les set funcions de sota son la definicio actual amb 'EUR' substituit per
-- private.shop_currency(); no s'ha reescrit cap altra linia.

begin;

create table private.instance_settings (
  singleton boolean primary key default true check (singleton),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now()
);
alter table private.instance_settings enable row level security;
revoke all on table private.instance_settings from public, anon, authenticated, service_role;
grant select, insert, update, delete on table private.instance_settings to postgres;
comment on table private.instance_settings is
  'Configuracio d''instancia escrita per Nertel en crear la botiga. La moneda no es editable des del panell: canviar-la amb comandes existents corromp el llibre.';

insert into private.instance_settings (currency, country_code) values ('EUR', 'ES');

create function private.shop_currency() returns text
language sql stable security definer set search_path = ''
as $function$
  select currency from private.instance_settings where singleton
$function$;
revoke all on function private.shop_currency() from public, anon, authenticated, service_role;

-- El default deixa de ser una constant i passa a seguir la instancia. No es pot
-- treure sense mes: create_supplier no rep la moneda per parametre i depen del
-- default, igual que les dades de demostracio.
alter table private.suppliers alter column currency set default private.shop_currency();
alter table private.supplier_products alter column currency set default private.shop_currency();

CREATE OR REPLACE FUNCTION private.freeze_order_snapshot()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ begin
  select coalesce(sum(r.unit_price_minor::numeric*r.quantity),0)::bigint
  into new.amount_minor from private.stock_reservations r
  where r.checkout_session_id=new.checkout_session_id and r.status='active' and r.expires_at>now();
  new.currency=private.shop_currency();
  return new;
end $function$

;

CREATE OR REPLACE FUNCTION private.snapshot_reservation_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ begin
  select v.sku,p.name,v.size,v.color,v.price_minor,v.currency
  into new.sku,new.product_name,new.size,new.color,new.unit_price_minor,new.currency
  from public.product_variants v join public.products p on p.id=v.product_id
  where v.id=new.variant_id and v.is_active and p.status='published' and v.currency=private.shop_currency();
  if not found then raise exception 'variant unavailable' using errcode='P0002'; end if;
  return new;
end $function$

;

CREATE OR REPLACE FUNCTION private.staff_customers()
 RETURNS TABLE(email text, display_name text, latest_address jsonb, is_registered boolean, order_count bigint, paid_order_count bigint, pending_order_count bigint, total_spent_minor bigint, currency text, first_order_at timestamp with time zone, last_order_at timestamp with time zone, orders jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not ('customers.read' = any(private.current_staff_permissions())) then
    raise exception 'insufficient customer permission' using errcode = '42501';
  end if;

  return query
  select
    lower(o.email) as email,
    coalesce(
      (array_agg(nullif(o.shipping_address->>'recipient', '') order by o.created_at desc))[1],
      lower(o.email)
    ) as display_name,
    (array_agg(o.shipping_address order by o.created_at desc))[1] as latest_address,
    bool_or(o.customer_id is not null) as is_registered,
    count(*) as order_count,
    count(*) filter (where o.status = 'paid') as paid_order_count,
    count(*) filter (where o.status = 'pending_payment') as pending_order_count,
    coalesce(sum(o.amount_minor) filter (where o.status = 'paid'), 0)::bigint as total_spent_minor,
    private.shop_currency()::text as currency,
    min(o.created_at) as first_order_at,
    max(o.created_at) as last_order_at,
    jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'status', o.status,
        'amountMinor', o.amount_minor,
        'currency', o.currency,
        'createdAt', o.created_at,
        'itemCount', coalesce(lines.item_count, 0)
      ) order by o.created_at desc, o.id desc
    ) as orders
  from private.orders o
  left join lateral (
    select sum(i.quantity)::bigint as item_count
    from private.order_items i
    where i.order_id = o.id
  ) lines on true
  where o.email <> 'deleted@example.invalid'
  group by lower(o.email)
  order by max(o.created_at) desc, lower(o.email);
end
$function$

;

CREATE OR REPLACE FUNCTION public.create_catalog_product(product_slug text, product_name text, product_description text, variant_sku text, variant_size text, variant_color text, variant_price_minor bigint, inventory_location uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ declare new_product uuid; new_variant uuid; begin
  perform private.require_catalog_manager();
  if not ('inventory.manage'=any(private.current_staff_permissions())) then raise exception 'insufficient inventory permission' using errcode='42501'; end if;
  insert into public.products(slug,name,description,status) values(btrim(product_slug),btrim(product_name),product_description,'draft') returning id into new_product;
  insert into public.product_variants(product_id,sku,size,color,price_minor,currency,is_active) values(new_product,btrim(variant_sku),btrim(variant_size),btrim(variant_color),variant_price_minor,private.shop_currency(),false) returning id into new_variant;
  insert into private.inventory_levels(variant_id,location_id) values(new_variant,inventory_location);
  return new_product;
end $function$

;

CREATE OR REPLACE FUNCTION public.create_catalog_variant(target_product uuid, variant_sku text, variant_size text, variant_color text, variant_price_minor bigint, inventory_location uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ declare new_variant uuid; begin
  perform private.require_catalog_manager();
  if not ('inventory.manage'=any(private.current_staff_permissions())) then
    raise exception 'insufficient inventory permission' using errcode='42501';
  end if;
  if not exists(select 1 from public.products where id=target_product) then
    raise exception 'product not found' using errcode='P0002';
  end if;
  insert into public.product_variants(product_id,sku,size,color,price_minor,currency,is_active)
  values(target_product,btrim(variant_sku),btrim(variant_size),btrim(variant_color),variant_price_minor,private.shop_currency(),false)
  returning id into new_variant;
  insert into private.inventory_levels(variant_id,location_id) values(new_variant,inventory_location);
  return new_variant;
end $function$

;

CREATE OR REPLACE FUNCTION public.create_pending_order(session_token uuid, request_key uuid, checkout_details jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    if held.currency <> private.shop_currency() then
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
    private.shop_currency(),
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
  values(new_order, request_key, total::bigint, private.shop_currency());

  update private.checkout_sessions
  set status = 'converted', updated_at = now()
  where id = session_token;

  return private.pending_order_result(new_order);
end
$function$

;

CREATE OR REPLACE FUNCTION public.quote_cart(cart jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ declare requested record; details record; result_items jsonb:='[]'::jsonb; total numeric:=0; begin
  for requested in select * from private.validated_cart_items(cart) loop
    select v.id,p.slug,p.name,v.size,v.color,v.price_minor,v.currency,
      coalesce((select max(l.on_hand-l.reserved) from private.inventory_levels l where l.variant_id=v.id),0) available
    into details from public.product_variants v join public.products p on p.id=v.product_id
    where v.id=requested.variant_id and v.is_active and p.status='published' and v.currency=private.shop_currency();
    if not found then raise exception 'variant unavailable' using errcode='P0002'; end if;
    total:=total+(details.price_minor::numeric*requested.quantity);
    if total>9007199254740991 then raise exception 'cart total too large' using errcode='22003'; end if;
    result_items:=result_items||jsonb_build_array(jsonb_build_object(
      'variantId',details.id,'slug',details.slug,'name',details.name,'size',details.size,'color',details.color,
      'unitPriceMinor',details.price_minor,'currency',details.currency,'quantity',requested.quantity,
      'lineTotalMinor',details.price_minor*requested.quantity,'available',details.available>=requested.quantity));
  end loop;
  return jsonb_build_object('items',result_items,'totalMinor',total::bigint,'currency',private.shop_currency());
end $function$

;

notify pgrst, 'reload schema';
commit;
