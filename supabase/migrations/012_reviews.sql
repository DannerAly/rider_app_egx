-- 012_reviews.sql
-- Sistema de calificaciones post-entrega

CREATE TABLE IF NOT EXISTS reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES auth.users(id),

  -- Calificaciones (1-5)
  merchant_rating INT CHECK (merchant_rating BETWEEN 1 AND 5),
  rider_rating    INT CHECK (rider_rating BETWEEN 1 AND 5),

  -- Comentario
  comment         TEXT,

  -- Referencias
  merchant_id     UUID REFERENCES merchants(id) ON DELETE SET NULL,
  rider_id        UUID REFERENCES auth.users(id),

  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_merchant_id ON reviews(merchant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rider_id ON reviews(rider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON reviews(customer_id);

-- RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Cliente puede crear y ver sus reviews
CREATE POLICY "Customer can create own reviews"
  ON reviews FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customer can view own reviews"
  ON reviews FOR SELECT
  USING (customer_id = auth.uid());

-- Merchant puede ver reviews de su comercio
CREATE POLICY "Merchant can view own reviews"
  ON reviews FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM merchants WHERE id = reviews.merchant_id AND owner_id = auth.uid())
  );

-- Admin ve todo
CREATE POLICY "Admin full access on reviews"
  ON reviews FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Todos pueden leer reviews (para mostrar en el perfil del merchant)
CREATE POLICY "Public can read reviews"
  ON reviews FOR SELECT
  USING (true);

-- Función para actualizar rating promedio del merchant
CREATE OR REPLACE FUNCTION update_merchant_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE merchants
  SET rating = (
    SELECT COALESCE(AVG(merchant_rating), 0)
    FROM reviews
    WHERE merchant_id = NEW.merchant_id
      AND merchant_rating IS NOT NULL
  )
  WHERE id = NEW.merchant_id;

  -- Actualizar rating del rider también
  IF NEW.rider_id IS NOT NULL AND NEW.rider_rating IS NOT NULL THEN
    UPDATE riders
    SET rating = (
      SELECT COALESCE(AVG(rider_rating), 0)
      FROM reviews
      WHERE rider_id = NEW.rider_id
        AND rider_rating IS NOT NULL
    )
    WHERE id = NEW.rider_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trigger_update_ratings
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_merchant_rating();
