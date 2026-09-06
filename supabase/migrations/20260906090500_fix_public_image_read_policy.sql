-- APLICADA. Es una migracio de la cadena: s'executa com totes les altres.
-- Correccio de la politica de lectura publica dels objectes d'imatge.
--
-- La versio original comparava «i.object_path = name». Dins la subconsulta,
-- public.products es a la clausula FROM i te una columna «name», de manera que
-- Postgres resolia l'identificador sense qualificar contra products.name en
-- comptes de contra storage.objects.name. Es pot comprovar a pg_policies, que
-- retorna l'expressio ja resolta com «i.object_path = p.name».
--
-- Efecte del defecte: cap objecte del cubell era llegible amb la clau publica,
-- perque el cami d'un fitxer no coincideix mai amb el nom comercial d'un
-- producte. Les fotografies pujades des del panell retornaven 404 a la botiga.
--
-- La correccio qualifica explicitament la referencia a la taula de la politica
-- i, a mes, ja no posa cap taula amb columna «name» a l'abast de la
-- subconsulta: products hi entra nomes per la clau, amb un EXISTS niuat.

begin;

drop policy product_images_storage_public_read on storage.objects;

create policy product_images_storage_public_read on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'product-images'
  and exists (
    select 1
    from public.product_images i
    where i.object_path = objects.name
      and exists (
        select 1 from public.products p
        where p.id = i.product_id and p.status = 'published'
      )
  )
);

comment on policy product_images_storage_public_read on storage.objects is
  'Lectura publica d''un objecte nomes si hi ha una fila de product_images amb aquest object_path i el producte esta publicat. La referencia a objects.name va qualificada a proposit.';

commit;
