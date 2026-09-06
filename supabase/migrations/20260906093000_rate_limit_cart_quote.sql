-- El pressupost del carret era l'unica operacio de comerc sense limit de
-- ritme. S'exposa sense autenticar i recorre fins a cent variants per peticio,
-- de manera que era la via mes barata per carregar la base de dades d'una
-- botiga des de fora.
--
-- La clau de ritme passa a poder ser nula. Quan el desplegament no te cap
-- manera d'identificar el client -- ni adreca de confianca ni sessio de compra
-- -- limitar nomes deixa dues sortides, i totes dues son pitjors que no
-- limitar: una clau per peticio no limita res, i una clau compartida deixa que
-- un sol client bloquegi la botiga sencera. Aqui s'omet el limit a proposit, i
-- es diu en veu alta en comptes de dissimular-ho amb una constant.

begin;

create or replace function private.consume_commerce_limit(input_rate_key text,input_operation text,max_hits integer,window_seconds integer)
returns void language plpgsql volatile security definer set search_path=''
as $f$ declare current_hits integer; begin
  if input_rate_key is null then return; end if;
  if length(input_rate_key) not between 16 and 128 or input_operation not in ('quote','reserve','checkout','cancel')
    or max_hits not between 1 and 100 or window_seconds not between 1 and 86400 then
    raise exception 'invalid rate limit'; end if;
  insert into private.commerce_rate_limits values(input_rate_key,input_operation,now(),1)
  on conflict on constraint commerce_rate_limits_pkey do update set
    window_start=case when private.commerce_rate_limits.window_start<=now()-make_interval(secs=>window_seconds) then now() else private.commerce_rate_limits.window_start end,
    hits=case when private.commerce_rate_limits.window_start<=now()-make_interval(secs=>window_seconds) then 1 else private.commerce_rate_limits.hits+1 end
  returning hits into current_hits;
  if current_hits>max_hits then raise exception 'rate limit exceeded' using errcode='P0001'; end if;
end $f$;
revoke all on function private.consume_commerce_limit(text,text,integer,integer) from public,anon,authenticated,service_role;
comment on function private.consume_commerce_limit(text,text,integer,integer) is
  'Diposit per clau i operacio. Una clau nula vol dir que no hi ha manera d''identificar el client i el limit s''omet: mai un diposit compartit, que seria una denegacio de servei contra la clientela legitima.';

-- El pressupost es mes generos que la reserva perque la pagina del carret en
-- demana un a cada canvi de quantitat: seixanta per minut cobreixen de sobres
-- una persona editant el carret i acoten l'abus a un per segon.
drop function public.server_quote_cart(jsonb);
create function public.server_quote_cart(cart jsonb,rate_key text)
returns jsonb language plpgsql volatile security definer set search_path=''
as $f$ begin
  perform private.consume_commerce_limit(rate_key,'quote',60,60);
  perform private.release_expired_reservations(1000);
  return public.quote_cart(cart);
end $f$;
revoke all on function public.server_quote_cart(jsonb,text) from public,anon,authenticated,service_role;
grant execute on function public.server_quote_cart(jsonb,text) to service_role;

notify pgrst, 'reload schema';
commit;
