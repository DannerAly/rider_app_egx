-- PASO 5: Cupones
INSERT INTO coupons (id, code, description, discount_type, discount_value, min_order_amount, max_discount, max_uses, max_uses_per_user, current_uses, starts_at, expires_at, is_active) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'BIENVENIDO', 'Descuento de bienvenida para nuevos usuarios', 'percentage', 15.00, 30.00, 25.00, 500, 1, 23, '2025-01-01', '2026-12-31', true),
  ('e0000000-0000-0000-0000-000000000002', 'DELIVERY10', '10 Bs de descuento en delivery', 'fixed', 10.00, 40.00, NULL, 1000, 3, 156, '2025-06-01', '2026-06-30', true),
  ('e0000000-0000-0000-0000-000000000003', 'FINDE20', '20% descuento los fines de semana', 'percentage', 20.00, 50.00, 40.00, 200, 2, 87, '2025-09-01', '2026-03-31', true),
  ('e0000000-0000-0000-0000-000000000004', 'SUSHI50', '50% en tu primer pedido de Sushi Zen', 'percentage', 50.00, 60.00, 50.00, 100, 1, 34, '2025-11-01', '2026-04-30', true),
  ('e0000000-0000-0000-0000-000000000005', 'PROMO2026', 'Promoción año nuevo 2026', 'fixed', 15.00, 35.00, NULL, 300, 1, 210, '2026-01-01', '2026-01-31', false)
ON CONFLICT (id) DO NOTHING;
