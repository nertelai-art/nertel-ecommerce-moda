begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select plan(7);

select hasnt_function('public','server_quote_cart',array['jsonb'],'The unlimited quote function is gone, not merely shadowed');
select has_function('public','server_quote_cart',array['jsonb','text'],'Quoting a cart now takes a rate key');
select ok(not has_function_privilege('anon','public.server_quote_cart(jsonb,text)','EXECUTE'),'Anon cannot reach the backend quote function');
select ok(not has_function_privilege('authenticated','public.server_quote_cart(jsonb,text)','EXECUTE'),'Authenticated clients cannot reach it either');

-- Sense identitat del client no s'imposa cap limit, i es a proposit: l'unica
-- alternativa seria un diposit compartit, que deixaria un sol client bloquejar
-- la botiga sencera.
select lives_ok(
  $probe$select private.consume_commerce_limit(null,'quote',60,60)$probe$,
  'A null rate key skips the limit instead of sharing one bucket'
);

select lives_ok(
  $fill$do $loop$ begin
    for counter in 1..60 loop
      perform private.consume_commerce_limit('0123456789abcdef0123456789abcdef','quote',60,60);
    end loop;
  end $loop$$fill$,
  'Sixty quotes in the window are allowed'
);

select throws_ok(
  $over$select private.consume_commerce_limit('0123456789abcdef0123456789abcdef','quote',60,60)$over$,
  'P0001',
  'rate limit exceeded',
  'The sixty-first quote in the same window is rejected'
);

select * from finish();
rollback;
