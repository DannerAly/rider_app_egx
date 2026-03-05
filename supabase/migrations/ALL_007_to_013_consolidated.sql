-- ============================================================
-- rider-egx: MIGRACIÓN CONSOLIDADA 007-013
-- Ejecutar este archivo UNA SOLA VEZ en Supabase SQL Editor
-- ============================================================
-- Contenido:
--   007: Merchants, catálogo, extender orders
--   008: Direcciones de clientes
--   009: Pagos (payments)
--   010: Wallet del rider
--   011: Cupones
--   012: Reviews / calificaciones
--   013: Chat, PIN de verificación, menús programados, ETA
-- ============================================================


-- ╔════════════════════════════════════════════════════════════╗
-- ║  007 — MERCHANTS & CATÁLOGO                               ║
-- ╚════════════════════════════════════════════════════════════╝

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'merchant';

CREATE TABLE IF NOT EXISTS merchant_categories (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL UNIQUE,
  slug        TEXT        NOT NULL UNIQUE,
  icon        TEXT,
  sort_order  INT         DEFAULT 0,
  is_active   BOOLEAN     DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO merchant_categories (name, slug, icon, sort_order) VALUES
  ('Restaurante',  'restaurante',  'UtensilsCrossed', 1),
  ('Farmacia',     'farmacia',     'Pill',            2),
  ('Tienda',       'tienda',       'ShoppingBag',     3),
  ('Supermercado', 'supermercado', 'ShoppingCart',     4),
  ('Otro',         'otro',         'Store',           5)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS merchants (
  id              UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id        UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  category_id     UUID         REFERENCES merchant_categories(id) ON DELETE SET NULL,
  zone_id         UUID         REFERENCES zones(id) ON DELETE SET NULL,
  name            TEXT         NOT NULL,
  slug            TEXT         UNIQUE NOT NULL,
  description     TEXT,
  logo_url        TEXT,
  banner_url      TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT         NOT NULL,
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  commission_pct  NUMERIC(5,2) DEFAULT 15.00 CHECK (commission_pct BETWEEN 0 AND 100),
  min_order_amount NUMERIC(10,2) DEFAULT 0,
  avg_prep_time_min INT        DEFAULT 30,
  opening_hours   JSONB        DEFAULT '{}',
  rating          NUMERIC(3,2) DEFAULT 0.00 CHECK (rating BETWEEN 0 AND 5),
  total_orders    INT          DEFAULT 0,
  total_revenue   NUMERIC(14,2) DEFAULT 0.00,
  is_active       BOOLEAN      DEFAULT TRUE,
  is_featured     BOOLEAN      DEFAULT FALSE,
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_categories (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID        REFERENCES merchants(id) ON DELETE CASCADE NOT NULL,
  name        TEXT        NOT NULL,
  description TEXT,
  sort_order  INT         DEFAULT 0,
  is_active   BOOLEAN     DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id              UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id     UUID         REFERENCES merchants(id) ON DELETE CASCADE NOT NULL,
  category_id     UUID         REFERENCES menu_categories(id) ON DELETE SET NULL,
  name            TEXT         NOT NULL,
  description     TEXT,
  price           NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url       TEXT,
  prep_time_min   INT          DEFAULT 15,
  is_available    BOOLEAN      DEFAULT TRUE,
  is_featured     BOOLEAN      DEFAULT FALSE,
  sort_order      INT          DEFAULT 0,
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modifier_groups (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id     UUID    REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  name           TEXT    NOT NULL,
  min_selections INT     DEFAULT 0,
  max_selections INT     DEFAULT 1,
  is_required    BOOLEAN DEFAULT FALSE,
  sort_order     INT     DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modifiers (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  modifier_group_id UUID        REFERENCES modifier_groups(id) ON DELETE CASCADE NOT NULL,
  name             TEXT         NOT NULL,
  price_addition   NUMERIC(10,2) DEFAULT 0.00,
  is_available     BOOLEAN      DEFAULT TRUE,
  sort_order       INT          DEFAULT 0,
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

-- Extender orders para marketplace
ALTER TABLE orders ADD COLUMN IF NOT EXISTS merchant_id          UUID REFERENCES merchants(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_items          JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal             NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_fee          NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tip_amount           NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method       TEXT DEFAULT 'cash';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status       TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS merchant_status      TEXT DEFAULT 'none';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_prep_time_min INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_notes       TEXT;

-- Índices 007
CREATE INDEX IF NOT EXISTS idx_merchants_zone       ON merchants(zone_id);
CREATE INDEX IF NOT EXISTS idx_merchants_category   ON merchants(category_id);
CREATE INDEX IF NOT EXISTS idx_merchants_owner      ON merchants(owner_id);
CREATE INDEX IF NOT EXISTS idx_merchants_active     ON merchants(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_merchants_slug       ON merchants(slug);
CREATE INDEX IF NOT EXISTS idx_menu_cat_merchant    ON menu_categories(merchant_id);
CREATE INDEX IF NOT EXISTS idx_products_merchant    ON products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_products_category    ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_available   ON products(is_available) WHERE is_available = TRUE;
CREATE INDEX IF NOT EXISTS idx_modifier_groups_prod ON modifier_groups(product_id);
CREATE INDEX IF NOT EXISTS idx_modifiers_group      ON modifiers(modifier_group_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant      ON orders(merchant_id);

-- Triggers updated_at (007)
DO $$ BEGIN
  CREATE TRIGGER trg_merchant_categories_updated_at BEFORE UPDATE ON merchant_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_merchants_updated_at BEFORE UPDATE ON merchants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_menu_categories_updated_at BEFORE UPDATE ON menu_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS (007)
ALTER TABLE merchant_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants           ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_groups     ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifiers           ENABLE ROW LEVEL SECURITY;

-- Políticas (con DROP IF EXISTS para idempotencia)
DROP POLICY IF EXISTS "merchant_categories_select" ON merchant_categories;
CREATE POLICY "merchant_categories_select" ON merchant_categories FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "merchant_categories_admin" ON merchant_categories;
CREATE POLICY "merchant_categories_admin"  ON merchant_categories FOR ALL USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "merchants_select_active" ON merchants;
CREATE POLICY "merchants_select_active" ON merchants FOR SELECT USING (is_active = TRUE OR owner_id = auth.uid() OR get_user_role() IN ('admin', 'dispatcher'));
DROP POLICY IF EXISTS "merchants_owner_update" ON merchants;
CREATE POLICY "merchants_owner_update"  ON merchants FOR UPDATE USING (owner_id = auth.uid());
DROP POLICY IF EXISTS "merchants_admin_all" ON merchants;
CREATE POLICY "merchants_admin_all"     ON merchants FOR ALL USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "menu_categories_select" ON menu_categories;
CREATE POLICY "menu_categories_select" ON menu_categories FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "menu_categories_owner" ON menu_categories;
CREATE POLICY "menu_categories_owner"  ON menu_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM merchants WHERE merchants.id = menu_categories.merchant_id AND merchants.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "menu_categories_admin" ON menu_categories;
CREATE POLICY "menu_categories_admin"  ON menu_categories FOR ALL USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "products_select" ON products;
CREATE POLICY "products_select" ON products FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "products_owner" ON products;
CREATE POLICY "products_owner"  ON products FOR ALL USING (
  EXISTS (SELECT 1 FROM merchants WHERE merchants.id = products.merchant_id AND merchants.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "products_admin" ON products;
CREATE POLICY "products_admin"  ON products FOR ALL USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "modifier_groups_select" ON modifier_groups;
CREATE POLICY "modifier_groups_select" ON modifier_groups FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "modifier_groups_owner" ON modifier_groups;
CREATE POLICY "modifier_groups_owner"  ON modifier_groups FOR ALL USING (
  EXISTS (SELECT 1 FROM products p JOIN merchants m ON m.id = p.merchant_id WHERE p.id = modifier_groups.product_id AND m.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "modifier_groups_admin" ON modifier_groups;
CREATE POLICY "modifier_groups_admin"  ON modifier_groups FOR ALL USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "modifiers_select" ON modifiers;
CREATE POLICY "modifiers_select" ON modifiers FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "modifiers_owner" ON modifiers;
CREATE POLICY "modifiers_owner"  ON modifiers FOR ALL USING (
  EXISTS (SELECT 1 FROM modifier_groups mg JOIN products p ON p.id = mg.product_id JOIN merchants m ON m.id = p.merchant_id WHERE mg.id = modifiers.modifier_group_id AND m.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "modifiers_admin" ON modifiers;
CREATE POLICY "modifiers_admin"  ON modifiers FOR ALL USING (get_user_role() = 'admin');

-- Realtime (007)
ALTER PUBLICATION supabase_realtime ADD TABLE merchants;
ALTER PUBLICATION supabase_realtime ADD TABLE products;

-- Políticas de orders para merchants
DROP POLICY IF EXISTS "orders_merchant" ON orders;
CREATE POLICY "orders_merchant" ON orders FOR SELECT USING (
  merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid())
);
DROP POLICY IF EXISTS "orders_merchant_update" ON orders;
CREATE POLICY "orders_merchant_update" ON orders FOR UPDATE USING (
  merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid())
);


-- ╔════════════════════════════════════════════════════════════╗
-- ║  008 — DIRECCIONES DE CLIENTES                            ║
-- ╚════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS customer_addresses (
  id            UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id   UUID         REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  label         TEXT         NOT NULL DEFAULT 'Casa',
  address       TEXT         NOT NULL,
  lat           DOUBLE PRECISION NOT NULL,
  lng           DOUBLE PRECISION NOT NULL,
  instructions  TEXT,
  is_default    BOOLEAN      DEFAULT FALSE,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON customer_addresses(customer_id);

DO $$ BEGIN
  CREATE TRIGGER trg_customer_addresses_updated_at BEFORE UPDATE ON customer_addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_addresses_own" ON customer_addresses;
CREATE POLICY "customer_addresses_own" ON customer_addresses FOR ALL USING (customer_id = auth.uid());
DROP POLICY IF EXISTS "customer_addresses_admin" ON customer_addresses;
CREATE POLICY "customer_addresses_admin" ON customer_addresses FOR SELECT USING (get_user_role() = 'admin');


-- ╔════════════════════════════════════════════════════════════╗
-- ║  009 — PAGOS (PAYMENTS)                                   ║
-- ╚════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES auth.users(id),
  amount          NUMERIC(10,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'BOB',
  payment_method  TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'qr')),
  stripe_payment_intent_id  TEXT,
  stripe_client_secret      TEXT,
  qr_provider       TEXT,
  qr_reference_code TEXT,
  qr_image_url      TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled')),
  commission_pct    NUMERIC(5,2),
  commission_amount NUMERIC(10,2),
  merchant_payout   NUMERIC(10,2),
  rider_payout      NUMERIC(10,2),
  platform_fee      NUMERIC(10,2),
  metadata        JSONB DEFAULT '{}',
  failure_reason  TEXT,
  paid_at         TIMESTAMPTZ,
  refunded_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_pi ON payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access on payments" ON payments;
CREATE POLICY "Admin full access on payments" ON payments FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')));

DROP POLICY IF EXISTS "Customer can view own payments" ON payments;
CREATE POLICY "Customer can view own payments" ON payments FOR SELECT
  USING (customer_id = auth.uid());

DO $$ BEGIN
  CREATE TRIGGER set_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Vista de comisiones
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


-- ╔════════════════════════════════════════════════════════════╗
-- ║  010 — WALLET DEL RIDER                                   ║
-- ╚════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS rider_wallets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance     NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_earned NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_withdrawn NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id     UUID NOT NULL REFERENCES rider_wallets(id) ON DELETE CASCADE,
  rider_id      UUID NOT NULL REFERENCES auth.users(id),
  type          TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  category      TEXT NOT NULL CHECK (category IN (
    'delivery_fee', 'tip', 'bonus', 'withdrawal', 'adjustment', 'penalty'
  )),
  amount        NUMERIC(10,2) NOT NULL,
  balance_after NUMERIC(10,2) NOT NULL,
  description   TEXT,
  order_id      UUID REFERENCES orders(id) ON DELETE SET NULL,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_rider_id ON wallet_transactions(rider_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_category ON wallet_transactions(category);
CREATE INDEX IF NOT EXISTS idx_rider_wallets_rider_id ON rider_wallets(rider_id);

ALTER TABLE rider_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Rider can view own wallet" ON rider_wallets;
CREATE POLICY "Rider can view own wallet" ON rider_wallets FOR SELECT USING (rider_id = auth.uid());
DROP POLICY IF EXISTS "Admin full access on rider_wallets" ON rider_wallets;
CREATE POLICY "Admin full access on rider_wallets" ON rider_wallets FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')));

DROP POLICY IF EXISTS "Rider can view own transactions" ON wallet_transactions;
CREATE POLICY "Rider can view own transactions" ON wallet_transactions FOR SELECT USING (rider_id = auth.uid());
DROP POLICY IF EXISTS "Admin full access on wallet_transactions" ON wallet_transactions;
CREATE POLICY "Admin full access on wallet_transactions" ON wallet_transactions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')));

DO $$ BEGIN
  CREATE TRIGGER set_rider_wallets_updated_at BEFORE UPDATE ON rider_wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Función acreditar wallet
CREATE OR REPLACE FUNCTION credit_rider_wallet(
  p_rider_id UUID, p_amount NUMERIC, p_category TEXT,
  p_description TEXT DEFAULT NULL, p_order_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_wallet_id UUID; v_new_balance NUMERIC; v_txn_id UUID;
BEGIN
  INSERT INTO rider_wallets (rider_id) VALUES (p_rider_id) ON CONFLICT (rider_id) DO NOTHING;
  SELECT id INTO v_wallet_id FROM rider_wallets WHERE rider_id = p_rider_id;
  UPDATE rider_wallets SET balance = balance + p_amount, total_earned = total_earned + p_amount
    WHERE id = v_wallet_id RETURNING balance INTO v_new_balance;
  INSERT INTO wallet_transactions (wallet_id, rider_id, type, category, amount, balance_after, description, order_id)
    VALUES (v_wallet_id, p_rider_id, 'credit', p_category, p_amount, v_new_balance, p_description, p_order_id)
    RETURNING id INTO v_txn_id;
  RETURN v_txn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función débito wallet
CREATE OR REPLACE FUNCTION debit_rider_wallet(
  p_rider_id UUID, p_amount NUMERIC, p_category TEXT,
  p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_wallet_id UUID; v_current_balance NUMERIC; v_new_balance NUMERIC; v_txn_id UUID;
BEGIN
  SELECT id, balance INTO v_wallet_id, v_current_balance FROM rider_wallets WHERE rider_id = p_rider_id;
  IF v_wallet_id IS NULL THEN RAISE EXCEPTION 'Wallet no encontrado'; END IF;
  IF v_current_balance < p_amount THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;
  UPDATE rider_wallets SET balance = balance - p_amount, total_withdrawn = total_withdrawn + p_amount
    WHERE id = v_wallet_id RETURNING balance INTO v_new_balance;
  INSERT INTO wallet_transactions (wallet_id, rider_id, type, category, amount, balance_after, description)
    VALUES (v_wallet_id, p_rider_id, 'debit', p_category, p_amount, v_new_balance, p_description)
    RETURNING id INTO v_txn_id;
  RETURN v_txn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ╔════════════════════════════════════════════════════════════╗
-- ║  011 — CUPONES                                            ║
-- ╚════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS coupons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  description     TEXT,
  discount_type   TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value  NUMERIC(10,2) NOT NULL,
  min_order_amount  NUMERIC(10,2) DEFAULT 0,
  max_discount      NUMERIC(10,2),
  max_uses          INT,
  max_uses_per_user INT DEFAULT 1,
  current_uses      INT DEFAULT 0,
  starts_at       TIMESTAMPTZ DEFAULT now(),
  expires_at      TIMESTAMPTZ,
  merchant_id     UUID REFERENCES merchants(id) ON DELETE SET NULL,
  is_active       BOOLEAN DEFAULT true,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coupon_usages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id   UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
  discount_applied NUMERIC(10,2) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_id ON coupon_usages(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_user_id ON coupon_usages(user_id);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active coupons" ON coupons;
CREATE POLICY "Anyone can read active coupons" ON coupons FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admin full access on coupons" ON coupons;
CREATE POLICY "Admin full access on coupons" ON coupons FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "User can view own coupon usages" ON coupon_usages;
CREATE POLICY "User can view own coupon usages" ON coupon_usages FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Admin can view all coupon usages" ON coupon_usages;
CREATE POLICY "Admin can view all coupon usages" ON coupon_usages FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DO $$ BEGIN
  CREATE TRIGGER set_coupons_updated_at BEFORE UPDATE ON coupons FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ╔════════════════════════════════════════════════════════════╗
-- ║  012 — REVIEWS / CALIFICACIONES                           ║
-- ╚════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES auth.users(id),
  merchant_rating INT CHECK (merchant_rating BETWEEN 1 AND 5),
  rider_rating    INT CHECK (rider_rating BETWEEN 1 AND 5),
  comment         TEXT,
  merchant_id     UUID REFERENCES merchants(id) ON DELETE SET NULL,
  rider_id        UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_merchant_id ON reviews(merchant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rider_id ON reviews(rider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON reviews(customer_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customer can create own reviews" ON reviews;
CREATE POLICY "Customer can create own reviews" ON reviews FOR INSERT WITH CHECK (customer_id = auth.uid());
DROP POLICY IF EXISTS "Customer can view own reviews" ON reviews;
CREATE POLICY "Customer can view own reviews" ON reviews FOR SELECT USING (customer_id = auth.uid());
DROP POLICY IF EXISTS "Merchant can view own reviews" ON reviews;
CREATE POLICY "Merchant can view own reviews" ON reviews FOR SELECT
  USING (EXISTS (SELECT 1 FROM merchants WHERE id = reviews.merchant_id AND owner_id = auth.uid()));
DROP POLICY IF EXISTS "Admin full access on reviews" ON reviews;
CREATE POLICY "Admin full access on reviews" ON reviews FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "Public can read reviews" ON reviews;
CREATE POLICY "Public can read reviews" ON reviews FOR SELECT USING (true);

-- Auto-actualizar ratings promedio
CREATE OR REPLACE FUNCTION update_merchant_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE merchants SET rating = (
    SELECT COALESCE(AVG(merchant_rating), 0) FROM reviews
    WHERE merchant_id = NEW.merchant_id AND merchant_rating IS NOT NULL
  ) WHERE id = NEW.merchant_id;

  IF NEW.rider_id IS NOT NULL AND NEW.rider_rating IS NOT NULL THEN
    UPDATE riders SET rating = (
      SELECT COALESCE(AVG(rider_rating), 0) FROM reviews
      WHERE rider_id = NEW.rider_id AND rider_rating IS NOT NULL
    ) WHERE id = NEW.rider_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_ratings ON reviews;
CREATE TRIGGER trigger_update_ratings
  AFTER INSERT ON reviews FOR EACH ROW EXECUTE FUNCTION update_merchant_rating();


-- ╔════════════════════════════════════════════════════════════╗
-- ║  013 — CHAT, PIN, MENÚS PROGRAMADOS, ETA                 ║
-- ╚════════════════════════════════════════════════════════════╝

-- Chat messages
CREATE TABLE IF NOT EXISTS messages (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id    UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_role TEXT        NOT NULL CHECK (sender_role IN ('customer', 'rider', 'merchant', 'admin')),
  content     TEXT        NOT NULL CHECK (char_length(content) <= 1000),
  msg_type    TEXT        DEFAULT 'text' CHECK (msg_type IN ('text', 'image', 'location', 'system')),
  metadata    JSONB,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_order_id ON messages(order_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(order_id, created_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participantes leen mensajes" ON messages;
CREATE POLICY "Participantes leen mensajes" ON messages FOR SELECT USING (
  sender_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM orders WHERE orders.id = messages.order_id
    AND (orders.customer_id = auth.uid() OR orders.rider_id = auth.uid())
  )
);
DROP POLICY IF EXISTS "Participantes envían mensajes" ON messages;
CREATE POLICY "Participantes envían mensajes" ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM orders WHERE orders.id = messages.order_id
    AND (orders.customer_id = auth.uid() OR orders.rider_id = auth.uid())
  )
);

-- Actualizar read_at de mensajes
DROP POLICY IF EXISTS "Participantes actualizan read_at" ON messages;
CREATE POLICY "Participantes actualizan read_at" ON messages FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM orders WHERE orders.id = messages.order_id
    AND (orders.customer_id = auth.uid() OR orders.rider_id = auth.uid())
  )
);

ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- PIN de verificación
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_pin TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pin_verified_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION generate_pickup_pin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.merchant_id IS NOT NULL AND NEW.pickup_pin IS NULL THEN
    NEW.pickup_pin := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_pickup_pin ON orders;
CREATE TRIGGER trg_generate_pickup_pin
  BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION generate_pickup_pin();

-- Menús programados
ALTER TABLE products ADD COLUMN IF NOT EXISTS available_from TIME;
ALTER TABLE products ADD COLUMN IF NOT EXISTS available_until TIME;
ALTER TABLE products ADD COLUMN IF NOT EXISTS available_days INT[] DEFAULT '{0,1,2,3,4,5,6}';

CREATE OR REPLACE FUNCTION is_product_available(
  p_is_available BOOLEAN, p_available_from TIME,
  p_available_until TIME, p_available_days INT[]
) RETURNS BOOLEAN AS $$
DECLARE
  current_time_val TIME := LOCALTIME;
  current_day INT := EXTRACT(DOW FROM CURRENT_DATE)::INT;
BEGIN
  IF NOT p_is_available THEN RETURN FALSE; END IF;
  IF p_available_days IS NOT NULL AND NOT (current_day = ANY(p_available_days)) THEN RETURN FALSE; END IF;
  IF p_available_from IS NOT NULL AND p_available_until IS NOT NULL THEN
    IF p_available_from > p_available_until THEN
      RETURN current_time_val >= p_available_from OR current_time_val <= p_available_until;
    ELSE
      RETURN current_time_val >= p_available_from AND current_time_val <= p_available_until;
    END IF;
  END IF;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ETA campos
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS eta_minutes INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS eta_updated_at TIMESTAMPTZ;


-- ╔════════════════════════════════════════════════════════════╗
-- ║  FIN — Migración consolidada completada                   ║
-- ╚════════════════════════════════════════════════════════════╝
