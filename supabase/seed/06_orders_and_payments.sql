-- PASO 6: Pedidos de demo
-- NOTA: Necesitas IDs reales de customer_id y rider_id de tu base de datos.
-- Reemplaza los placeholders si es necesario.
-- Primero ejecuta este query para ver tus usuarios:
--   SELECT p.id, p.full_name, p.role FROM profiles p ORDER BY p.role;

-- Usaremos el admin como "customer" temporal para demo y rider_id NULL para algunos
-- Reemplaza 'TU_CUSTOMER_ID' y 'TU_RIDER_ID' con UUIDs reales de tu DB

-- ══ Pedido 1: Entregado (Pollos Copacabana) ══
INSERT INTO orders (id, order_number, tracking_code, customer_id, merchant_id, pickup_address, pickup_lat, pickup_lng, pickup_contact_name, pickup_contact_phone, delivery_address, delivery_lat, delivery_lng, delivery_contact_name, delivery_contact_phone, status, priority, merchant_status, payment_method, payment_status, order_items, subtotal, service_fee, delivery_fee, total_fee, tip_amount, base_fee, distance_km, created_at, delivered_at, is_paid) VALUES
('f0000000-0000-0000-0000-000000000001', 'ORD-2026-0001', 'TRK-A1B2C3', '8b891c74-1718-428d-b945-6335a209b039', 'b0000000-0000-0000-0000-000000000001', 'Av. Arce #2345, Sopocachi', -16.5000, -68.1193, 'Pollos Copacabana', '+59171234567', 'Calle Loayza #456', -16.4950, -68.1350, 'Juan Pérez', '+59179001001', 'delivered', 'normal', 'ready', 'cash', 'succeeded', '[{"name":"Pollo Entero a la Brasa","qty":1,"price":65},{"name":"Coca-Cola 2L","qty":1,"price":15}]', 80.00, 5.00, 12.00, 102.00, 5.00, 12.00, 2.80, '2026-03-04 12:30:00+00', '2026-03-04 13:15:00+00', true)
ON CONFLICT (id) DO NOTHING;

-- ══ Pedido 2: Entregado (Burger House) ══
INSERT INTO orders (id, order_number, tracking_code, customer_id, merchant_id, pickup_address, pickup_lat, pickup_lng, pickup_contact_name, pickup_contact_phone, delivery_address, delivery_lat, delivery_lng, delivery_contact_name, delivery_contact_phone, status, priority, merchant_status, payment_method, payment_status, order_items, subtotal, service_fee, delivery_fee, total_fee, tip_amount, base_fee, distance_km, created_at, delivered_at, is_paid) VALUES
('f0000000-0000-0000-0000-000000000002', 'ORD-2026-0002', 'TRK-D4E5F6', '8b891c74-1718-428d-b945-6335a209b039', 'b0000000-0000-0000-0000-000000000002', 'Calle 21 de Calacoto #789', -16.5320, -68.0850, 'Burger House', '+59172345678', 'Av. Ballivián #123', -16.5200, -68.0900, 'María López', '+59179002002', 'delivered', 'normal', 'ready', 'card', 'succeeded', '[{"name":"Double Smash Burger","qty":2,"price":48},{"name":"Loaded Fries","qty":1,"price":28},{"name":"Milkshake Oreo","qty":2,"price":22}]', 168.00, 10.00, 15.00, 198.00, 10.00, 15.00, 3.50, '2026-03-04 19:00:00+00', '2026-03-04 19:45:00+00', true)
ON CONFLICT (id) DO NOTHING;

-- ══ Pedido 3: Entregado (Café Paceño) ══
INSERT INTO orders (id, order_number, tracking_code, customer_id, merchant_id, pickup_address, pickup_lat, pickup_lng, pickup_contact_name, pickup_contact_phone, delivery_address, delivery_lat, delivery_lng, delivery_contact_name, delivery_contact_phone, status, priority, merchant_status, payment_method, payment_status, order_items, subtotal, service_fee, delivery_fee, total_fee, tip_amount, base_fee, distance_km, created_at, delivered_at, is_paid) VALUES
('f0000000-0000-0000-0000-000000000003', 'ORD-2026-0003', 'TRK-G7H8I9', '8b891c74-1718-428d-b945-6335a209b039', 'b0000000-0000-0000-0000-000000000004', 'Calle Jaén #456, Casco Viejo', -16.4960, -68.1370, 'Café Paceño', '+59174567890', 'Av. Mariscal Santa Cruz #890', -16.5010, -68.1310, 'Carlos Mamani', '+59179003003', 'delivered', 'normal', 'ready', 'cash', 'succeeded', '[{"name":"Desayuno Paceño","qty":2,"price":35},{"name":"Cappuccino","qty":2,"price":18},{"name":"Cheesecake de Maracuyá","qty":1,"price":25}]', 131.00, 8.00, 10.00, 154.00, 5.00, 10.00, 1.80, '2026-03-05 08:00:00+00', '2026-03-05 08:40:00+00', true)
ON CONFLICT (id) DO NOTHING;

-- ══ Pedido 4: En camino (Sushi Zen) ══
INSERT INTO orders (id, order_number, tracking_code, customer_id, merchant_id, pickup_address, pickup_lat, pickup_lng, pickup_contact_name, pickup_contact_phone, delivery_address, delivery_lat, delivery_lng, delivery_contact_name, delivery_contact_phone, status, priority, merchant_status, payment_method, payment_status, order_items, subtotal, service_fee, delivery_fee, total_fee, tip_amount, base_fee, distance_km, created_at, is_paid) VALUES
('f0000000-0000-0000-0000-000000000004', 'ORD-2026-0004', 'TRK-J1K2L3', '8b891c74-1718-428d-b945-6335a209b039', 'b0000000-0000-0000-0000-000000000006', 'Av. Montenegro #567, San Miguel', -16.5280, -68.0920, 'Sushi Zen', '+59176789012', 'Calle 15 de Obrajes #234', -16.5150, -68.1050, 'Ana Quispe', '+59179004004', 'picked_up', 'normal', 'ready', 'card', 'succeeded', '[{"name":"Dragon Roll x10","qty":1,"price":65},{"name":"Philadelphia Roll x10","qty":1,"price":48},{"name":"Edamame","qty":1,"price":18},{"name":"Sake caliente","qty":2,"price":25}]', 181.00, 12.00, 18.00, 216.00, 15.00, 18.00, 4.20, '2026-03-05 12:30:00+00', true)
ON CONFLICT (id) DO NOTHING;

-- ══ Pedido 5: Preparando (Pollos Copacabana) ══
INSERT INTO orders (id, order_number, tracking_code, customer_id, merchant_id, pickup_address, pickup_lat, pickup_lng, pickup_contact_name, pickup_contact_phone, delivery_address, delivery_lat, delivery_lng, delivery_contact_name, delivery_contact_phone, status, priority, merchant_status, payment_method, payment_status, order_items, subtotal, service_fee, delivery_fee, total_fee, base_fee, distance_km, created_at, is_paid) VALUES
('f0000000-0000-0000-0000-000000000005', 'ORD-2026-0005', 'TRK-M4N5O6', '8b891c74-1718-428d-b945-6335a209b039', 'b0000000-0000-0000-0000-000000000001', 'Av. Arce #2345, Sopocachi', -16.5000, -68.1193, 'Pollos Copacabana', '+59171234567', 'Av. Bush #567', -16.5080, -68.1280, 'Roberto Silva', '+59179005005', 'pending', 'high', 'preparing', 'cash', 'pending', '[{"name":"Combo Familiar","qty":1,"price":120},{"name":"Papas Fritas Extra","qty":2,"price":12}]', 144.00, 9.00, 12.00, 170.00, 12.00, 3.10, '2026-03-05 13:00:00+00', false)
ON CONFLICT (id) DO NOTHING;

-- ══ Pedido 6: Pendiente (Farmacia Bolivia) ══
INSERT INTO orders (id, order_number, tracking_code, customer_id, merchant_id, pickup_address, pickup_lat, pickup_lng, pickup_contact_name, pickup_contact_phone, delivery_address, delivery_lat, delivery_lng, delivery_contact_name, delivery_contact_phone, status, priority, merchant_status, payment_method, payment_status, order_items, subtotal, service_fee, delivery_fee, total_fee, base_fee, distance_km, created_at, is_paid) VALUES
('f0000000-0000-0000-0000-000000000006', 'ORD-2026-0006', 'TRK-P7Q8R9', '8b891c74-1718-428d-b945-6335a209b039', 'b0000000-0000-0000-0000-000000000003', 'Av. 6 de Agosto #1234', -16.5050, -68.1250, 'Farmacia Bolivia', '+59173456789', 'Calle Potosí #321', -16.4990, -68.1290, 'Lucía Flores', '+59179006006', 'pending', 'urgent', 'pending', 'qr', 'pending', '[{"name":"Paracetamol 500mg x20","qty":2,"price":8},{"name":"Vitamina C 1000mg x30","qty":1,"price":35}]', 51.00, 3.00, 8.00, 67.00, 8.00, 1.50, '2026-03-05 13:30:00+00', false)
ON CONFLICT (id) DO NOTHING;

-- ══ Pedido 7: Cancelado (Burger House) ══
INSERT INTO orders (id, order_number, tracking_code, customer_id, merchant_id, pickup_address, pickup_lat, pickup_lng, pickup_contact_name, pickup_contact_phone, delivery_address, delivery_lat, delivery_lng, delivery_contact_name, delivery_contact_phone, status, priority, merchant_status, payment_method, payment_status, order_items, subtotal, service_fee, delivery_fee, total_fee, base_fee, distance_km, created_at, cancelled_at, is_paid) VALUES
('f0000000-0000-0000-0000-000000000007', 'ORD-2026-0007', 'TRK-S1T2U3', '8b891c74-1718-428d-b945-6335a209b039', 'b0000000-0000-0000-0000-000000000002', 'Calle 21 de Calacoto #789', -16.5320, -68.0850, 'Burger House', '+59172345678', 'Av. Hernando Siles #456', -16.5250, -68.0870, 'Pedro Rojas', '+59179007007', 'cancelled', 'normal', 'none', 'card', 'cancelled', '[{"name":"Classic Burger","qty":3,"price":35},{"name":"Papas Fritas Clásicas","qty":3,"price":18}]', 159.00, 10.00, 15.00, 189.00, 15.00, 2.30, '2026-03-03 20:00:00+00', '2026-03-03 20:10:00+00', false)
ON CONFLICT (id) DO NOTHING;

-- ══ Pedido 8: Entregado (Súper Mercado Central) ══
INSERT INTO orders (id, order_number, tracking_code, customer_id, merchant_id, pickup_address, pickup_lat, pickup_lng, pickup_contact_name, pickup_contact_phone, delivery_address, delivery_lat, delivery_lng, delivery_contact_name, delivery_contact_phone, status, priority, merchant_status, payment_method, payment_status, order_items, subtotal, service_fee, delivery_fee, total_fee, tip_amount, base_fee, distance_km, created_at, delivered_at, is_paid) VALUES
('f0000000-0000-0000-0000-000000000008', 'ORD-2026-0008', 'TRK-V4W5X6', '8b891c74-1718-428d-b945-6335a209b039', 'b0000000-0000-0000-0000-000000000005', 'Av. Camacho #890', -16.4980, -68.1330, 'Súper Mercado Central', '+59175678901', 'Av. 20 de Octubre #789', -16.5030, -68.1200, 'Teresa Condori', '+59179008008', 'delivered', 'normal', 'ready', 'cash', 'succeeded', '[{"name":"Leche PIL entera 1L","qty":3,"price":8.5},{"name":"Queso criollo 500g","qty":1,"price":25},{"name":"Papel Higiénico Elite x12","qty":1,"price":28}]', 78.50, 5.00, 10.00, 98.50, 0.00, 10.00, 2.10, '2026-03-02 15:00:00+00', '2026-03-02 15:50:00+00', true)
ON CONFLICT (id) DO NOTHING;
