-- Fictitious suppliers for LOCAL UI development only.
insert into private.suppliers(id,name,contact_name,email,phone,status,lead_time_days,minimum_order_minor,notes) values
('a1000000-0000-4000-8000-000000000001','Taller Tramuntana','Marta Rius','marta@tramuntana.example.invalid','+34 900 000 101','active',12,50000,'Confecció de peces exteriors i sèries curtes.'),
('a1000000-0000-4000-8000-000000000002','Teixits Empordà','Pau Soler','pau@emporda.example.invalid','+34 900 000 102','active',6,25000,'Teixits naturals i mostres de color.'),
('a1000000-0000-4000-8000-000000000003','Accessoris Llevant','Clara Ferrer','clara@llevant.example.invalid','+34 900 000 103','paused',18,15000,'Producció temporalment en pausa.')
on conflict(id) do nothing;
insert into private.supplier_products(supplier_id,product_id,supplier_sku,unit_cost_minor) values
('a1000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000006','TR-JT-01',5400),
('a1000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','TE-VA-01',3200),
('a1000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000004','TE-CB-01',2100),
('a1000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000010','AL-BN-01',2800)
on conflict(supplier_id,product_id) do nothing;
