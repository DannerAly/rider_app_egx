-- ============================================================
-- Migración 002: Permisos para que riders acepten pedidos
-- ============================================================

-- Riders pueden VER pedidos pendientes sin rider asignado
CREATE POLICY "orders_rider_see_pending" ON orders
FOR SELECT USING (
  status = 'pending'
  AND rider_id IS NULL
  AND get_user_role() = 'rider'
);

-- Riders pueden aceptar pedidos pendientes sin rider asignado
CREATE POLICY "orders_rider_accept" ON orders
FOR UPDATE
USING (
  status = 'pending'
  AND rider_id IS NULL
  AND get_user_role() = 'rider'
)
WITH CHECK (
  rider_id = auth.uid()
  AND status = 'assigned'
);

-- Usuarios autenticados pueden insertar en historial de estados
CREATE POLICY "order_status_history_insert" ON order_status_history
FOR INSERT WITH CHECK (changed_by = auth.uid());

-- Riders y staff pueden leer historial de sus pedidos
CREATE POLICY "order_status_history_select" ON order_status_history
FOR SELECT USING (
  get_user_role() IN ('admin', 'dispatcher')
  OR EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_id
      AND orders.rider_id = auth.uid()
  )
);

-- Permitir insertar notificaciones desde el servidor
CREATE POLICY "notif_insert" ON notifications
FOR INSERT WITH CHECK (true);

-- Función para incrementar entregas del rider al entregar
CREATE OR REPLACE FUNCTION increment_rider_deliveries(rider_id UUID)
RETURNS void AS $$
  UPDATE riders
  SET total_deliveries = total_deliveries + 1
  WHERE id = rider_id;
$$ LANGUAGE sql SECURITY DEFINER;
