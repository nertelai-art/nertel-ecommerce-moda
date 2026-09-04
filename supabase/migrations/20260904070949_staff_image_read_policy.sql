begin;
create policy product_images_storage_staff_read on storage.objects for select to authenticated
using (bucket_id='product-images' and 'catalog.manage'=any(private.current_staff_permissions()));
commit;
