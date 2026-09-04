begin;
drop function if exists public.staff_finance_sales();
drop function if exists private.staff_finance_sales();

create function private.staff_finance_sales(report_days integer default null)
returns table(order_id uuid,occurred_at timestamptz,product_id uuid,product_name text,sku text,quantity integer,revenue_minor bigint,estimated_cost_minor bigint,currency text)
language plpgsql stable security definer set search_path=''
as $function$
begin
  perform private.require_finance_reader();
  if report_days is not null and report_days not in (30,90,365) then raise exception 'invalid finance period' using errcode='22023'; end if;
  return query select o.id,o.updated_at,variant.product_id,item.product_name,item.sku,item.quantity,item.line_total_minor,
    case when cost.unit_cost_minor is null then null else cost.unit_cost_minor*item.quantity end,item.currency
  from private.orders o join private.order_items item on item.order_id=o.id
  join public.product_variants variant on variant.id=item.variant_id
  left join lateral(select min(link.unit_cost_minor) unit_cost_minor from private.supplier_products link
    join private.suppliers supplier on supplier.id=link.supplier_id where link.product_id=variant.product_id
    and link.currency=item.currency and link.unit_cost_minor is not null and supplier.status='active') cost on true
  where o.status='paid' and (report_days is null or o.updated_at>=current_timestamp-make_interval(days=>report_days))
    and exists(select 1 from private.payment_attempts payment where payment.order_id=o.id and payment.status='succeeded')
  order by o.updated_at desc,o.id,item.id;
end $function$;
revoke all on function private.staff_finance_sales(integer) from public,anon,authenticated,service_role;
grant execute on function private.staff_finance_sales(integer) to authenticated;

create function public.staff_finance_sales(report_days integer default null)
returns table(order_id uuid,occurred_at timestamptz,product_id uuid,product_name text,sku text,quantity integer,revenue_minor bigint,estimated_cost_minor bigint,currency text)
language sql stable security invoker set search_path='' as $function$ select * from private.staff_finance_sales(report_days); $function$;
revoke all on function public.staff_finance_sales(integer) from public,anon,authenticated,service_role;
grant execute on function public.staff_finance_sales(integer) to authenticated;
comment on function public.staff_finance_sales(integer) is 'Paid and provider-confirmed sales for finance staff. Costs are current lowest active supplier costs and are estimates, never accounting snapshots.';
notify pgrst,'reload schema';
commit;
