begin;

drop function public.staff_inventory();
drop function private.staff_inventory();

create function private.staff_inventory()
returns table(
  variant_id uuid,
  location_id uuid,
  product_id uuid,
  product_slug text,
  product_name text,
  product_image_id uuid,
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
    select v.id, levels.location_id, p.id, p.slug, p.name, image.id,
      v.sku, v.size, v.color, location.name, levels.on_hand, levels.reserved
    from private.inventory_levels levels
    join private.inventory_locations location on location.id = levels.location_id
    join public.product_variants v on v.id = levels.variant_id
    join public.products p on p.id = v.product_id
    left join lateral (
      select product_image.id
      from public.product_images product_image
      where product_image.product_id = p.id
      order by product_image.sort_order, product_image.id
      limit 1
    ) image on true
    order by p.name, v.sku, location.name;
end;
$function$;

revoke all on function private.staff_inventory()
  from public, anon, authenticated, service_role;
grant execute on function private.staff_inventory() to authenticated;

create function public.staff_inventory()
returns table(
  variant_id uuid,
  location_id uuid,
  product_id uuid,
  product_slug text,
  product_name text,
  product_image_id uuid,
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
  'Minimal inventory and visual product fields for authorized inventory staff.';

notify pgrst, 'reload schema';
commit;
