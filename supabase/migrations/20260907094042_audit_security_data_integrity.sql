begin;

-- Les cotitzacions externes passen pel backend amb limit de ritme.
-- Les funcions SECURITY DEFINER de reserva poden continuar cridant la funcio.
revoke all on function public.quote_cart(jsonb) from public, anon, authenticated, service_role;

-- JSON escalar: PostgREST no trunca una instantania a db-max-rows.
-- SECURITY INVOKER conserva RLS i els permisos de cada funcio administrativa.
create function public.staff_snapshot(resource text, report_days integer default null)
returns jsonb language plpgsql stable security invoker set search_path = ''
as $function$
declare result jsonb;
begin
  case resource
    when 'orders' then select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into result from (select * from public.staff_orders() limit 5001) r;
    when 'customers' then select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into result from (select * from public.staff_customers() limit 5001) r;
    when 'finance' then select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into result from (select * from public.staff_finance_sales(report_days) limit 5001) r;
    when 'inventory' then select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into result from (select * from public.staff_inventory() limit 5001) r;
    when 'suppliers' then select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into result from (select * from public.staff_suppliers() limit 5001) r;
    when 'fulfillment' then select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into result from (select * from public.staff_fulfillment_queue() limit 5001) r;
    when 'catalog' then select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into result from (select * from public.staff_catalog() limit 5001) r;
    when 'variants' then select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into result from (select * from public.staff_catalog_variants() limit 5001) r;
    when 'categories' then select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into result from (select * from public.staff_categories() limit 5001) r;
    when 'assignments' then select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into result from (select * from public.staff_product_categories() limit 5001) r;
    when 'images' then select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into result from (select * from public.staff_catalog_images() limit 5001) r;
    else raise exception 'invalid snapshot resource' using errcode = '22023';
  end case;
  if jsonb_array_length(result) > 5000 then
    raise exception 'snapshot limit exceeded; narrow the report period or use a paginated export' using errcode = '54000';
  end if;
  return result;
end;
$function$;
revoke all on function public.staff_snapshot(text, integer) from public, anon, authenticated, service_role;
grant execute on function public.staff_snapshot(text, integer) to authenticated;

-- Els filtres es calculen sobre tot el cataleg visible amb RLS, no una mostra.
create function public.catalog_filters()
returns jsonb language sql stable security invoker set search_path = ''
as $function$
  select jsonb_build_object(
    'sizes', coalesce((select jsonb_agg(s.size order by s.size) from
      (select distinct v.size from public.product_variants v join public.products p on p.id = v.product_id
       where v.is_active and p.status = 'published') s), '[]'::jsonb),
    'colors', coalesce((select jsonb_agg(c.color order by c.color) from
      (select distinct v.color from public.product_variants v join public.products p on p.id = v.product_id
       where v.is_active and p.status = 'published') c), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'slug', c.slug, 'name', c.name) order by c.name, c.id)
      from public.categories c where c.is_active), '[]'::jsonb)
  );
$function$;
revoke all on function public.catalog_filters() from public, anon, authenticated, service_role;
grant execute on function public.catalog_filters() to anon, authenticated;

notify pgrst, 'reload schema';
commit;
