-- 009_payments.sql
-- Tablas para gestión de pagos: transacciones y métodos guardados

-- Tabla de pagos/transacciones
CREATE TABLE IF NOT EXISTS payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES auth.users(id),

  -- Montos
  amount          NUMERIC(10,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'BOB',

  -- Método
  payment_method  TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'qr')),

  -- Stripe
  stripe_payment_intent_id  TEXT,
  stripe_client_secret      TEXT,

  -- QR Bolivia
  qr_provider       TEXT,  -- 'tigo_money', 'bancosol', 'simple_qr'
  qr_reference_code TEXT,
  qr_image_url      TEXT,

  -- Estado
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled')),

  -- Comisiones (snapshot al momento del pago)
  commission_pct    NUMERIC(5,2),
  commission_amount NUMERIC(10,2),
  merchant_payout   NUMERIC(10,2),
  rider_payout      NUMERIC(10,2),
  platform_fee      NUMERIC(10,2),

  -- Metadata
  metadata        JSONB DEFAULT '{}',
  failure_reason  TEXT,
  paid_at         TIMESTAMPTZ,
  refunded_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_pi ON payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Admin puede ver todo
CREATE POLICY "Admin full access on payments"
  ON payments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dispatcher'))
  );

-- Cliente puede ver sus propios pagos
CREATE POLICY "Customer can view own payments"
  ON payments FOR SELECT
  USING (customer_id = auth.uid());

-- Trigger updated_at
CREATE OR REPLACE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Agregar stripe_payment_intent_id a orders para referencia rápida
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Vista para resumen de comisiones por merchant
CREATE OR REPLACE VIEW merchant_commission_summary AS
SELECT
  o.merchant_id,
  m.name AS merchant_name,
  COUNT(p.id) AS total_orders,
  SUM(p.amount) AS total_revenue,
  SUM(p.commission_amount) AS total_commission,
  SUM(p.merchant_payout) AS total_merchant_payout,
  SUM(p.rider_payout) AS total_rider_payout,
  SUM(p.platform_fee) AS total_platform_fee
FROM payments p
JOIN orders o ON p.order_id = o.id
JOIN merchants m ON o.merchant_id = m.id
WHERE p.status = 'succeeded'
GROUP BY o.merchant_id, m.name;
