-- PASO 1: Categorías de comercios
INSERT INTO merchant_categories (id, name, slug, icon, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Restaurantes', 'restaurantes', '🍽️', 1),
  ('a0000000-0000-0000-0000-000000000002', 'Comida Rápida', 'comida-rapida', '🍔', 2),
  ('a0000000-0000-0000-0000-000000000003', 'Farmacias', 'farmacias', '💊', 3),
  ('a0000000-0000-0000-0000-000000000004', 'Supermercados', 'supermercados', '🛒', 4),
  ('a0000000-0000-0000-0000-000000000005', 'Cafeterías', 'cafeterias', '☕', 5)
ON CONFLICT (id) DO NOTHING;
