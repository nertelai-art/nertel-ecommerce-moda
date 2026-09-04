-- Synthetic catalog for LOCAL development only. Never seed production.
insert into public.categories (id, slug, name, is_active) values
  ('10000000-0000-4000-8000-000000000001', 'vestits', 'Vestits', true),
  ('10000000-0000-4000-8000-000000000003', 'camises', 'Camises', true),
  ('10000000-0000-4000-8000-000000000004', 'pantalons', 'Pantalons', true),
  ('10000000-0000-4000-8000-000000000005', 'jaquetes', 'Jaquetes', true),
  ('10000000-0000-4000-8000-000000000006', 'accessoris', 'Accessoris', true),
  ('10000000-0000-4000-8000-000000000002', 'demo-privat', 'DEMO · Categoria oculta', false);

insert into public.products (id, slug, name, description, status) values
  ('20000000-0000-4000-8000-000000000001', 'vestit-alba', 'Vestit Alba', 'Vestit midi de línia fluida i tacte lleuger. Una peça versàtil per portar sola o amb una jaqueta estructurada.\n\nComposició de demostració: barreja de lli i viscosa.', 'published'),
  ('20000000-0000-4000-8000-000000000004', 'camisa-brisa', 'Camisa Brisa', 'Camisa relaxada amb coll obert, espatlla suau i acabat rentat. Pensada per combinar amb pantalons amplis.', 'published'),
  ('20000000-0000-4000-8000-000000000005', 'pantalons-ona', 'Pantalons Ona', 'Pantalons de cintura alta, pinces frontals i cama ampla. Teixit lleuger amb caiguda natural.', 'published'),
  ('20000000-0000-4000-8000-000000000006', 'jaqueta-terra', 'Jaqueta Terra', 'Jaqueta desestructurada de tres botons amb butxaques aplicades. Una capa lleugera per a cada dia.', 'published'),
  ('20000000-0000-4000-8000-000000000007', 'sobrecamisa-bosc', 'Sobrecamisa Bosc', 'Sobrecamisa de tall recte en verd oliva profund. Es pot portar com a camisa o com a jaqueta lleugera.', 'published'),
  ('20000000-0000-4000-8000-000000000008', 'pantalons-calc', 'Pantalons Calç', 'Pantalons relaxats color cru amb cintura neta i cama recta. Un fons d’armari lluminós.', 'published'),
  ('20000000-0000-4000-8000-000000000009', 'mocador-argila', 'Mocador Argila', 'Mocador quadrat de tacte suau i acabat mat. Dissenyat per aportar textura i color.', 'published'),
  ('20000000-0000-4000-8000-000000000010', 'bossa-nus', 'Bossa Nus', 'Bossa flexible de mida mitjana amb nansa ampla. Prototip de demostració sense venda real.', 'published'),
  ('20000000-0000-4000-8000-000000000002', 'demo-esborrany', 'DEMO · Esborrany privat', '', 'draft'),
  ('20000000-0000-4000-8000-000000000003', 'demo-arxivat', 'DEMO · Producte arxivat', '', 'archived');

insert into public.product_categories (product_id, category_id) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000003'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000004'),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000005'),
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000003'),
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000005'),
  ('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000004'),
  ('20000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000006'),
  ('20000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000006'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002');

insert into public.product_variants (id, product_id, sku, size, color, price_minor, currency, is_active) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'ALBA-M-SORRA', 'M', 'sorra', 8990, 'EUR', true),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'ALBA-L-SORRA', 'L', 'sorra', 8990, 'EUR', true),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000004', 'BRISA-S-IVORI', 'S', 'ivori', 5990, 'EUR', true),
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000004', 'BRISA-M-IVORI', 'M', 'ivori', 5990, 'EUR', true),
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000005', 'ONA-M-SORRA', 'M', 'sorra', 7490, 'EUR', true),
  ('30000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000005', 'ONA-L-SORRA', 'L', 'sorra', 7490, 'EUR', true),
  ('30000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000006', 'TERRA-M-PEDRA', 'M', 'pedra', 11900, 'EUR', true),
  ('30000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000006', 'TERRA-L-PEDRA', 'L', 'pedra', 11900, 'EUR', true),
  ('30000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000007', 'BOSC-M-OLIVA', 'M', 'oliva', 7990, 'EUR', true),
  ('30000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000007', 'BOSC-L-OLIVA', 'L', 'oliva', 7990, 'EUR', true),
  ('30000000-0000-4000-8000-000000000012', '20000000-0000-4000-8000-000000000008', 'CALC-M-CRU', 'M', 'cru', 7290, 'EUR', true),
  ('30000000-0000-4000-8000-000000000013', '20000000-0000-4000-8000-000000000008', 'CALC-L-CRU', 'L', 'cru', 7290, 'EUR', true),
  ('30000000-0000-4000-8000-000000000014', '20000000-0000-4000-8000-000000000009', 'ARGILA-UNICA', 'Única', 'argila', 3490, 'EUR', true),
  ('30000000-0000-4000-8000-000000000015', '20000000-0000-4000-8000-000000000010', 'NUS-UNICA-XOCOLATA', 'Única', 'xocolata', 6990, 'EUR', true),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'DEMO-DRAFT-M', 'M', 'sorra', 1990, 'EUR', true);

insert into private.inventory_locations (id, code, name) values
  ('40000000-0000-4000-8000-000000000001', 'DEMO', 'Ubicació fictícia');
insert into private.inventory_levels (variant_id, location_id, on_hand) values
  ('30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 8),
  ('30000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', 5),
  ('30000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000001', 6),
  ('30000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000001', 9),
  ('30000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000001', 7),
  ('30000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000001', 4),
  ('30000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000001', 3),
  ('30000000-0000-4000-8000-000000000009', '40000000-0000-4000-8000-000000000001', 3),
  ('30000000-0000-4000-8000-000000000010', '40000000-0000-4000-8000-000000000001', 8),
  ('30000000-0000-4000-8000-000000000011', '40000000-0000-4000-8000-000000000001', 6),
  ('30000000-0000-4000-8000-000000000012', '40000000-0000-4000-8000-000000000001', 5),
  ('30000000-0000-4000-8000-000000000013', '40000000-0000-4000-8000-000000000001', 5),
  ('30000000-0000-4000-8000-000000000014', '40000000-0000-4000-8000-000000000001', 12),
  ('30000000-0000-4000-8000-000000000015', '40000000-0000-4000-8000-000000000001', 4);
-- No credentials, users, staff permissions or real orders are seeded.
