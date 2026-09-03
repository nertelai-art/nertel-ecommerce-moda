-- Synthetic catalog for LOCAL development only. Never seed production.
insert into public.categories (id, slug, name, is_active) values
  ('10000000-0000-4000-8000-000000000001', 'demo-vestits', 'DEMO · Vestits', true),
  ('10000000-0000-4000-8000-000000000002', 'demo-privat', 'DEMO · Categoria oculta', false);

insert into public.products (id, slug, name, description, status) values
  ('20000000-0000-4000-8000-000000000001', 'demo-vestit', 'DEMO · Vestit de prova', 'Dada fictícia per al desenvolupament. No està a la venda.', 'published'),
  ('20000000-0000-4000-8000-000000000002', 'demo-esborrany', 'DEMO · Esborrany privat', '', 'draft'),
  ('20000000-0000-4000-8000-000000000003', 'demo-arxivat', 'DEMO · Producte arxivat', '', 'archived');

insert into public.product_categories (product_id, category_id) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002');

insert into public.product_variants (id, product_id, sku, size, color, price_minor, currency, is_active) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'DEMO-DRESS-M-SAND', 'M', 'sorra', 4990, 'EUR', true),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'DEMO-DRESS-L-SAND', 'L', 'sorra', 4990, 'EUR', false),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'DEMO-DRAFT-M', 'M', 'sorra', 1990, 'EUR', true);

insert into private.inventory_locations (id, code, name) values
  ('40000000-0000-4000-8000-000000000001', 'DEMO', 'Ubicació fictícia');
insert into private.inventory_levels (variant_id, location_id) values
  ('30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001');
-- No stock, credentials, users, staff permissions or real orders are seeded.
