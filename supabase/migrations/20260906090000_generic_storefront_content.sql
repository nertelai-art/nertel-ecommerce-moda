-- APLICADA. Es una migracio de la cadena: s'executa com totes les altres.
-- La validacio del contingut de l'aparador deixa de coneixer els blocs i els
-- fitxers d'imatge d'aquest client. Passa a validar forma, limits i seguretat
-- del cami d'imatge, sense imposar cap estructura editorial concreta.
--
-- El que es conserva de l'original i per que:
--   - Objecte JSON a l'arrel, com abans.
--   - Limits de longitud per camp, perque un text sense limit trenca la pagina.
--   - Restriccio del cami d'imatge. Abans era una llista blanca de tres
--     fitxers; ara es un patro que nomes admet rutes relatives a l'arrel del
--     lloc amb extensio d'imatge. Aixo segueix impedint URL absolutes,
--     esquemes javascript:, data: i recorregut de directoris (..).
-- El que desapareix:
--   - Els noms de bloc hero/editorial/manifest/closing.
--   - Els tres noms de fitxer de la campanya d'aquest client.

begin;

create or replace function private.validate_storefront_content(value jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $function$
declare
  section_key text;
  section jsonb;
  field_key text;
  field jsonb;
  text_value text;
begin
  if jsonb_typeof(value) <> 'object' then
    raise exception 'invalid storefront content' using errcode = '22023';
  end if;

  -- Cota global: un jsonb sense limit es una via de saturacio del disc i de
  -- la resposta publica del catleg.
  if length(value::text) > 8000 then
    raise exception 'invalid storefront content' using errcode = '22023';
  end if;

  if (select count(*) from jsonb_object_keys(value)) not between 1 and 12 then
    raise exception 'invalid storefront content' using errcode = '22023';
  end if;

  for section_key, section in select key, val from jsonb_each(value) as e(key, val) loop
    if section_key !~ '^[a-zA-Z][a-zA-Z0-9]{0,39}$'
       or jsonb_typeof(section) <> 'object'
       or (select count(*) from jsonb_object_keys(section)) not between 1 and 12
    then
      raise exception 'invalid storefront content' using errcode = '22023';
    end if;

    for field_key, field in select key, val from jsonb_each(section) as e(key, val) loop
      if field_key !~ '^[a-zA-Z][a-zA-Z0-9]{0,39}$'
         or jsonb_typeof(field) <> 'string'
      then
        raise exception 'invalid storefront content' using errcode = '22023';
      end if;

      text_value := field #>> '{}';

      if field_key = 'image' or field_key like '%Image' then
        -- Nomes rutes relatives a l'arrel del lloc, amb extensio d'imatge.
        if text_value !~ '^/[a-z0-9][a-z0-9/_-]{0,120}\.(png|jpg|jpeg|webp|avif)$' then
          raise exception 'invalid storefront content' using errcode = '22023';
        end if;
      elsif length(btrim(text_value)) not between 1 and 320 then
        raise exception 'invalid storefront content' using errcode = '22023';
      end if;
    end loop;
  end loop;

  return value;
end;
$function$;

comment on function private.validate_storefront_content(jsonb) is
  'Valida forma, limits i seguretat del cami d''imatge. No coneix cap bloc ni cap fitxer concret: l''estructura editorial la defineix la capa d''aplicacio de cada instancia.';

-- Neutralitza el text de campanya del primer client, pero NOMES si ningu no
-- l'ha tocat mai. Si la botiga ja ha publicat contingut propi, aquesta
-- sentencia no fa res.
--
-- Es segura d'aplicar avui perque no existeix cap instancia allotjada: l'unica
-- copia d'aquest contingut es la de desenvolupament local. A partir de la
-- primera publicacio real, la condicio no tornara a coincidir mai.
do $bootstrap$
declare
  seeded jsonb := '{"hero":{"eyebrow":"Primavera · Estiu 2026","title":"Menys soroll. Més tu.","description":"Una col·lecció serena de peces versàtils, textures naturals i formes que respiren.","image":"/editorial/campaign-hero.png","imageAlt":"Dues persones amb peces de lli en una arquitectura mediterrània"},"editorial":{"eyebrow":"Històries d’estil","title":"Una manera més tranquil·la de vestir."},"manifest":{"eyebrow":"Manifest 01","title":"Comprar menys. Triar millor. Portar-ho molt."},"closing":{"eyebrow":"La primera edició","title":"Peces per tornar-hi, una vegada i una altra.","description":"Previsualització de la botiga. Pots explorar el catàleg i preparar el carret; els pagaments encara no estan activats."}}'::jsonb;
  neutral jsonb := '{"hero":{"eyebrow":"Nova temporada","title":"El titular de la portada","description":"Aquest text el defineix la botiga des del panell de contingut.","image":"/editorial/campaign-hero.png","imageAlt":"Descripcio de la imatge de portada"},"editorial":{"eyebrow":"Seccio editorial","title":"El titular de la seccio editorial."},"manifest":{"eyebrow":"Manifest","title":"El titular del manifest."},"closing":{"eyebrow":"Tancament","title":"El titular de tancament.","description":"Aquest text el defineix la botiga des del panell de contingut."}}'::jsonb;
begin
  update public.storefront_content set content = neutral where singleton and content = seeded;
  update private.storefront_drafts set content = neutral where singleton and content = seeded;
end
$bootstrap$;

notify pgrst, 'reload schema';
commit;
