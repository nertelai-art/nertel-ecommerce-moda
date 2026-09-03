begin;
create or replace function private.current_staff_permissions()
returns text[]
language plpgsql stable security definer
set search_path = ''
as $function$
declare
  actor uuid := auth.uid();
begin
  if actor is null or coalesce(auth.jwt()->>'aal', '') <> 'aal2' then
    return array[]::text[];
  end if;
  if not exists (
    select 1 from auth.sessions s
    join auth.mfa_factors f on f.id = s.factor_id and f.user_id = s.user_id
    where s.user_id = actor and s.id::text = auth.jwt()->>'session_id'
      and s.aal = 'aal2' and (s.not_after is null or s.not_after > now())
      and f.status = 'verified' and f.factor_type = 'totp'
  ) then
    return array[]::text[];
  end if;
  return coalesce((select array_agg(p.permission order by p.permission)
    from private.staff_permissions p where p.user_id = actor), array[]::text[]);
end;
$function$;
revoke all on function private.current_staff_permissions() from public, anon, authenticated, service_role;
grant usage on schema private to authenticated;
grant execute on function private.current_staff_permissions() to authenticated;
comment on function private.current_staff_permissions() is 'Narrow owner-executed read of current caller permissions only; requires live AAL2 session and verified TOTP. No caller-supplied identity or writes.';
create or replace function public.current_staff_permissions()
returns text[]
language sql stable security invoker
set search_path = ''
as $function$
  select private.current_staff_permissions();
$function$;
revoke all on function public.current_staff_permissions() from public, anon, authenticated, service_role;
grant execute on function public.current_staff_permissions() to authenticated;
notify pgrst, 'reload schema';
commit;