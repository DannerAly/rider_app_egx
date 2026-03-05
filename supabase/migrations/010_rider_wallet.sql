-- 010_rider_wallet.sql
-- Wallet del rider: saldo y transacciones

-- Wallet principal del rider (1 por rider)
CREATE TABLE IF NOT EXISTS rider_wallets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance     NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_earned NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_withdrawn NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Transacciones del wallet
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id     UUID NOT NULL REFERENCES rider_wallets(id) ON DELETE CASCADE,
  rider_id      UUID NOT NULL REFERENCES auth.users(id),

  -- Tipo: credit (ingreso) o debit (retiro/descuento)
  type          TEXT NOT NULL CHECK (type IN ('credit', 'debit')),

  -- Categoría
  category      TEXT NOT NULL CHECK (category IN (
    'delivery_fee',   -- Pago por entrega
    'tip',            -- Propina del cliente
    'bonus',          -- Bono de la plataforma
    'withdrawal',     -- Retiro de dinero
    'adjustment',     -- Ajuste manual (admin)
    'penalty'         -- Penalización
  )),

  amount        NUMERIC(10,2) NOT NULL,
  balance_after NUMERIC(10,2) NOT NULL,
  description   TEXT,

  -- Referencia opcional a orden
  order_id      UUID REFERENCES orders(id) ON DELETE SET NULL,

  -- Metadata
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_rider_id ON wallet_transactions(rider_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_category ON wallet_transactions(category);
CREATE INDEX IF NOT EXISTS idx_rider_wallets_rider_id ON rider_wallets(rider_id);

-- RLS
ALTER TABLE rider_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Rider ve su propio wallet
CREATE POLICY "Rider can view own wallet"
  ON rider_wallets FOR SELECT
  USING (rider_id = auth.uid());

-- Admin puede ver todo
CREATE POLICY "Admin full access on rider_wallets"
  ON rider_wallets FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dispatcher'))
  );

-- Rider ve sus transacciones
CREATE POLICY "Rider can view own transactions"
  ON wallet_transactions FOR SELECT
  USING (rider_id = auth.uid());

-- Admin puede ver y crear transacciones
CREATE POLICY "Admin full access on wallet_transactions"
  ON wallet_transactions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dispatcher'))
  );

-- Trigger updated_at
CREATE OR REPLACE TRIGGER set_rider_wallets_updated_at
  BEFORE UPDATE ON rider_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Función para acreditar al wallet del rider (llamada desde la API)
CREATE OR REPLACE FUNCTION credit_rider_wallet(
  p_rider_id UUID,
  p_amount NUMERIC,
  p_category TEXT,
  p_description TEXT DEFAULT NULL,
  p_order_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_wallet_id UUID;
  v_new_balance NUMERIC;
  v_txn_id UUID;
BEGIN
  -- Obtener o crear wallet
  INSERT INTO rider_wallets (rider_id)
  VALUES (p_rider_id)
  ON CONFLICT (rider_id) DO NOTHING;

  SELECT id INTO v_wallet_id FROM rider_wallets WHERE rider_id = p_rider_id;

  -- Actualizar balance
  UPDATE rider_wallets
  SET balance = balance + p_amount,
      total_earned = total_earned + p_amount
  WHERE id = v_wallet_id
  RETURNING balance INTO v_new_balance;

  -- Registrar transacción
  INSERT INTO wallet_transactions (wallet_id, rider_id, type, category, amount, balance_after, description, order_id)
  VALUES (v_wallet_id, p_rider_id, 'credit', p_category, p_amount, v_new_balance, p_description, p_order_id)
  RETURNING id INTO v_txn_id;

  RETURN v_txn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para débito (retiros)
CREATE OR REPLACE FUNCTION debit_rider_wallet(
  p_rider_id UUID,
  p_amount NUMERIC,
  p_category TEXT,
  p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_wallet_id UUID;
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_txn_id UUID;
BEGIN
  SELECT id, balance INTO v_wallet_id, v_current_balance
  FROM rider_wallets WHERE rider_id = p_rider_id;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet no encontrado';
  END IF;

  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  UPDATE rider_wallets
  SET balance = balance - p_amount,
      total_withdrawn = total_withdrawn + p_amount
  WHERE id = v_wallet_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO wallet_transactions (wallet_id, rider_id, type, category, amount, balance_after, description)
  VALUES (v_wallet_id, p_rider_id, 'debit', p_category, p_amount, v_new_balance, p_description)
  RETURNING id INTO v_txn_id;

  RETURN v_txn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
