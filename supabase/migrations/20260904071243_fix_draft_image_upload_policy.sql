begin;
create or replace function private.catalog_product_exists(target_id uuid)
returns boolean language sql stable security definer set search_path=''
as $f$ select exists(select 1 from public.products where id=target_id) $f$;
revoke all on function private.catalog_product_exists(uuid) from public,anon,authenticated,service_role;
grant execute on function private.catalog_product_exists(uuid) to authenticated;

drop policy product_images_storage_staff_insert on storage.objects;
create policy product_images_storage_staff_insert on storage.objects for insert to authenticated
with check (
  bucket_id='product-images' and
  name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$' and
  'catalog.manage'=any(private.current_staff_permissions()) and
  private.catalog_product_exists(((storage.foldername(name))[1])::uuid)
);
commit;
