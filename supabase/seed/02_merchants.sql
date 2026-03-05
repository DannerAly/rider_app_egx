-- PASO 2: Comercios (sin owner, se asigna después)
INSERT INTO merchants (id, name, slug, description, category_id, phone, email, address, lat, lng, commission_pct, min_order_amount, avg_prep_time_min, rating, total_orders, total_revenue, is_active, is_featured, opening_hours) VALUES
(
  'b0000000-0000-0000-0000-000000000001',
  'Pollos Copacabana', 'pollos-copacabana',
  'El mejor pollo a la brasa de la ciudad con papas crocantes y ensalada fresca',
  'a0000000-0000-0000-0000-000000000001',
  '+59171234567', 'pollos@copacabana.bo',
  'Av. Arce #2345, Sopocachi', -16.5000, -68.1193,
  12.00, 25.00, 25, 4.5, 187, 45600.00, true, true,
  '{"lun":{"open":"11:00","close":"22:00"},"mar":{"open":"11:00","close":"22:00"},"mie":{"open":"11:00","close":"22:00"},"jue":{"open":"11:00","close":"22:00"},"vie":{"open":"11:00","close":"23:00"},"sab":{"open":"11:00","close":"23:00"},"dom":{"open":"12:00","close":"21:00"}}'
),
(
  'b0000000-0000-0000-0000-000000000002',
  'Burger House', 'burger-house',
  'Hamburguesas artesanales con ingredientes premium y papas fritas caseras',
  'a0000000-0000-0000-0000-000000000002',
  '+59172345678', 'info@burgerhouse.bo',
  'Calle 21 de Calacoto #789', -16.5320, -68.0850,
  15.00, 20.00, 20, 4.3, 245, 62300.00, true, true,
  '{"lun":{"open":"12:00","close":"22:00"},"mar":{"open":"12:00","close":"22:00"},"mie":{"open":"12:00","close":"22:00"},"jue":{"open":"12:00","close":"22:00"},"vie":{"open":"12:00","close":"23:30"},"sab":{"open":"12:00","close":"23:30"},"dom":{"open":"12:00","close":"22:00"}}'
),
(
  'b0000000-0000-0000-0000-000000000003',
  'Farmacia Bolivia', 'farmacia-bolivia',
  'Tu farmacia de confianza con delivery rápido de medicamentos y productos de salud',
  'a0000000-0000-0000-0000-000000000003',
  '+59173456789', 'ventas@farmaciabolivia.bo',
  'Av. 6 de Agosto #1234', -16.5050, -68.1250,
  8.00, 15.00, 10, 4.7, 98, 28900.00, true, false,
  '{"lun":{"open":"08:00","close":"22:00"},"mar":{"open":"08:00","close":"22:00"},"mie":{"open":"08:00","close":"22:00"},"jue":{"open":"08:00","close":"22:00"},"vie":{"open":"08:00","close":"22:00"},"sab":{"open":"09:00","close":"20:00"},"dom":{"open":"10:00","close":"18:00"}}'
),
(
  'b0000000-0000-0000-0000-000000000004',
  'Café Paceño', 'cafe-paceno',
  'Café de especialidad boliviano con pasteles artesanales y desayunos',
  'a0000000-0000-0000-0000-000000000005',
  '+59174567890', 'hola@cafepaceno.bo',
  'Calle Jaén #456, Casco Viejo', -16.4960, -68.1370,
  10.00, 15.00, 15, 4.8, 156, 35200.00, true, true,
  '{"lun":{"open":"07:00","close":"20:00"},"mar":{"open":"07:00","close":"20:00"},"mie":{"open":"07:00","close":"20:00"},"jue":{"open":"07:00","close":"20:00"},"vie":{"open":"07:00","close":"21:00"},"sab":{"open":"08:00","close":"21:00"},"dom":{"open":"08:00","close":"18:00"}}'
),
(
  'b0000000-0000-0000-0000-000000000005',
  'Súper Mercado Central', 'super-mercado-central',
  'Todo lo que necesitas para tu hogar con precios competitivos',
  'a0000000-0000-0000-0000-000000000004',
  '+59175678901', 'pedidos@supercentral.bo',
  'Av. Camacho #890', -16.4980, -68.1330,
  5.00, 50.00, 15, 4.1, 67, 89500.00, true, false,
  '{"lun":{"open":"08:00","close":"21:00"},"mar":{"open":"08:00","close":"21:00"},"mie":{"open":"08:00","close":"21:00"},"jue":{"open":"08:00","close":"21:00"},"vie":{"open":"08:00","close":"21:00"},"sab":{"open":"08:00","close":"21:00"},"dom":{"open":"09:00","close":"18:00"}}'
),
(
  'b0000000-0000-0000-0000-000000000006',
  'Sushi Zen', 'sushi-zen',
  'Sushi fresco preparado al momento con ingredientes importados',
  'a0000000-0000-0000-0000-000000000001',
  '+59176789012', 'reservas@sushizen.bo',
  'Av. Montenegro #567, San Miguel', -16.5280, -68.0920,
  18.00, 40.00, 35, 4.6, 134, 78200.00, true, true,
  '{"lun":{"open":"12:00","close":"22:00"},"mar":{"open":"12:00","close":"22:00"},"mie":{"open":"12:00","close":"22:00"},"jue":{"open":"12:00","close":"22:00"},"vie":{"open":"12:00","close":"23:00"},"sab":{"open":"12:00","close":"23:00"},"dom":{"open":"12:00","close":"21:00"}}'
)
ON CONFLICT (id) DO NOTHING;
