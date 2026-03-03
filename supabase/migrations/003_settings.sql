-- ============================================================
-- Migración 003: Tabla de configuración del negocio
-- ============================================================

CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  label      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Todos pueden leer (el frontend necesita base_fee para mostrar tarifas)
CREATE POLICY "settings_read"   ON settings FOR SELECT USING (true);
-- Solo admin puede actualizar
CREATE POLICY "settings_update" ON settings FOR UPDATE USING (get_user_role() = 'admin');

-- Valores por defecto
INSERT INTO settings (key, value, label) VALUES
  ('base_fee',       '10',        'Tarifa base (Bs.)'),
  ('fee_per_km',     '2',         'Tarifa por km (Bs.)'),
  ('company_name',   'rider-egx', 'Nombre de la empresa');
