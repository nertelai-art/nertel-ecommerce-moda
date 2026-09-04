begin;

create or replace function private.adjust_inventory(
  target_variant uuid,
  target_location uuid,
  quantity_change integer,
  movement_reason text,
  idempotency_key text
)
returns integer
language plpgsql volatile security definer
set search_path = ''
as $function$
declare
  actor uuid := auth.uid();
  resulting_on_hand integer;
begin
  if actor is null
    or not ('inventory.manage' = any(private.current_staff_permissions())) then
    raise exception 'insufficient inventory permission' using errcode = '42501';
  end if;
  if quantity_change = 0 then
    raise exception 'quantity change must not be zero' using errcode = '22023';
  end if;
  if length(btrim(movement_reason)) not between 1 and 500
    or length(btrim(idempotency_key)) not between 1 and 200 then
    raise exception 'invalid inventory movement metadata' using errcode = '22023';
  end if;

  select on_hand into resulting_on_hand
  from private.inventory_levels
  where variant_id = target_variant and location_id = target_location
  for update;
  if not found then
    raise exception 'inventory level not found' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from private.stock_movements where reference_key = idempotency_key
  ) then
    if not exists (
      select 1 from private.stock_movements
      where reference_key=idempotency_key and variant_id=target_variant and location_id=target_location
        and quantity_delta=quantity_change and reason=btrim(movement_reason) and actor_id=actor
    ) then raise exception 'idempotency payload conflict' using errcode='23505'; end if;
    return resulting_on_hand;
  end if;
  if resulting_on_hand + quantity_change < 0 then
    raise exception 'insufficient physical stock' using errcode = '22003';
  end if;

  update private.inventory_levels
  set on_hand = on_hand + quantity_change
  where variant_id = target_variant and location_id = target_location
  returning on_hand into resulting_on_hand;

  insert into private.stock_movements(
    variant_id, location_id, quantity_delta, reason, reference_key, actor_id
  ) values (
    target_variant, target_location, quantity_change, btrim(movement_reason),
    btrim(idempotency_key), actor
  );
  return resulting_on_hand;
end;
$function$;

revoke all on function private.adjust_inventory(uuid,uuid,integer,text,text)
  from public, anon, authenticated, service_role;
grant execute on function private.adjust_inventory(uuid,uuid,integer,text,text)
  to authenticated;

create or replace function public.adjust_inventory(
  target_variant uuid,
  target_location uuid,
  quantity_change integer,
  movement_reason text,
  idempotency_key text
)
returns integer
language sql volatile security invoker
set search_path = ''
as $function$
  select private.adjust_inventory(
    target_variant, target_location, quantity_change, movement_reason, idempotency_key
  );
$function$;

revoke all on function public.adjust_inventory(uuid,uuid,integer,text,text)
  from public, anon, authenticated, service_role;
grant execute on function public.adjust_inventory(uuid,uuid,integer,text,text)
  to authenticated;

comment on function public.adjust_inventory(uuid,uuid,integer,text,text) is
  'Atomic, idempotent stock adjustment. Requires a live AAL2 session and inventory.manage.';

notify pgrst, 'reload schema';
commit;
