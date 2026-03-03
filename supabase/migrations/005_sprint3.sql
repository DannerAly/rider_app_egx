-- ============================================================
-- Sprint 3: foto de entrega + push notifications + portal cliente
-- ============================================================

-- 1. Columna foto de entrega en orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_photo_url TEXT;

-- 2. Tabla de suscripciones push (Web Push API)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth_key    TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- El rider/dispatcher solo puede gestionar sus propias suscripciones
CREATE POLICY "push_subscriptions_own" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- 3. Columna customer_phone en orders (para portal cliente)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Índice para búsqueda por teléfono de cliente
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
