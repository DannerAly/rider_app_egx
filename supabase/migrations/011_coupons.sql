-- 011_coupons.sql
-- Sistema de cupones de descuento

CREATE TABLE IF NOT EXISTS coupons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  description     TEXT,

  -- Tipo de descuento
  discount_type   TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value  NUMERIC(10,2) NOT NULL,  -- % o monto fijo en Bs

  -- Restricciones
  min_order_amount  NUMERIC(10,2) DEFAULT 0,
  max_discount      NUMERIC(10,2),  -- Tope máximo para porcentaje
  max_uses          INT,            -- NULL = ilimitado
  max_uses_per_user INT DEFAULT 1,
  current_uses      INT DEFAULT 0,

  -- Vigencia
  starts_at       TIMESTAMPTZ DEFAULT now(),
  expires_at      TIMESTAMPTZ,

  -- Aplica a merchant específico o todos
  merchant_id     UUID REFERENCES merchants(id) ON DELETE SET NULL,

  is_active       BOOLEAN DEFAULT true,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Uso de cupones
CREATE TABLE IF NOT EXISTS coupon_usages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id   UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
  discount_applied NUMERIC(10,2) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Agregar campo de cupón a orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;

-- Índices
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_id ON coupon_usages(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_user_id ON coupon_usages(user_id);

-- RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;

-- Todos pueden leer cupones activos
CREATE POLICY "Anyone can read active coupons"
  ON coupons FOR SELECT
  USING (is_active = true);

-- Admin CRUD completo
CREATE POLICY "Admin full access on coupons"
  ON coupons FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Usuario ve sus propios usos
CREATE POLICY "User can view own coupon usages"
  ON coupon_usages FOR SELECT
  USING (user_id = auth.uid());

-- Admin ve todos los usos
CREATE POLICY "Admin can view all coupon usages"
  ON coupon_usages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Trigger updated_at
CREATE OR REPLACE TRIGGER set_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
