begin;

create or replace function public.staff_catalog_variants()
returns table(id uuid,product_id uuid,sku text,size text,color text,price_minor bigint,currency text,is_active boolean)
language plpgsql stable security definer set search_path=''
as $f$ begin
  perform private.require_catalog_manager();
  return query
    select v.id,v.product_id,v.sku,v.size,v.color,v.price_minor,v.currency,v.is_active
    from public.product_variants v
    order by v.product_id,v.sku,v.id;
end $f$;
revoke all on function public.staff_catalog_variants() from public,anon,authenticated,service_role;
grant execute on function public.staff_catalog_variants() to authenticated;

create or replace function public.staff_categories()
returns table(id uuid,slug text,name text,is_active boolean)
language plpgsql stable security definer set search_path=''
as $f$ begin
  perform private.require_catalog_manager();
  return query select c.id,c.slug,c.name,c.is_active from public.categories c order by c.name,c.id;
end $f$;
revoke all on function public.staff_categories() from public,anon,authenticated,service_role;
grant execute on function public.staff_categories() to authenticated;

create or replace function public.staff_product_categories()
returns table(product_id uuid,category_id uuid)
language plpgsql stable security definer set search_path=''
as $f$ begin
  perform private.require_catalog_manager();
  return query select pc.product_id,pc.category_id from public.product_categories pc order by pc.product_id,pc.category_id;
end $f$;
revoke all on function public.staff_product_categories() from public,anon,authenticated,service_role;
grant execute on function public.staff_product_categories() to authenticated;

create or replace function public.create_catalog_variant(target_product uuid,variant_sku text,variant_size text,variant_color text,variant_price_minor bigint,inventory_location uuid)
returns uuid language plpgsql volatile security definer set search_path=''
as $f$ declare new_variant uuid; begin
  perform private.require_catalog_manager();
  if not ('inventory.manage'=any(private.current_staff_permissions())) then
    raise exception 'insufficient inventory permission' using errcode='42501';
  end if;
  if not exists(select 1 from public.products where id=target_product) then
    raise exception 'product not found' using errcode='P0002';
  end if;
  insert into public.product_variants(product_id,sku,size,color,price_minor,currency,is_active)
  values(target_product,btrim(variant_sku),btrim(variant_size),btrim(variant_color),variant_price_minor,'EUR',false)
  returning id into new_variant;
  insert into private.inventory_levels(variant_id,location_id) values(new_variant,inventory_location);
  return new_variant;
end $f$;
revoke all on function public.create_catalog_variant(uuid,text,text,text,bigint,uuid) from public,anon,authenticated,service_role;
grant execute on function public.create_catalog_variant(uuid,text,text,text,bigint,uuid) to authenticated;

create or replace function public.update_catalog_variant(target_id uuid,new_sku text,new_size text,new_color text,new_price_minor bigint,new_is_active boolean)
returns void language plpgsql volatile security definer set search_path=''
as $f$ begin
  perform private.require_catalog_manager();
  update public.product_variants
  set sku=btrim(new_sku),size=btrim(new_size),color=btrim(new_color),price_minor=new_price_minor,is_active=new_is_active
  where id=target_id;
  if not found then raise exception 'variant not found' using errcode='P0002'; end if;
end $f$;
revoke all on function public.update_catalog_variant(uuid,text,text,text,bigint,boolean) from public,anon,authenticated,service_role;
grant execute on function public.update_catalog_variant(uuid,text,text,text,bigint,boolean) to authenticated;

create or replace function public.create_catalog_category(category_slug text,category_name text)
returns uuid language plpgsql volatile security definer set search_path=''
as $f$ declare new_category uuid; begin
  perform private.require_catalog_manager();
  insert into public.categories(slug,name,is_active)
  values(btrim(category_slug),btrim(category_name),false)
  returning id into new_category;
  return new_category;
end $f$;
revoke all on function public.create_catalog_category(text,text) from public,anon,authenticated,service_role;
grant execute on function public.create_catalog_category(text,text) to authenticated;

create or replace function public.update_catalog_category(target_id uuid,new_slug text,new_name text,new_is_active boolean)
returns void language plpgsql volatile security definer set search_path=''
as $f$ begin
  perform private.require_catalog_manager();
  update public.categories set slug=btrim(new_slug),name=btrim(new_name),is_active=new_is_active where id=target_id;
  if not found then raise exception 'category not found' using errcode='P0002'; end if;
end $f$;
revoke all on function public.update_catalog_category(uuid,text,text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.update_catalog_category(uuid,text,text,boolean) to authenticated;

create or replace function public.set_product_categories(target_product uuid,target_categories uuid[])
returns void language plpgsql volatile security definer set search_path=''
as $f$ begin
  perform private.require_catalog_manager();
  if not exists(select 1 from public.products where id=target_product) then
    raise exception 'product not found' using errcode='P0002';
  end if;
  if exists(select 1 from unnest(coalesce(target_categories,'{}'::uuid[])) requested(id) left join public.categories c on c.id=requested.id where c.id is null) then
    raise exception 'category not found' using errcode='P0002';
  end if;
  delete from public.product_categories where product_id=target_product;
  insert into public.product_categories(product_id,category_id)
  select target_product,id from unnest(coalesce(target_categories,'{}'::uuid[])) requested(id) on conflict do nothing;
end $f$;
revoke all on function public.set_product_categories(uuid,uuid[]) from public,anon,authenticated,service_role;
grant execute on function public.set_product_categories(uuid,uuid[]) to authenticated;

notify pgrst,'reload schema';
commit;
