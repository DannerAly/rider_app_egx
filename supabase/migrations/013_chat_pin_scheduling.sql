-- ============================================================
-- rider-egx: Chat, PIN de verificación, menús programados
-- Migración: 013_chat_pin_scheduling.sql
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. MESSAGES (Chat rider ↔ cliente por pedido)
-- ─────────────────────────────────────────────
CREATE TABLE messages (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id    UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_role TEXT        NOT NULL CHECK (sender_role IN ('customer', 'rider', 'merchant', 'admin')),
  content     TEXT        NOT NULL CHECK (char_length(content) <= 1000),
  msg_type    TEXT        DEFAULT 'text' CHECK (msg_type IN ('text', 'image', 'location', 'system')),
  metadata    JSONB,                           -- lat/lng para location, url para image
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_messages_order_id ON messages(order_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(order_id, created_at DESC);

-- RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Participantes del pedido pueden leer los mensajes
CREATE POLICY "Participantes leen mensajes" ON messages
  FOR SELECT USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = messages.order_id
      AND (
        orders.customer_id = auth.uid()
        OR orders.rider_id = auth.uid()
      )
    )
  );

-- Solo participantes pueden enviar mensajes
CREATE POLICY "Participantes envían mensajes" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = messages.order_id
      AND (
        orders.customer_id = auth.uid()
        OR orders.rider_id = auth.uid()
      )
    )
  );

-- Habilitar Realtime para mensajes
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ─────────────────────────────────────────────
-- 2. PIN DE VERIFICACIÓN (pickup)
-- ─────────────────────────────────────────────
-- Agregar campo pickup_pin a orders (PIN de 4 dígitos)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_pin TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pin_verified_at TIMESTAMPTZ;

-- Función para generar PIN aleatorio de 4 dígitos
CREATE OR REPLACE FUNCTION generate_pickup_pin()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo generar para pedidos nuevos con merchant
  IF NEW.merchant_id IS NOT NULL AND NEW.pickup_pin IS NULL THEN
    NEW.pickup_pin := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_pickup_pin
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION generate_pickup_pin();

-- ─────────────────────────────────────────────
-- 3. MENÚS PROGRAMADOS (disponibilidad por horario)
-- ─────────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS available_from TIME;
ALTER TABLE products ADD COLUMN IF NOT EXISTS available_until TIME;
ALTER TABLE products ADD COLUMN IF NOT EXISTS available_days INT[] DEFAULT '{0,1,2,3,4,5,6}';
  -- 0=domingo, 1=lunes, ..., 6=sábado

-- Función para verificar si un producto está disponible ahora
CREATE OR REPLACE FUNCTION is_product_available(
  p_is_available BOOLEAN,
  p_available_from TIME,
  p_available_until TIME,
  p_available_days INT[]
) RETURNS BOOLEAN AS $$
DECLARE
  current_time_val TIME := LOCALTIME;
  current_day INT := EXTRACT(DOW FROM CURRENT_DATE)::INT;
BEGIN
  -- Si está marcado como no disponible, no está disponible
  IF NOT p_is_available THEN
    RETURN FALSE;
  END IF;

  -- Verificar día de la semana
  IF p_available_days IS NOT NULL AND NOT (current_day = ANY(p_available_days)) THEN
    RETURN FALSE;
  END IF;

  -- Verificar rango horario
  IF p_available_from IS NOT NULL AND p_available_until IS NOT NULL THEN
    -- Manejar rangos que cruzan medianoche (ej: 22:00 - 02:00)
    IF p_available_from > p_available_until THEN
      RETURN current_time_val >= p_available_from OR current_time_val <= p_available_until;
    ELSE
      RETURN current_time_val >= p_available_from AND current_time_val <= p_available_until;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ─────────────────────────────────────────────
-- 4. ETA MEJORADO (campo para almacenar ETA calculado)
-- ─────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS eta_minutes INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS eta_updated_at TIMESTAMPTZ;
