-- PASO 8: Reviews de pedidos entregados
INSERT INTO reviews (id, order_id, customer_id, merchant_id, merchant_rating, rider_rating, comment, created_at) VALUES
  ('80000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', '8b891c74-1718-428d-b945-6335a209b039', 'b0000000-0000-0000-0000-000000000001', 5, 5, 'Excelente pollo, muy jugoso y las papas crocantes. El rider llegó rapidísimo.', '2026-03-04 13:30:00+00'),
  ('80000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', '8b891c74-1718-428d-b945-6335a209b039', 'b0000000-0000-0000-0000-000000000002', 4, 4, 'Las hamburguesas estaban buenísimas pero llegaron un poco frías.', '2026-03-04 20:00:00+00'),
  ('80000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000003', '8b891c74-1718-428d-b945-6335a209b039', 'b0000000-0000-0000-0000-000000000004', 5, 5, 'El mejor café de La Paz, el cheesecake es increíble. Delivery muy rápido.', '2026-03-05 09:00:00+00'),
  ('80000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000008', '8b891c74-1718-428d-b945-6335a209b039', 'b0000000-0000-0000-0000-000000000005', 4, 3, 'Todo bien con los productos, pero el delivery tardó más de lo esperado.', '2026-03-02 16:00:00+00')
ON CONFLICT (id) DO NOTHING;
