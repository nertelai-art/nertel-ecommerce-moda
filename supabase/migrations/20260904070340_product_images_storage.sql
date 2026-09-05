begin;

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  object_path text not null unique,
  alt_text text not null,
  sort_order smallint not null default 0,
  mime_type text not null,
  byte_size integer not null,
  created_at timestamptz not null default now(),
  constraint product_images_alt_check check (length(btrim(alt_text)) between 1 and 240),
  constraint product_images_order_check check (sort_order between 0 and 99),
  constraint product_images_mime_check check (mime_type in ('image/jpeg','image/png','image/webp')),
  constraint product_images_size_check check (byte_size between 1 and 5242880),
  constraint product_images_path_check check (object_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$')
);
alter table public.product_images enable row level security;
create index product_images_product_order_idx on public.product_images(product_id,sort_order,id);

create policy product_images_public_read on public.product_images for select to anon,authenticated
using (exists(select 1 from public.products p where p.id=product_images.product_id and p.status='published'));

grant select on public.product_images to anon,authenticated;
grant insert,select,update,delete,references,trigger,truncate on public.product_images to postgres;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('product-images','product-images',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy product_images_storage_public_read on storage.objects for select to anon,authenticated
using (
  bucket_id='product-images' and
  exists(select 1 from public.product_images i join public.products p on p.id=i.product_id where i.object_path=name and p.status='published')
);
create policy product_images_storage_staff_insert on storage.objects for insert to authenticated
with check (
  bucket_id='product-images' and
  name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$' and
  'catalog.manage'=any(private.current_staff_permissions()) and
  exists(select 1 from public.products p where p.id=((storage.foldername(name))[1])::uuid)
);
create policy product_images_storage_staff_delete on storage.objects for delete to authenticated
using (bucket_id='product-images' and 'catalog.manage'=any(private.current_staff_permissions()));

create or replace function public.staff_catalog_images()
returns table(id uuid,product_id uuid,object_path text,alt_text text,sort_order smallint,mime_type text,byte_size integer)
language plpgsql stable security definer set search_path=''
as $f$ begin
  perform private.require_catalog_manager();
  return query select i.id,i.product_id,i.object_path,i.alt_text,i.sort_order,i.mime_type,i.byte_size
  from public.product_images i order by i.product_id,i.sort_order,i.id;
end $f$;
revoke all on function public.staff_catalog_images() from public,anon,authenticated,service_role;
grant execute on function public.staff_catalog_images() to authenticated;

create or replace function public.register_catalog_image(target_product uuid,new_object_path text,new_alt_text text,new_sort_order smallint,new_mime_type text,new_byte_size integer)
returns uuid language plpgsql volatile security definer set search_path=''
as $f$ declare new_image uuid; begin
  perform private.require_catalog_manager();
  if not exists(select 1 from public.products where id=target_product) then raise exception 'product not found' using errcode='P0002'; end if;
  if not exists(select 1 from storage.objects where bucket_id='product-images' and name=new_object_path) then raise exception 'object not found' using errcode='P0002'; end if;
  insert into public.product_images(product_id,object_path,alt_text,sort_order,mime_type,byte_size)
  values(target_product,new_object_path,btrim(new_alt_text),new_sort_order,new_mime_type,new_byte_size)
  returning id into new_image;
  return new_image;
end $f$;
revoke all on function public.register_catalog_image(uuid,text,text,smallint,text,integer) from public,anon,authenticated,service_role;
grant execute on function public.register_catalog_image(uuid,text,text,smallint,text,integer) to authenticated;

create or replace function public.update_catalog_image(target_id uuid,new_alt_text text,new_sort_order smallint)
returns void language plpgsql volatile security definer set search_path=''
as $f$ begin
  perform private.require_catalog_manager();
  update public.product_images set alt_text=btrim(new_alt_text),sort_order=new_sort_order where id=target_id;
  if not found then raise exception 'image not found' using errcode='P0002'; end if;
end $f$;
revoke all on function public.update_catalog_image(uuid,text,smallint) from public,anon,authenticated,service_role;
grant execute on function public.update_catalog_image(uuid,text,smallint) to authenticated;

create or replace function public.delete_catalog_image(target_id uuid)
returns text language plpgsql volatile security definer set search_path=''
as $f$ declare deleted_path text; begin
  perform private.require_catalog_manager();
  delete from public.product_images where id=target_id returning object_path into deleted_path;
  if deleted_path is null then raise exception 'image not found' using errcode='P0002'; end if;
  return deleted_path;
end $f$;
revoke all on function public.delete_catalog_image(uuid) from public,anon,authenticated,service_role;
grant execute on function public.delete_catalog_image(uuid) to authenticated;

notify pgrst,'reload schema';
commit;
