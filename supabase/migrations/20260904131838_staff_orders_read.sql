begin;

create function private.staff_orders()
returns table(
  id uuid,
  status text,
  email text,
  shipping_address jsonb,
  amount_minor bigint,
  currency text,
  payment_status text,
  expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  items jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if not ('orders.fulfill' = any(private.current_staff_permissions()))
    or not ('customers.read' = any(private.current_staff_permissions())) then
    raise exception 'insufficient order permissions' using errcode = '42501';
  end if;

  return query
  select
    o.id,
    o.status,
    o.email,
    o.shipping_address,
    o.amount_minor,
    o.currency,
    payment.status,
    o.expires_at,
    o.created_at,
    o.updated_at,
    coalesce(lines.items, '[]'::jsonb)
  from private.orders o
  left join lateral (
    select p.status
    from private.payment_attempts p
    where p.order_id = o.id
    order by p.created_at desc, p.id desc
    limit 1
  ) payment on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'variantId', i.variant_id,
        'sku', i.sku,
        'productName', i.product_name,
        'size', i.size,
        'color', i.color,
        'unitPriceMinor', i.unit_price_minor,
        'quantity', i.quantity,
        'lineTotalMinor', i.line_total_minor,
        'currency', i.currency,
        'productImageId', image.id
      ) order by i.product_name, i.sku
    ) as items
    from private.order_items i
    left join public.product_variants variant on variant.id = i.variant_id
    left join lateral (
      select product_image.id
      from public.product_images product_image
      where product_image.product_id = variant.product_id
      order by product_image.sort_order, product_image.created_at, product_image.id
      limit 1
    ) image on true
    where i.order_id = o.id
  ) lines on true
  order by o.created_at desc, o.id desc;
end
$function$;

revoke all on function private.staff_orders() from public, anon, authenticated, service_role;
grant execute on function private.staff_orders() to authenticated;

create function public.staff_orders()
returns table(
  id uuid,
  status text,
  email text,
  shipping_address jsonb,
  amount_minor bigint,
  currency text,
  payment_status text,
  expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  items jsonb
)
language sql
stable
security invoker
set search_path = ''
as $function$
  select * from private.staff_orders();
$function$;

revoke all on function public.staff_orders() from public, anon, authenticated, service_role;
grant execute on function public.staff_orders() to authenticated;
comment on function public.staff_orders() is
  'Lists fulfillment-safe order snapshots for authenticated staff holding both orders.fulfill and customers.read.';

notify pgrst, 'reload schema';
commit;
