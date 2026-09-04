begin;

create table private.security_settings (
  singleton boolean primary key default true check (singleton),
  require_staff_mfa boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table private.security_settings enable row level security;

insert into private.security_settings(singleton, require_staff_mfa)
values (true, true);

revoke all on table private.security_settings from public, anon, authenticated, service_role;
grant select, insert, update, delete on table private.security_settings to postgres;

create or replace function private.staff_mfa_required()
returns boolean
language sql stable security definer
set search_path = ''
as $function$
  select coalesce(
    (select settings.require_staff_mfa
       from private.security_settings settings
      where settings.singleton),
    true
  );
$function$;

revoke all on function private.staff_mfa_required() from public, anon, authenticated, service_role;

create or replace function private.current_staff_permissions()
returns text[]
language plpgsql stable security definer
set search_path = ''
as $function$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    return array[]::text[];
  end if;
  if private.staff_mfa_required() and (
    coalesce(auth.jwt()->>'aal', '') <> 'aal2'
    or not exists (
      select 1 from auth.sessions s
      join auth.mfa_factors f on f.id = s.factor_id and f.user_id = s.user_id
      where s.user_id = actor and s.id::text = auth.jwt()->>'session_id'
        and s.aal = 'aal2' and (s.not_after is null or s.not_after > now())
        and f.status = 'verified' and f.factor_type = 'totp'
    )
  ) then
    return array[]::text[];
  end if;
  return coalesce((select array_agg(p.permission order by p.permission)
    from private.staff_permissions p where p.user_id = actor), array[]::text[]);
end;
$function$;

comment on table private.security_settings is 'Server-controlled security policy. Production defaults to requiring staff MFA.';
comment on function private.current_staff_permissions() is 'Narrow owner-executed read of current caller permissions; MFA is required by the protected server policy and defaults on.';
notify pgrst, 'reload schema';
commit;
