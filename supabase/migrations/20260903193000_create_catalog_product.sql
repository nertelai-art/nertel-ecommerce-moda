begin;
create or replace function public.create_catalog_product(product_slug text,product_name text,product_description text,variant_sku text,variant_size text,variant_color text,variant_price_minor bigint,inventory_location uuid)
returns uuid language plpgsql volatile security definer set search_path=''
as $f$ declare new_product uuid; new_variant uuid; begin
  perform private.require_catalog_manager();
  if not ('inventory.manage'=any(private.current_staff_permissions())) then raise exception 'insufficient inventory permission' using errcode='42501'; end if;
  insert into public.products(slug,name,description,status) values(btrim(product_slug),btrim(product_name),product_description,'draft') returning id into new_product;
  insert into public.product_variants(product_id,sku,size,color,price_minor,currency,is_active) values(new_product,btrim(variant_sku),btrim(variant_size),btrim(variant_color),variant_price_minor,'EUR',false) returning id into new_variant;
  insert into private.inventory_levels(variant_id,location_id) values(new_variant,inventory_location);
  return new_product;
end $f$;
revoke all on function public.create_catalog_product(text,text,text,text,text,text,bigint,uuid) from public,anon,authenticated,service_role;
grant execute on function public.create_catalog_product(text,text,text,text,text,text,bigint,uuid) to authenticated;
notify pgrst,'reload schema'; commit;
