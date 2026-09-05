begin;

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
  select *
  into session_row
  from private.checkout_sessions
  where id = session_token
  for update;

  if not found then
    return false;
  end if;

  if session_row.user_id is distinct from actor then
    raise exception 'session ownership mismatch' using errcode = '42501';
  end if;

  for held in
    select *
    from private.stock_reservations
    where checkout_session_id = session_token and status = 'active'
    order by variant_id
    for update
  loop
    update private.inventory_levels
    set reserved = reserved - held.quantity
    where variant_id = held.variant_id
      and location_id = held.location_id
      and reserved >= held.quantity;

    if not found then
      raise exception 'reservation invariant violated';
    end if;

    update private.stock_reservations
    set status = 'released'
    where id = held.id;
  end loop;

  update private.checkout_sessions
  set status = 'cancelled', expires_at = null, updated_at = now()
  where id = session_token;

  return true;
end
$function$;

revoke all on function public.cancel_cart_reservation(uuid) from public, anon, authenticated, service_role;
grant execute on function public.cancel_cart_reservation(uuid) to anon, authenticated;

comment on function public.cancel_cart_reservation(uuid) is
  'Releases an opaque checkout session reservation after validating its authenticated owner.';

notify pgrst, 'reload schema';
commit;
