begin;
create or replace function private.require_catalog_manager() returns void
language plpgsql stable security definer set search_path=''
as $f$ begin
  if not ('catalog.manage'=any(private.current_staff_permissions())) then
    raise exception 'insufficient catalog permission' using errcode='42501';
  end if;
end $f$;
revoke all on function private.require_catalog_manager() from public,anon,authenticated,service_role;
grant execute on function private.require_catalog_manager() to authenticated;

create or replace function public.staff_catalog()
returns table(id uuid,slug text,name text,description text,status text)
language plpgsql stable security definer set search_path=''
as $f$ begin
  perform private.require_catalog_manager();
  return query select p.id,p.slug,p.name,p.description,p.status from public.products p order by p.name,p.id;
end $f$;
revoke all on function public.staff_catalog() from public,anon,authenticated,service_role;
grant execute on function public.staff_catalog() to authenticated;

create or replace function public.update_catalog_product(target_id uuid,new_slug text,new_name text,new_description text,new_status text)
returns void language plpgsql volatile security definer set search_path=''
as $f$ begin
  perform private.require_catalog_manager();
  update public.products set slug=btrim(new_slug),name=btrim(new_name),description=new_description,status=new_status where id=target_id;
  if not found then raise exception 'product not found' using errcode='P0002'; end if;
end $f$;
revoke all on function public.update_catalog_product(uuid,text,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.update_catalog_product(uuid,text,text,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
