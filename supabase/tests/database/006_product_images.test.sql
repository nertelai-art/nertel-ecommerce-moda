begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select plan(16);
update private.security_settings set require_staff_mfa = true where singleton;

select has_table('public','product_images','Product image metadata table exists');
select ok((select relrowsecurity from pg_class where oid='public.product_images'::regclass),'RLS is active on product images');
select ok(not has_table_privilege('anon','public.product_images','INSERT'),'Anon cannot insert image metadata');
select ok(not has_function_privilege('anon','public.register_catalog_image(uuid,text,text,smallint,text,integer)','EXECUTE'),'Anon cannot register images');
select ok(not has_function_privilege('service_role','public.delete_catalog_image(uuid)','EXECUTE'),'Service role is not an implicit image manager');

insert into storage.objects(bucket_id,name,metadata) values
('product-images','20000000-0000-4000-8000-000000000001/70000000-0000-4000-8000-000000000001.webp','{"mimetype":"image/webp","size":12}'),
('product-images','20000000-0000-4000-8000-000000000002/70000000-0000-4000-8000-000000000002.webp','{"mimetype":"image/webp","size":12}');

insert into public.product_images(id,product_id,object_path,alt_text,sort_order,mime_type,byte_size) values
('70000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001/70000000-0000-4000-8000-000000000001.webp','Imatge pública',0,'image/webp',12),
('70000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002/70000000-0000-4000-8000-000000000002.webp','Imatge privada',0,'image/webp',12);
set local role anon;
select is((select count(*) from public.product_images),1::bigint,'Anon sees images of published products only');
reset role;

select is((select count(*) from storage.buckets where id='product-images' and not public and file_size_limit=5242880),1::bigint,'Private bucket has the size limit');
select is((select count(*) from storage.buckets where id='product-images' and allowed_mime_types=array['image/jpeg','image/png','image/webp']),1::bigint,'Bucket limits MIME types');

insert into auth.users(id,email) values ('78000000-0000-4000-8000-000000000001','images-staff@example.invalid');
insert into private.staff_permissions(user_id,permission) values ('78000000-0000-4000-8000-000000000001','catalog.manage');
insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at) values ('79000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000001','totp','verified',now(),now());
insert into auth.sessions(id,user_id,factor_id,aal) values ('7a000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000001','79000000-0000-4000-8000-000000000001','aal2');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"78000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1","session_id":"7a000000-0000-4000-8000-000000000001"}',true);
select throws_ok('select * from public.staff_catalog_images()','42501',null,'AAL1 cannot list images');
select set_config('request.jwt.claims','{"sub":"78000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2","session_id":"7a000000-0000-4000-8000-000000000001"}',true);
select is((select count(*) from public.staff_catalog_images()),2::bigint,'Manager sees published and draft image metadata');
select lives_ok($$select public.update_catalog_image('70000000-0000-4000-8000-000000000002','Text actualitzat',3::smallint)$$,'Manager updates image metadata');
select lives_ok($$insert into storage.objects(bucket_id,name,owner_id) values('product-images','20000000-0000-4000-8000-000000000002/71000000-0000-4000-8000-000000000001.webp','78000000-0000-4000-8000-000000000001')$$,'AAL2 manager may insert a valid object path');
select throws_ok($$insert into storage.objects(bucket_id,name,owner_id) values('product-images','unsafe.webp','78000000-0000-4000-8000-000000000001')$$,'42501',null,'Invalid object paths are rejected');
select ok((select count(*)=1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='product_images_storage_staff_delete'),'Storage deletion policy exists for managers');
select lives_ok($$select public.delete_catalog_image('70000000-0000-4000-8000-000000000002')$$,'Manager deletes private image metadata');
reset role;
select is((select alt_text from public.product_images where id='70000000-0000-4000-8000-000000000001'),'Imatge pública','Published metadata remains intact');

select * from finish();
rollback;
