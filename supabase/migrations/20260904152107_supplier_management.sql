begin;

alter table private.staff_permissions drop constraint staff_permissions_permission_check;
alter table private.staff_permissions add constraint staff_permissions_permission_check check (
  permission = any(array['catalog.manage','inventory.manage','orders.fulfill','customers.read','suppliers.manage','refunds.create','staff.manage'])
);

create table private.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(btrim(name)) between 2 and 120),
  contact_name text not null default '' check(length(contact_name) <= 120),
  email text not null check(length(email) between 3 and 254),
  phone text not null default '' check(length(phone) <= 40),
  status text not null default 'active' check(status in ('active','paused','archived')),
  lead_time_days integer not null default 7 check(lead_time_days between 0 and 365),
  minimum_order_minor bigint not null default 0 check(minimum_order_minor between 0 and 9007199254740991),
  currency text not null default 'EUR' check(currency ~ '^[A-Z]{3}$'),
  notes text not null default '' check(length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table private.suppliers enable row level security;

create table private.supplier_products (
  supplier_id uuid not null references private.suppliers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  supplier_sku text not null default '' check(length(supplier_sku) <= 120),
  unit_cost_minor bigint check(unit_cost_minor between 0 and 9007199254740991),
  currency text not null default 'EUR' check(currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  primary key(supplier_id, product_id)
);
alter table private.supplier_products enable row level security;

create function private.require_supplier_manager() returns void
language plpgsql stable security invoker set search_path=''
as $function$ begin
  if not ('suppliers.manage'=any(private.current_staff_permissions())) then
    raise exception 'insufficient supplier permission' using errcode='42501';
  end if;
end $function$;
revoke all on function private.require_supplier_manager() from public,anon,authenticated,service_role;
grant execute on function private.require_supplier_manager() to authenticated;

create function private.staff_suppliers() returns table(
  id uuid,name text,contact_name text,email text,phone text,status text,
  lead_time_days integer,minimum_order_minor bigint,currency text,notes text,
  updated_at timestamptz,products jsonb
) language plpgsql stable security definer set search_path=''
as $function$ begin
  perform private.require_supplier_manager();
  return query select s.id,s.name,s.contact_name,s.email,s.phone,s.status,
    s.lead_time_days,s.minimum_order_minor,s.currency,s.notes,s.updated_at,
    coalesce(jsonb_agg(jsonb_build_object(
      'id',p.id,'name',p.name,'slug',p.slug,'supplierSku',sp.supplier_sku,
      'unitCostMinor',sp.unit_cost_minor,'currency',sp.currency
    ) order by p.name) filter(where p.id is not null),'[]'::jsonb)
  from private.suppliers s
  left join private.supplier_products sp on sp.supplier_id=s.id
  left join public.products p on p.id=sp.product_id
  group by s.id order by s.name;
end $function$;
revoke all on function private.staff_suppliers() from public,anon,authenticated,service_role;
grant execute on function private.staff_suppliers() to authenticated;

create function public.staff_suppliers() returns table(
  id uuid,name text,contact_name text,email text,phone text,status text,
  lead_time_days integer,minimum_order_minor bigint,currency text,notes text,
  updated_at timestamptz,products jsonb
) language sql stable security invoker set search_path=''
as $function$ select * from private.staff_suppliers() $function$;
revoke all on function public.staff_suppliers() from public,anon,authenticated,service_role;
grant execute on function public.staff_suppliers() to authenticated;

create function public.create_supplier(
  supplier_name text,supplier_contact text,supplier_email text,supplier_phone text,
  supplier_lead_days integer,supplier_minimum_minor bigint,supplier_notes text
) returns uuid language plpgsql volatile security definer set search_path=''
as $function$ declare new_id uuid; begin
  perform private.require_supplier_manager();
  insert into private.suppliers(name,contact_name,email,phone,lead_time_days,minimum_order_minor,notes)
  values(btrim(supplier_name),btrim(supplier_contact),lower(btrim(supplier_email)),btrim(supplier_phone),supplier_lead_days,supplier_minimum_minor,btrim(supplier_notes))
  returning id into new_id; return new_id;
end $function$;
revoke all on function public.create_supplier(text,text,text,text,integer,bigint,text) from public,anon,authenticated,service_role;
grant execute on function public.create_supplier(text,text,text,text,integer,bigint,text) to authenticated;

create function public.update_supplier(
  target_id uuid,supplier_name text,supplier_contact text,supplier_email text,supplier_phone text,
  supplier_status text,supplier_lead_days integer,supplier_minimum_minor bigint,supplier_notes text
) returns void language plpgsql volatile security definer set search_path=''
as $function$ begin
  perform private.require_supplier_manager();
  update private.suppliers set name=btrim(supplier_name),contact_name=btrim(supplier_contact),
    email=lower(btrim(supplier_email)),phone=btrim(supplier_phone),status=supplier_status,
    lead_time_days=supplier_lead_days,minimum_order_minor=supplier_minimum_minor,
    notes=btrim(supplier_notes),updated_at=now() where id=target_id;
  if not found then raise exception 'supplier not found' using errcode='P0002'; end if;
end $function$;
revoke all on function public.update_supplier(uuid,text,text,text,text,text,integer,bigint,text) from public,anon,authenticated,service_role;
grant execute on function public.update_supplier(uuid,text,text,text,text,text,integer,bigint,text) to authenticated;

create function public.set_supplier_product(target_supplier uuid,target_product uuid,new_supplier_sku text,new_unit_cost_minor bigint)
returns void language plpgsql volatile security definer set search_path=''
as $function$ begin
  perform private.require_supplier_manager();
  insert into private.supplier_products(supplier_id,product_id,supplier_sku,unit_cost_minor)
  values(target_supplier,target_product,btrim(new_supplier_sku),new_unit_cost_minor)
  on conflict(supplier_id,product_id) do update set supplier_sku=excluded.supplier_sku,unit_cost_minor=excluded.unit_cost_minor;
end $function$;
revoke all on function public.set_supplier_product(uuid,uuid,text,bigint) from public,anon,authenticated,service_role;
grant execute on function public.set_supplier_product(uuid,uuid,text,bigint) to authenticated;

notify pgrst,'reload schema';
commit;
