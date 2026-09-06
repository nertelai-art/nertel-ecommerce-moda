-- La identitat mínima de la instància deixa de ser una constant compilada.
-- El nom comercial acompanya moneda i país a instance_settings, i s'exposa amb
-- una funció de lectura perquè private no és visible des de PostgREST.
--
-- Els tres valors són públics per naturalesa: el nom surt a la capçalera i la
-- moneda a cada preu. Exposar-los no revela res que la botiga no ensenyi ja.
--
-- Aquesta taula la controla Nertel en crear la botiga. Quan existeixi el panell
-- d'identitat editable pel client (nom comercial, textos legals, contacte),
-- viurà en una taula separada de public; aquesta es queda amb allò que el
-- client no ha de poder canviar sol.

begin;

alter table private.instance_settings
  add column shop_name text not null default 'Botiga de moda'
    constraint instance_settings_shop_name_check
    check (length(btrim(shop_name)) between 1 and 120);

alter table private.instance_settings alter column shop_name drop default;

create function public.shop_settings()
returns table(shop_name text, currency text, country_code text)
language sql stable security definer set search_path = ''
as $function$
  select s.shop_name, s.currency, s.country_code
  from private.instance_settings s
  where s.singleton
$function$;

revoke all on function public.shop_settings() from public, anon, authenticated, service_role;
grant execute on function public.shop_settings() to anon, authenticated;

comment on function public.shop_settings() is
  'Identitat mínima de la instància per a la capçalera i el format de preus. Nomes lectura, una sola fila, sense dades sensibles.';

notify pgrst, 'reload schema';
commit;
