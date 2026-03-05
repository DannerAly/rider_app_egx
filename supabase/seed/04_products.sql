-- PASO 4: Productos

-- ═══ Pollos Copacabana ═══
INSERT INTO products (id, merchant_id, category_id, name, description, price, prep_time_min, is_available, is_featured, sort_order) VALUES
  ('d0000000-0000-0001-0001-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0001-000000000001', 'Pollo Entero a la Brasa', 'Pollo entero dorado con papas fritas y ensalada', 65.00, 30, true, true, 1),
  ('d0000000-0000-0001-0001-000000000002', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0001-000000000001', 'Medio Pollo a la Brasa', 'Medio pollo con papas fritas y ensalada', 38.00, 25, true, false, 2),
  ('d0000000-0000-0001-0001-000000000003', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0001-000000000001', 'Cuarto de Pollo', 'Cuarto de pollo con papas y ensalada', 22.00, 20, true, false, 3),
  ('d0000000-0000-0001-0002-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0001-000000000002', 'Combo Familiar', '2 pollos enteros + 2 porciones de papas + ensalada grande + 2L gaseosa', 120.00, 35, true, true, 1),
  ('d0000000-0000-0001-0002-000000000002', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0001-000000000002', 'Combo Personal', 'Cuarto de pollo + papas + bebida 500ml', 32.00, 20, true, false, 2),
  ('d0000000-0000-0001-0003-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0001-000000000003', 'Papas Fritas Extra', 'Porción extra de papas fritas crocantes', 12.00, 10, true, false, 1),
  ('d0000000-0000-0001-0003-000000000002', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0001-000000000003', 'Ensalada Grande', 'Ensalada mixta con aderezo', 10.00, 5, true, false, 2),
  ('d0000000-0000-0001-0004-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0001-000000000004', 'Coca-Cola 2L', 'Gaseosa familiar', 15.00, 1, true, false, 1),
  ('d0000000-0000-0001-0004-000000000002', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0001-000000000004', 'Coca-Cola 500ml', 'Gaseosa personal', 7.00, 1, true, false, 2)
ON CONFLICT (id) DO NOTHING;

-- ═══ Burger House ═══
INSERT INTO products (id, merchant_id, category_id, name, description, price, prep_time_min, is_available, is_featured, sort_order) VALUES
  ('d0000000-0000-0002-0001-000000000001', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0002-000000000001', 'Classic Burger', 'Carne 200g, lechuga, tomate, cebolla, salsa especial', 35.00, 15, true, true, 1),
  ('d0000000-0000-0002-0001-000000000002', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0002-000000000001', 'Double Smash Burger', 'Doble carne smash 150g c/u, queso cheddar, pickles', 48.00, 18, true, true, 2),
  ('d0000000-0000-0002-0001-000000000003', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0002-000000000001', 'BBQ Bacon Burger', 'Carne 200g, bacon crocante, cebolla caramelizada, salsa BBQ', 45.00, 18, true, false, 3),
  ('d0000000-0000-0002-0001-000000000004', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0002-000000000001', 'Veggie Burger', 'Hamburguesa de quinua y verduras con guacamole', 32.00, 15, true, false, 4),
  ('d0000000-0000-0002-0002-000000000001', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0002-000000000002', 'Papas Fritas Clásicas', 'Porción grande de papas fritas', 18.00, 10, true, false, 1),
  ('d0000000-0000-0002-0002-000000000002', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0002-000000000002', 'Loaded Fries', 'Papas con queso cheddar, bacon y jalapeños', 28.00, 12, true, true, 2),
  ('d0000000-0000-0002-0003-000000000001', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0002-000000000003', 'Milkshake Oreo', 'Milkshake cremoso con galletas Oreo', 22.00, 5, true, false, 1),
  ('d0000000-0000-0002-0003-000000000002', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0002-000000000003', 'Limonada Natural', 'Limonada fresca con hierbabuena', 12.00, 3, true, false, 2),
  ('d0000000-0000-0002-0004-000000000001', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0002-000000000004', 'Brownie con Helado', 'Brownie caliente con helado de vainilla', 25.00, 8, true, false, 1)
ON CONFLICT (id) DO NOTHING;

-- ═══ Farmacia Bolivia ═══
INSERT INTO products (id, merchant_id, category_id, name, description, price, prep_time_min, is_available, is_featured, sort_order) VALUES
  ('d0000000-0000-0003-0001-000000000001', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0003-000000000001', 'Paracetamol 500mg x20', 'Tabletas para dolor y fiebre', 8.00, 5, true, false, 1),
  ('d0000000-0000-0003-0001-000000000002', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0003-000000000001', 'Ibuprofeno 400mg x20', 'Antiinflamatorio y analgésico', 12.00, 5, true, false, 2),
  ('d0000000-0000-0003-0001-000000000003', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0003-000000000001', 'Amoxicilina 500mg x21', 'Antibiótico (requiere receta)', 25.00, 5, true, false, 3),
  ('d0000000-0000-0003-0002-000000000001', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0003-000000000002', 'Protector Solar SPF50', 'Protección solar alta, 200ml', 45.00, 5, true, true, 1),
  ('d0000000-0000-0003-0002-000000000002', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0003-000000000002', 'Alcohol en Gel 500ml', 'Gel antibacterial 70%', 15.00, 5, true, false, 2),
  ('d0000000-0000-0003-0003-000000000001', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0003-000000000003', 'Vitamina C 1000mg x30', 'Tabletas efervescentes', 35.00, 5, true, true, 1),
  ('d0000000-0000-0003-0003-000000000002', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0003-000000000003', 'Complejo B x30', 'Vitaminas del complejo B', 28.00, 5, true, false, 2)
ON CONFLICT (id) DO NOTHING;

-- ═══ Café Paceño ═══
INSERT INTO products (id, merchant_id, category_id, name, description, price, prep_time_min, is_available, is_featured, sort_order) VALUES
  ('d0000000-0000-0004-0001-000000000001', 'b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0004-000000000001', 'Espresso Doble', 'Shot doble de café de altura boliviano', 12.00, 3, true, false, 1),
  ('d0000000-0000-0004-0001-000000000002', 'b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0004-000000000001', 'Cappuccino', 'Espresso con leche espumada y canela', 18.00, 5, true, true, 2),
  ('d0000000-0000-0004-0001-000000000003', 'b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0004-000000000001', 'Latte de Vainilla', 'Café con leche y sirope de vainilla', 20.00, 5, true, false, 3),
  ('d0000000-0000-0004-0001-000000000004', 'b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0004-000000000001', 'Mocaccino', 'Espresso con chocolate caliente y crema', 22.00, 5, true, true, 4),
  ('d0000000-0000-0004-0002-000000000001', 'b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0004-000000000002', 'Desayuno Paceño', 'Tostadas, huevos revueltos, jugo de naranja y café', 35.00, 15, true, true, 1),
  ('d0000000-0000-0004-0002-000000000002', 'b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0004-000000000002', 'Pancakes con Miel', 'Stack de 3 pancakes con miel y mantequilla', 28.00, 12, true, false, 2),
  ('d0000000-0000-0004-0003-000000000001', 'b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0004-000000000003', 'Cheesecake de Maracuyá', 'Cheesecake artesanal con coulis de maracuyá', 25.00, 3, true, true, 1),
  ('d0000000-0000-0004-0003-000000000002', 'b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0004-000000000003', 'Brownie de Chocolate', 'Brownie húmedo con nueces', 18.00, 3, true, false, 2),
  ('d0000000-0000-0004-0004-000000000001', 'b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0004-000000000004', 'Jugo de Naranja Natural', 'Jugo recién exprimido', 15.00, 5, true, false, 1),
  ('d0000000-0000-0004-0004-000000000002', 'b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0004-000000000004', 'Smoothie de Frutilla', 'Frutilla, banana, yogurt y miel', 20.00, 5, true, false, 2)
ON CONFLICT (id) DO NOTHING;

-- ═══ Súper Mercado Central ═══
INSERT INTO products (id, merchant_id, category_id, name, description, price, prep_time_min, is_available, is_featured, sort_order) VALUES
  ('d0000000-0000-0005-0001-000000000001', 'b0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0005-000000000001', 'Leche PIL entera 1L', 'Leche fresca entera', 8.50, 5, true, false, 1),
  ('d0000000-0000-0005-0001-000000000002', 'b0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0005-000000000001', 'Yogurt Delizia 1L', 'Yogurt de frutilla', 14.00, 5, true, false, 2),
  ('d0000000-0000-0005-0001-000000000003', 'b0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0005-000000000001', 'Queso criollo 500g', 'Queso fresco artesanal', 25.00, 5, true, true, 3),
  ('d0000000-0000-0005-0002-000000000001', 'b0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0005-000000000002', 'Papas Lays 200g', 'Papas fritas clásicas', 12.00, 5, true, false, 1),
  ('d0000000-0000-0005-0002-000000000002', 'b0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0005-000000000002', 'Galletas Oreo x3', 'Pack de 3 paquetes', 18.00, 5, true, false, 2),
  ('d0000000-0000-0005-0003-000000000001', 'b0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0005-000000000003', 'Detergente OMO 2kg', 'Detergente en polvo', 32.00, 5, true, false, 1),
  ('d0000000-0000-0005-0003-000000000002', 'b0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0005-000000000003', 'Papel Higiénico Elite x12', 'Pack 12 rollos doble hoja', 28.00, 5, true, true, 2)
ON CONFLICT (id) DO NOTHING;

-- ═══ Sushi Zen ═══
INSERT INTO products (id, merchant_id, category_id, name, description, price, prep_time_min, is_available, is_featured, sort_order) VALUES
  ('d0000000-0000-0006-0001-000000000001', 'b0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0006-000000000001', 'California Roll x10', 'Cangrejo, palta, pepino, sésamo', 42.00, 20, true, true, 1),
  ('d0000000-0000-0006-0001-000000000002', 'b0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0006-000000000001', 'Philadelphia Roll x10', 'Salmón, queso crema, palta', 48.00, 20, true, true, 2),
  ('d0000000-0000-0006-0001-000000000003', 'b0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0006-000000000001', 'Tempura Roll x10', 'Camarón tempura, palta, salsa anguila', 45.00, 25, true, false, 3),
  ('d0000000-0000-0006-0002-000000000001', 'b0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0006-000000000002', 'Dragon Roll x10', 'Camarón tempura dentro, anguila y palta encima', 65.00, 25, true, true, 1),
  ('d0000000-0000-0006-0002-000000000002', 'b0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0006-000000000002', 'Rainbow Roll x10', 'Variedad de pescados frescos sobre California', 68.00, 25, true, false, 2),
  ('d0000000-0000-0006-0003-000000000001', 'b0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0006-000000000003', 'Edamame', 'Vainas de soja al vapor con sal marina', 18.00, 8, true, false, 1),
  ('d0000000-0000-0006-0003-000000000002', 'b0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0006-000000000003', 'Gyozas x6', 'Empanadillas japonesas de cerdo', 28.00, 12, true, false, 2),
  ('d0000000-0000-0006-0004-000000000001', 'b0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0006-000000000004', 'Té Verde Japonés', 'Té matcha caliente', 12.00, 3, true, false, 1),
  ('d0000000-0000-0006-0004-000000000002', 'b0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0006-000000000004', 'Sake caliente', 'Sake japonés servido tibio', 25.00, 3, true, false, 2)
ON CONFLICT (id) DO NOTHING;
