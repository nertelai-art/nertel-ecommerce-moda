begin;

create or replace function private.staff_inventory()
returns table(
  variant_id uuid,
  location_id uuid,
  product_name text,
  sku text,
  size text,
  color text,
  location_name text,
  on_hand integer,
  reserved integer
)
language plpgsql stable security definer
set search_path = ''
as $function$
begin
  if not ('inventory.manage' = any(private.current_staff_permissions())) then
    raise exception 'insufficient inventory permission' using errcode = '42501';
  end if;
  return query
    select v.id, l.location_id, p.name, v.sku, v.size, v.color,
      il.name, l.on_hand, l.reserved
    from private.inventory_levels l
    join private.inventory_locations il on il.id = l.location_id
    join public.product_variants v on v.id = l.variant_id
    join public.products p on p.id = v.product_id
    order by p.name, v.sku, il.name;
end;
$function$;

revoke all on function private.staff_inventory()
  from public, anon, authenticated, service_role;
grant execute on function private.staff_inventory() to authenticated;

create or replace function public.staff_inventory()
returns table(
  variant_id uuid,
  location_id uuid,
  product_name text,
  sku text,
  size text,
  color text,
  location_name text,
  on_hand integer,
  reserved integer
)
language sql stable security invoker
set search_path = ''
as $function$
  select * from private.staff_inventory();
$function$;

revoke all on function public.staff_inventory()
  from public, anon, authenticated, service_role;
grant execute on function public.staff_inventory() to authenticated;
comment on function public.staff_inventory() is
  'Inventory rows for staff with a live AAL2 session and inventory.manage.';

notify pgrst, 'reload schema';
commit;
