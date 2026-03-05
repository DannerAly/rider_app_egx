-- ============================================================
-- rider-egx: Merchants, catálogo y extensiones a orders
-- Migración: 007_merchants_catalog.sql
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. Agregar 'merchant' al enum user_role
-- ─────────────────────────────────────────────
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'merchant';

-- ─────────────────────────────────────────────
-- 2. MERCHANT CATEGORIES (tipos de comercio)
-- ─────────────────────────────────────────────
CREATE TABLE merchant_categories (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL UNIQUE,
  slug        TEXT        NOT NULL UNIQUE,
  icon        TEXT,                                  -- nombre de ícono lucide
  sort_order  INT         DEFAULT 0,
  is_active   BOOLEAN     DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Datos iniciales
INSERT INTO merchant_categories (name, slug, icon, sort_order) VALUES
  ('Restaurante',  'restaurante',  'UtensilsCrossed', 1),
  ('Farmacia',     'farmacia',     'Pill',            2),
  ('Tienda',       'tienda',       'ShoppingBag',     3),
  ('Supermercado', 'supermercado', 'ShoppingCart',     4),
  ('Otro',         'otro',         'Store',           5);

-- ─────────────────────────────────────────────
-- 3. MERCHANTS (comercios)
-- ─────────────────────────────────────────────
CREATE TABLE merchants (
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

  -- Ubicación
  address         TEXT         NOT NULL,
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,

  -- Configuración de negocio
  commission_pct  NUMERIC(5,2) DEFAULT 15.00 CHECK (commission_pct BETWEEN 0 AND 100),
  min_order_amount NUMERIC(10,2) DEFAULT 0,
  avg_prep_time_min INT        DEFAULT 30,
  opening_hours   JSONB        DEFAULT '{}',        -- { "mon": { "open": "08:00", "close": "22:00" }, ... }

  -- Métricas
  rating          NUMERIC(3,2) DEFAULT 0.00 CHECK (rating BETWEEN 0 AND 5),
  total_orders    INT          DEFAULT 0,
  total_revenue   NUMERIC(14,2) DEFAULT 0.00,

  -- Estado
  is_active       BOOLEAN      DEFAULT TRUE,
  is_featured     BOOLEAN      DEFAULT FALSE,

  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 4. MENU CATEGORIES (secciones del menú)
-- ─────────────────────────────────────────────
CREATE TABLE menu_categories (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID        REFERENCES merchants(id) ON DELETE CASCADE NOT NULL,
  name        TEXT        NOT NULL,
  description TEXT,
  sort_order  INT         DEFAULT 0,
  is_active   BOOLEAN     DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 5. PRODUCTS (items del catálogo)
-- ─────────────────────────────────────────────
CREATE TABLE products (
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

-- ─────────────────────────────────────────────
-- 6. MODIFIER GROUPS (grupos de modificadores)
-- ─────────────────────────────────────────────
CREATE TABLE modifier_groups (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id     UUID    REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  name           TEXT    NOT NULL,                  -- "Tamaño", "Extras", etc.
  min_selections INT     DEFAULT 0,
  max_selections INT     DEFAULT 1,
  is_required    BOOLEAN DEFAULT FALSE,
  sort_order     INT     DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 7. MODIFIERS (opciones individuales)
-- ─────────────────────────────────────────────
CREATE TABLE modifiers (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  modifier_group_id UUID        REFERENCES modifier_groups(id) ON DELETE CASCADE NOT NULL,
  name             TEXT         NOT NULL,            -- "Grande", "Extra queso"
  price_addition   NUMERIC(10,2) DEFAULT 0.00,       -- +Bs.5
  is_available     BOOLEAN      DEFAULT TRUE,
  sort_order       INT          DEFAULT 0,
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 8. EXTENDER tabla ORDERS para marketplace
-- ─────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS merchant_id          UUID REFERENCES merchants(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_items          JSONB;              -- snapshot de items [{product_id, name, qty, price, modifiers: [...]}]
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal             NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_fee          NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tip_amount           NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method       TEXT DEFAULT 'cash'; -- 'cash' | 'card' | 'qr'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status       TEXT DEFAULT 'pending'; -- 'pending' | 'paid' | 'refunded'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS merchant_status      TEXT DEFAULT 'none';   -- 'none' | 'pending' | 'accepted' | 'preparing' | 'ready' | 'rejected'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_prep_time_min INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_notes       TEXT;

-- ─────────────────────────────────────────────
-- 9. ÍNDICES
-- ─────────────────────────────────────────────
CREATE INDEX idx_merchants_zone       ON merchants(zone_id);
CREATE INDEX idx_merchants_category   ON merchants(category_id);
CREATE INDEX idx_merchants_owner      ON merchants(owner_id);
CREATE INDEX idx_merchants_active     ON merchants(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_merchants_slug       ON merchants(slug);
CREATE INDEX idx_menu_cat_merchant    ON menu_categories(merchant_id);
CREATE INDEX idx_products_merchant    ON products(merchant_id);
CREATE INDEX idx_products_category    ON products(category_id);
CREATE INDEX idx_products_available   ON products(is_available) WHERE is_available = TRUE;
CREATE INDEX idx_modifier_groups_prod ON modifier_groups(product_id);
CREATE INDEX idx_modifiers_group      ON modifiers(modifier_group_id);
CREATE INDEX idx_orders_merchant      ON orders(merchant_id);

-- ─────────────────────────────────────────────
-- 10. TRIGGERS updated_at
-- ─────────────────────────────────────────────
CREATE TRIGGER trg_merchant_categories_updated_at BEFORE UPDATE ON merchant_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_merchants_updated_at           BEFORE UPDATE ON merchants           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_menu_categories_updated_at     BEFORE UPDATE ON menu_categories     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated_at            BEFORE UPDATE ON products            FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────
-- 11. RLS (Row Level Security)
-- ─────────────────────────────────────────────
ALTER TABLE merchant_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants           ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_groups     ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifiers           ENABLE ROW LEVEL SECURITY;

-- Merchant Categories: todos leen, solo admin escribe
CREATE POLICY "merchant_categories_select" ON merchant_categories FOR SELECT USING (TRUE);
CREATE POLICY "merchant_categories_admin"  ON merchant_categories FOR ALL    USING (get_user_role() = 'admin');

-- Merchants: todos leen activos, merchant ve el suyo, admin todo
CREATE POLICY "merchants_select_active" ON merchants FOR SELECT USING (is_active = TRUE OR owner_id = auth.uid() OR get_user_role() IN ('admin', 'dispatcher'));
CREATE POLICY "merchants_owner_update"  ON merchants FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "merchants_admin_all"     ON merchants FOR ALL    USING (get_user_role() = 'admin');

-- Menu Categories: público lee, merchant dueño escribe, admin todo
CREATE POLICY "menu_categories_select" ON menu_categories FOR SELECT USING (TRUE);
CREATE POLICY "menu_categories_owner"  ON menu_categories FOR ALL    USING (
  EXISTS (SELECT 1 FROM merchants WHERE merchants.id = menu_categories.merchant_id AND merchants.owner_id = auth.uid())
);
CREATE POLICY "menu_categories_admin"  ON menu_categories FOR ALL    USING (get_user_role() = 'admin');

-- Products: público lee disponibles, merchant dueño escribe, admin todo
CREATE POLICY "products_select" ON products FOR SELECT USING (TRUE);
CREATE POLICY "products_owner"  ON products FOR ALL    USING (
  EXISTS (SELECT 1 FROM merchants WHERE merchants.id = products.merchant_id AND merchants.owner_id = auth.uid())
);
CREATE POLICY "products_admin"  ON products FOR ALL    USING (get_user_role() = 'admin');

-- Modifier Groups: público lee, merchant dueño escribe, admin todo
CREATE POLICY "modifier_groups_select" ON modifier_groups FOR SELECT USING (TRUE);
CREATE POLICY "modifier_groups_owner"  ON modifier_groups FOR ALL    USING (
  EXISTS (
    SELECT 1 FROM products p
    JOIN merchants m ON m.id = p.merchant_id
    WHERE p.id = modifier_groups.product_id AND m.owner_id = auth.uid()
  )
);
CREATE POLICY "modifier_groups_admin"  ON modifier_groups FOR ALL    USING (get_user_role() = 'admin');

-- Modifiers: público lee, merchant dueño escribe, admin todo
CREATE POLICY "modifiers_select" ON modifiers FOR SELECT USING (TRUE);
CREATE POLICY "modifiers_owner"  ON modifiers FOR ALL    USING (
  EXISTS (
    SELECT 1 FROM modifier_groups mg
    JOIN products p ON p.id = mg.product_id
    JOIN merchants m ON m.id = p.merchant_id
    WHERE mg.id = modifiers.modifier_group_id AND m.owner_id = auth.uid()
  )
);
CREATE POLICY "modifiers_admin"  ON modifiers FOR ALL    USING (get_user_role() = 'admin');

-- ─────────────────────────────────────────────
-- 12. REALTIME para productos y merchants
-- ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE merchants;
ALTER PUBLICATION supabase_realtime ADD TABLE products;

-- ─────────────────────────────────────────────
-- 13. Actualizar política de orders para merchants
-- ─────────────────────────────────────────────
CREATE POLICY "orders_merchant" ON orders FOR SELECT USING (
  merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid())
);
CREATE POLICY "orders_merchant_update" ON orders FOR UPDATE USING (
  merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid())
);
