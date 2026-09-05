begin;
create table private.shipments(
 id uuid primary key default gen_random_uuid(), order_id uuid not null unique references private.orders(id) on delete restrict,
 status text not null default 'pending' check(status in('pending','packing','ready','shipped','delivered')),
 carrier text not null default '' check(length(carrier)<=120), tracking_number text not null default '' check(length(tracking_number)<=160),
 notes text not null default '' check(length(notes)<=1000), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
); alter table private.shipments enable row level security;
create table private.shipment_events(
 id uuid primary key default gen_random_uuid(),shipment_id uuid not null references private.shipments(id) on delete restrict,
 from_status text,to_status text not null,actor_id uuid not null references auth.users(id) on delete restrict,note text not null default '',created_at timestamptz not null default now()
); alter table private.shipment_events enable row level security;

create function private.require_fulfiller() returns void language plpgsql stable security invoker set search_path=''
as $f$ begin if not('orders.fulfill'=any(private.current_staff_permissions())) then raise exception 'insufficient fulfillment permission' using errcode='42501'; end if; end $f$;
revoke all on function private.require_fulfiller() from public,anon,authenticated,service_role; grant execute on function private.require_fulfiller() to authenticated;

create function private.staff_fulfillment_queue() returns table(order_id uuid,email text,shipping_address jsonb,amount_minor bigint,currency text,created_at timestamptz,items jsonb,shipment_id uuid,shipment_status text,carrier text,tracking_number text,notes text,events jsonb)
language plpgsql stable security definer set search_path='' as $f$ begin perform private.require_fulfiller(); return query
select o.id,o.email,o.shipping_address,o.amount_minor,o.currency,o.created_at,
 coalesce((select jsonb_agg(jsonb_build_object('name',i.product_name,'sku',i.sku,'size',i.size,'color',i.color,'quantity',i.quantity) order by i.product_name) from private.order_items i where i.order_id=o.id),'[]'::jsonb),
 s.id,s.status,s.carrier,s.tracking_number,s.notes,
 coalesce((select jsonb_agg(jsonb_build_object('fromStatus',e.from_status,'toStatus',e.to_status,'note',e.note,'createdAt',e.created_at) order by e.created_at desc) from private.shipment_events e where e.shipment_id=s.id),'[]'::jsonb)
from private.orders o left join private.shipments s on s.order_id=o.id where o.status='paid' order by o.created_at,s.created_at; end $f$;
revoke all on function private.staff_fulfillment_queue() from public,anon,authenticated,service_role; grant execute on function private.staff_fulfillment_queue() to authenticated;
create function public.staff_fulfillment_queue() returns table(order_id uuid,email text,shipping_address jsonb,amount_minor bigint,currency text,created_at timestamptz,items jsonb,shipment_id uuid,shipment_status text,carrier text,tracking_number text,notes text,events jsonb)
language sql stable security invoker set search_path='' as $f$ select * from private.staff_fulfillment_queue() $f$;
revoke all on function public.staff_fulfillment_queue() from public,anon,authenticated,service_role; grant execute on function public.staff_fulfillment_queue() to authenticated;

create function public.create_shipment(target_order uuid,new_notes text default '') returns uuid language plpgsql volatile security definer set search_path='' as $f$ declare sid uuid; begin
 perform private.require_fulfiller(); if not exists(select 1 from private.orders where id=target_order and status='paid') then raise exception 'only paid orders can be fulfilled' using errcode='55000'; end if;
 insert into private.shipments(order_id,notes) values(target_order,btrim(new_notes)) returning id into sid;
 insert into private.shipment_events(shipment_id,from_status,to_status,actor_id,note) values(sid,null,'pending',auth.uid(),'Expedició creada'); return sid; end $f$;
revoke all on function public.create_shipment(uuid,text) from public,anon,authenticated,service_role; grant execute on function public.create_shipment(uuid,text) to authenticated;

create function public.advance_shipment(target_shipment uuid,new_status text,new_carrier text,new_tracking_number text,event_note text) returns void language plpgsql volatile security definer set search_path='' as $f$ declare current_status text; begin
 perform private.require_fulfiller(); select status into current_status from private.shipments where id=target_shipment for update; if not found then raise exception 'shipment not found' using errcode='P0002'; end if;
 if not ((current_status='pending' and new_status='packing') or(current_status='packing' and new_status='ready') or(current_status='ready' and new_status='shipped') or(current_status='shipped' and new_status='delivered')) then raise exception 'invalid shipment transition' using errcode='55000'; end if;
 if new_status='shipped' and(length(btrim(new_carrier))<2 or length(btrim(new_tracking_number))<3) then raise exception 'tracking required' using errcode='22023'; end if;
 update private.shipments set status=new_status,carrier=btrim(new_carrier),tracking_number=btrim(new_tracking_number),updated_at=now() where id=target_shipment;
 insert into private.shipment_events(shipment_id,from_status,to_status,actor_id,note) values(target_shipment,current_status,new_status,auth.uid(),btrim(event_note)); end $f$;
revoke all on function public.advance_shipment(uuid,text,text,text,text) from public,anon,authenticated,service_role; grant execute on function public.advance_shipment(uuid,text,text,text,text) to authenticated;
notify pgrst,'reload schema'; commit;
