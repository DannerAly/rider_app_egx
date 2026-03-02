-- ============================================================
-- rider-egx: Schema inicial de la plataforma de delivery
-- Migración: 001_initial_schema.sql
-- ============================================================

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────
CREATE TYPE user_role      AS ENUM ('admin', 'dispatcher', 'rider', 'customer');
CREATE TYPE rider_status   AS ENUM ('offline', 'available', 'busy', 'on_break');
CREATE TYPE vehicle_type   AS ENUM ('bicycle', 'motorcycle', 'car', 'truck', 'walking');
CREATE TYPE order_status   AS ENUM (
  'pending', 'assigned', 'heading_to_pickup',
  'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed'
);
CREATE TYPE order_priority AS ENUM ('low', 'normal', 'high', 'urgent');

-- ─────────────────────────────────────────────
-- ZONES (debe existir antes que riders y orders)
-- ─────────────────────────────────────────────
CREATE TABLE zones (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  description TEXT,
  polygon     JSONB,                      -- GeoJSON Polygon { type, coordinates }
  color       TEXT        DEFAULT '#3B82F6',
  is_active   BOOLEAN     DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- PROFILES (extiende auth.users)
-- ─────────────────────────────────────────────
CREATE TABLE profiles (
  id         UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role       user_role   NOT NULL DEFAULT 'customer',
  full_name  TEXT,
  phone      TEXT,
  avatar_url TEXT,
  is_active  BOOLEAN     DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-crear profile al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────
-- RIDERS
-- ─────────────────────────────────────────────
CREATE TABLE riders (
  id                    UUID         REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  status                rider_status DEFAULT 'offline',
  vehicle_type          vehicle_type DEFAULT 'motorcycle',
  vehicle_plate         TEXT,
  vehicle_model         TEXT,
  current_lat           DOUBLE PRECISION,
  current_lng           DOUBLE PRECISION,
  current_heading       DOUBLE PRECISION,          -- grados 0-360
  last_location_update  TIMESTAMPTZ,
  zone_id               UUID         REFERENCES zones(id) ON DELETE SET NULL,
  rating                NUMERIC(3,2) DEFAULT 5.00 CHECK (rating BETWEEN 0 AND 5),
  total_deliveries      INT          DEFAULT 0,
  total_earnings        NUMERIC(12,2) DEFAULT 0.00,
  is_verified           BOOLEAN      DEFAULT FALSE,
  device_token          TEXT,                       -- para push notifications
  created_at            TIMESTAMPTZ  DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- CUSTOMERS
-- ─────────────────────────────────────────────
CREATE TABLE customers (
  id               UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  default_address  TEXT,
  default_lat      DOUBLE PRECISION,
  default_lng      DOUBLE PRECISION,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────
CREATE TABLE orders (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT         UNIQUE NOT NULL DEFAULT 'EGX-' || to_char(NOW(), 'YYYYMMDD') || '-' || floor(random() * 9000 + 1000)::TEXT,
  tracking_code TEXT        UNIQUE NOT NULL DEFAULT upper(substring(md5(random()::TEXT), 1, 8)),

  -- Actores
  customer_id    UUID        REFERENCES customers(id) ON DELETE SET NULL,
  rider_id       UUID        REFERENCES riders(id)    ON DELETE SET NULL,
  dispatcher_id  UUID        REFERENCES profiles(id)  ON DELETE SET NULL,
  zone_id        UUID        REFERENCES zones(id)     ON DELETE SET NULL,

  -- Punto de recogida
  pickup_address       TEXT             NOT NULL,
  pickup_lat           DOUBLE PRECISION NOT NULL,
  pickup_lng           DOUBLE PRECISION NOT NULL,
  pickup_contact_name  TEXT,
  pickup_contact_phone TEXT,
  pickup_notes         TEXT,

  -- Punto de entrega
  delivery_address       TEXT             NOT NULL,
  delivery_lat           DOUBLE PRECISION NOT NULL,
  delivery_lng           DOUBLE PRECISION NOT NULL,
  delivery_contact_name  TEXT,
  delivery_contact_phone TEXT,
  delivery_notes         TEXT,

  -- Estado y prioridad
  status   order_status   DEFAULT 'pending',
  priority order_priority DEFAULT 'normal',

  -- Tiempos
  scheduled_at   TIMESTAMPTZ,
  assigned_at    TIMESTAMPTZ,
  picked_up_at   TIMESTAMPTZ,
  delivered_at   TIMESTAMPTZ,
  cancelled_at   TIMESTAMPTZ,

  -- Paquete
  package_description TEXT,
  package_weight_kg   NUMERIC(6,2),
  requires_signature  BOOLEAN DEFAULT FALSE,
  proof_of_delivery   TEXT,             -- URL de foto/firma

  -- Tarifa
  distance_km    NUMERIC(8,2),
  base_fee       NUMERIC(10,2) DEFAULT 0,
  delivery_fee   NUMERIC(10,2) DEFAULT 0,
  total_fee      NUMERIC(10,2) DEFAULT 0,
  is_paid        BOOLEAN       DEFAULT FALSE,

  -- Rating del rider por el cliente
  rider_rating   SMALLINT CHECK (rider_rating BETWEEN 1 AND 5),
  rider_feedback TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- RIDER LOCATION HISTORY (para replay de rutas)
-- ─────────────────────────────────────────────
CREATE TABLE rider_location_history (
  id          BIGSERIAL        PRIMARY KEY,
  rider_id    UUID             REFERENCES riders(id) ON DELETE CASCADE NOT NULL,
  order_id    UUID             REFERENCES orders(id) ON DELETE SET NULL,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  speed_kmh   DOUBLE PRECISION,
  heading     DOUBLE PRECISION,
  accuracy_m  DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ      DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- ORDER STATUS HISTORY (auditoría de cambios)
-- ─────────────────────────────────────────────
CREATE TABLE order_status_history (
  id         BIGSERIAL    PRIMARY KEY,
  order_id   UUID         REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  status     order_status NOT NULL,
  notes      TEXT,
  changed_by UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────
CREATE TABLE notifications (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title      TEXT        NOT NULL,
  body       TEXT,
  type       TEXT        NOT NULL, -- 'order_assigned' | 'order_delivered' | 'rider_near' | ...
  data       JSONB,                -- payload extra (order_id, rider_id, etc.)
  is_read    BOOLEAN     DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- ÍNDICES
-- ─────────────────────────────────────────────
CREATE INDEX idx_orders_status       ON orders(status);
CREATE INDEX idx_orders_rider_id     ON orders(rider_id);
CREATE INDEX idx_orders_customer_id  ON orders(customer_id);
CREATE INDEX idx_orders_created_at   ON orders(created_at DESC);
CREATE INDEX idx_riders_status       ON riders(status);
CREATE INDEX idx_riders_zone_id      ON riders(zone_id);
CREATE INDEX idx_loc_history_rider   ON rider_location_history(rider_id, recorded_at DESC);
CREATE INDEX idx_loc_history_order   ON rider_location_history(order_id);
CREATE INDEX idx_notifications_user  ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_status_history_order ON order_status_history(order_id, created_at DESC);

-- ─────────────────────────────────────────────
-- TRIGGERS updated_at
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at  BEFORE UPDATE ON profiles  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_riders_updated_at    BEFORE UPDATE ON riders    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated_at    BEFORE UPDATE ON orders    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_zones_updated_at     BEFORE UPDATE ON zones     FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────
ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE riders                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications          ENABLE ROW LEVEL SECURITY;

-- Helper: obtener rol del usuario autenticado
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles: cada uno ve el suyo; admin ve todos
CREATE POLICY "profiles_select_own"  ON profiles FOR SELECT USING (id = auth.uid() OR get_user_role() IN ('admin', 'dispatcher'));
CREATE POLICY "profiles_update_own"  ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_admin_all"   ON profiles FOR ALL    USING (get_user_role() = 'admin');

-- Riders: riders ven su propio perfil; admin/dispatcher ven todos
CREATE POLICY "riders_select"  ON riders FOR SELECT USING (id = auth.uid() OR get_user_role() IN ('admin', 'dispatcher'));
CREATE POLICY "riders_update"  ON riders FOR UPDATE USING (id = auth.uid() OR get_user_role() IN ('admin', 'dispatcher'));
CREATE POLICY "riders_admin"   ON riders FOR ALL    USING (get_user_role() = 'admin');

-- Orders: cliente ve sus pedidos; rider ve los asignados; dispatcher/admin ven todos
CREATE POLICY "orders_customer" ON orders FOR SELECT USING (customer_id = (SELECT id FROM customers WHERE id = auth.uid()));
CREATE POLICY "orders_rider"    ON orders FOR SELECT USING (rider_id = auth.uid());
CREATE POLICY "orders_staff"    ON orders FOR ALL    USING (get_user_role() IN ('admin', 'dispatcher'));
CREATE POLICY "orders_rider_update" ON orders FOR UPDATE USING (rider_id = auth.uid());

-- Zones: todos pueden leer; solo admin escribe
CREATE POLICY "zones_select" ON zones FOR SELECT USING (TRUE);
CREATE POLICY "zones_admin"  ON zones FOR ALL    USING (get_user_role() = 'admin');

-- Location history: rider ve la suya; admin/dispatcher ven todas
CREATE POLICY "loc_rider"  ON rider_location_history FOR SELECT USING (rider_id = auth.uid() OR get_user_role() IN ('admin', 'dispatcher'));
CREATE POLICY "loc_insert" ON rider_location_history FOR INSERT WITH CHECK (rider_id = auth.uid());

-- Notifications: cada usuario ve las suyas
CREATE POLICY "notif_own" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_update" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- REALTIME: habilitar publicaciones
-- ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE riders;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE rider_location_history;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
