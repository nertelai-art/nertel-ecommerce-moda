begin;
alter table private.staff_permissions drop constraint staff_permissions_permission_check;
alter table private.staff_permissions add constraint staff_permissions_permission_check check(permission=any(array['catalog.manage','inventory.manage','orders.fulfill','customers.read','suppliers.manage','finance.read','content.manage','refunds.create','staff.manage']));
insert into private.staff_permissions(user_id,permission) select user_id,'content.manage' from private.staff_permissions where permission='staff.manage' on conflict do nothing;

create table public.storefront_content(
  singleton boolean primary key default true check(singleton),
  content jsonb not null check(jsonb_typeof(content)='object'),
  published_at timestamptz not null default now()
);
alter table public.storefront_content enable row level security;
create policy storefront_content_public_read on public.storefront_content for select to anon,authenticated using(singleton);
grant select on public.storefront_content to anon,authenticated;

create table private.storefront_drafts(
  singleton boolean primary key default true check(singleton),
  content jsonb not null check(jsonb_typeof(content)='object'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table private.storefront_drafts enable row level security;

create function private.require_content_manager() returns void language plpgsql stable security invoker set search_path=''
as $f$ begin if not('content.manage'=any(private.current_staff_permissions())) then raise exception 'insufficient content permission' using errcode='42501'; end if; end $f$;
revoke all on function private.require_content_manager() from public,anon,authenticated,service_role;
grant execute on function private.require_content_manager() to authenticated;

create function private.validate_storefront_content(value jsonb) returns jsonb language plpgsql immutable security invoker set search_path=''
as $f$
begin
  if jsonb_typeof(value)<>'object' or (select array_agg(key order by key) from jsonb_object_keys(value) key)<>array['closing','editorial','hero','manifest']
    or jsonb_typeof(value->'hero')<>'object' or jsonb_typeof(value->'editorial')<>'object' or jsonb_typeof(value->'manifest')<>'object' or jsonb_typeof(value->'closing')<>'object'
    or length(btrim(value#>>'{hero,eyebrow}')) not between 1 and 80 or length(btrim(value#>>'{hero,title}')) not between 1 and 100
    or length(btrim(value#>>'{hero,description}')) not between 1 and 300 or length(btrim(value#>>'{hero,image}')) not between 1 and 160
    or length(btrim(value#>>'{hero,imageAlt}')) not between 1 and 240
    or length(btrim(value#>>'{editorial,eyebrow}')) not between 1 and 80 or length(btrim(value#>>'{editorial,title}')) not between 1 and 140
    or length(btrim(value#>>'{manifest,eyebrow}')) not between 1 and 80 or length(btrim(value#>>'{manifest,title}')) not between 1 and 180
    or length(btrim(value#>>'{closing,eyebrow}')) not between 1 and 80 or length(btrim(value#>>'{closing,title}')) not between 1 and 180
    or length(btrim(value#>>'{closing,description}')) not between 1 and 320
    or value#>>'{hero,image}' not in ('/editorial/campaign-hero.png','/editorial/campaign-woman.png','/editorial/campaign-man.png')
  then raise exception 'invalid storefront content' using errcode='22023'; end if;
  return value;
end $f$;
revoke all on function private.validate_storefront_content(jsonb) from public,anon,authenticated,service_role;

create function private.staff_storefront_content() returns table(draft jsonb,published jsonb,updated_at timestamptz,published_at timestamptz)
language plpgsql stable security definer set search_path='' as $f$ begin perform private.require_content_manager(); return query select d.content,p.content,d.updated_at,p.published_at from private.storefront_drafts d cross join public.storefront_content p where d.singleton and p.singleton; end $f$;
revoke all on function private.staff_storefront_content() from public,anon,authenticated,service_role; grant execute on function private.staff_storefront_content() to authenticated;
create function public.staff_storefront_content() returns table(draft jsonb,published jsonb,updated_at timestamptz,published_at timestamptz) language sql stable security invoker set search_path='' as $f$ select * from private.staff_storefront_content(); $f$;
revoke all on function public.staff_storefront_content() from public,anon,authenticated,service_role; grant execute on function public.staff_storefront_content() to authenticated;

create function public.save_storefront_draft(new_content jsonb) returns void language plpgsql volatile security definer set search_path=''
as $f$ begin perform private.require_content_manager(); update private.storefront_drafts set content=private.validate_storefront_content(new_content),updated_at=now(),updated_by=auth.uid() where singleton; end $f$;
revoke all on function public.save_storefront_draft(jsonb) from public,anon,authenticated,service_role; grant execute on function public.save_storefront_draft(jsonb) to authenticated;
create function public.publish_storefront_content() returns void language plpgsql volatile security definer set search_path=''
as $f$ begin perform private.require_content_manager(); update public.storefront_content p set content=d.content,published_at=now() from private.storefront_drafts d where p.singleton and d.singleton; end $f$;
revoke all on function public.publish_storefront_content() from public,anon,authenticated,service_role; grant execute on function public.publish_storefront_content() to authenticated;

do $f$ declare initial jsonb:='{"hero":{"eyebrow":"Primavera · Estiu 2026","title":"Menys soroll. Més tu.","description":"Una col·lecció serena de peces versàtils, textures naturals i formes que respiren.","image":"/editorial/campaign-hero.png","imageAlt":"Dues persones amb peces de lli en una arquitectura mediterrània"},"editorial":{"eyebrow":"Històries d’estil","title":"Una manera més tranquil·la de vestir."},"manifest":{"eyebrow":"Manifest 01","title":"Comprar menys. Triar millor. Portar-ho molt."},"closing":{"eyebrow":"La primera edició","title":"Peces per tornar-hi, una vegada i una altra.","description":"Previsualització de la botiga. Pots explorar el catàleg i preparar el carret; els pagaments encara no estan activats."}}'::jsonb; begin insert into public.storefront_content(content) values(initial); insert into private.storefront_drafts(content) values(initial); end $f$;
notify pgrst,'reload schema'; commit;
