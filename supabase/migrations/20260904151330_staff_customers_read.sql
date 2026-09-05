begin;

create function private.staff_customers()
returns table(
  email text,
  display_name text,
  latest_address jsonb,
  is_registered boolean,
  order_count bigint,
  paid_order_count bigint,
  pending_order_count bigint,
  total_spent_minor bigint,
  currency text,
  first_order_at timestamptz,
  last_order_at timestamptz,
  orders jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
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
    'EUR'::text as currency,
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
$function$;

revoke all on function private.staff_customers() from public, anon, authenticated, service_role;
grant execute on function private.staff_customers() to authenticated;

create function public.staff_customers()
returns table(
  email text,
  display_name text,
  latest_address jsonb,
  is_registered boolean,
  order_count bigint,
  paid_order_count bigint,
  pending_order_count bigint,
  total_spent_minor bigint,
  currency text,
  first_order_at timestamptz,
  last_order_at timestamptz,
  orders jsonb
)
language sql
stable
security invoker
set search_path = ''
as $function$
  select * from private.staff_customers();
$function$;

revoke all on function public.staff_customers() from public, anon, authenticated, service_role;
grant execute on function public.staff_customers() to authenticated;
comment on function public.staff_customers() is
  'Returns a minimal order-derived customer directory to staff holding customers.read.';

notify pgrst, 'reload schema';
commit;
