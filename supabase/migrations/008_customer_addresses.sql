-- ============================================================
-- rider-egx: Direcciones de clientes
-- Migración: 008_customer_addresses.sql
-- ============================================================

CREATE TABLE customer_addresses (
  id            UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id   UUID         REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  label         TEXT         NOT NULL DEFAULT 'Casa',    -- Casa, Trabajo, Otro
  address       TEXT         NOT NULL,
  lat           DOUBLE PRECISION NOT NULL,
  lng           DOUBLE PRECISION NOT NULL,
  instructions  TEXT,                                    -- "Portón azul, 2do piso"
  is_default    BOOLEAN      DEFAULT FALSE,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_customer_addresses_customer ON customer_addresses(customer_id);

CREATE TRIGGER trg_customer_addresses_updated_at BEFORE UPDATE ON customer_addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;

-- Cada cliente ve solo sus propias direcciones
CREATE POLICY "customer_addresses_own" ON customer_addresses FOR ALL USING (customer_id = auth.uid());
-- Admin puede ver todo
CREATE POLICY "customer_addresses_admin" ON customer_addresses FOR SELECT USING (get_user_role() = 'admin');
