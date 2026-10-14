-- Vertex Trading - initial schema
-- Target: MariaDB 10.2.2+ (expression defaults and utf8mb4 large indexes).
-- Store DATETIME values in UTC; MariaDB does not have a time-zone-aware column type.
-- (or `npm run migrate` from database/backend/, which applies files in this folder in order)

SET SESSION default_storage_engine = InnoDB;

-- ============================================================
-- USERS & AUTH
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100) NOT NULL,
  email             VARCHAR(254) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci UNIQUE NOT NULL,
  mobile            VARCHAR(32),
  country           VARCHAR(2), -- ISO 3166-1 alpha-2
  password_hash     TEXT NOT NULL,
  email_verified_at DATETIME(6),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  is_suspended      BOOLEAN NOT NULL DEFAULT FALSE,
  failed_login_count SMALLINT NOT NULL DEFAULT 0,
  locked_until      DATETIME(6),
  created_at        DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at        DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS user_sessions (
  id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id         CHAR(36) NOT NULL,
  refresh_token_hash TEXT NOT NULL,
  ip_address      VARCHAR(45),
  user_agent      TEXT,
  device_label    TEXT,
  expires_at      DATETIME(6) NOT NULL,
  revoked_at      DATETIME(6),
  created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions (user_id);

CREATE TABLE IF NOT EXISTS two_factor_auth (
  user_id         CHAR(36) PRIMARY KEY,
  secret_encrypted TEXT,
  enabled         BOOLEAN NOT NULL DEFAULT FALSE,
  recovery_codes_encrypted TEXT,
  updated_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_two_factor_auth_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- KYC
-- ============================================================
CREATE TABLE IF NOT EXISTS kyc_profiles (
  id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id         CHAR(36) NOT NULL UNIQUE,
  status          ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ADDITIONAL_INFORMATION_REQUIRED') NOT NULL DEFAULT 'PENDING',
  reviewed_by     CHAR(36), -- references admin_users(id)
  reviewed_at     DATETIME(6),
  rejection_reason TEXT,
  created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_kyc_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS kyc_documents (
  id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  kyc_profile_id  CHAR(36) NOT NULL,
  document_type   ENUM('PASSPORT', 'NATIONAL_ID', 'DRIVERS_LICENSE', 'PROOF_OF_ADDRESS', 'SELFIE', 'OTHER') NOT NULL,
  storage_key     TEXT NOT NULL, -- path/key in secure object storage, never public
  original_filename TEXT,
  mime_type       TEXT,
  uploaded_at     DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_kyc_documents_profile FOREIGN KEY (kyc_profile_id) REFERENCES kyc_profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_profile ON kyc_documents (kyc_profile_id);

-- ============================================================
-- TRADING ACCOUNTS & CONFIGURABLE TIERS
-- ============================================================
CREATE TABLE IF NOT EXISTS account_tier_configs (
  tier                ENUM('STANDARD', 'PRO', 'VIP') PRIMARY KEY,
  min_deposit         NUMERIC(18,2) NOT NULL DEFAULT 0,
  default_leverage    INTEGER NOT NULL DEFAULT 100,
  spread_markup_bps   INTEGER NOT NULL DEFAULT 0, -- basis points added on top of raw spread
  commission_per_lot  NUMERIC(10,4) NOT NULL DEFAULT 0,
  description         TEXT
);

CREATE TABLE IF NOT EXISTS trading_accounts (
  id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id         CHAR(36) NOT NULL,
  mode            ENUM('DEMO', 'LIVE') NOT NULL DEFAULT 'DEMO',
  tier            ENUM('STANDARD', 'PRO', 'VIP') NOT NULL DEFAULT 'STANDARD',
  currency        VARCHAR(8) NOT NULL DEFAULT 'USD',
  leverage        INTEGER NOT NULL DEFAULT 100,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE (user_id, mode),
  CONSTRAINT fk_trading_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_trading_accounts_user ON trading_accounts (user_id);

-- ============================================================
-- INSTRUMENTS & MARKET DATA
-- ============================================================
CREATE TABLE IF NOT EXISTS instruments (
  id                  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  symbol              VARCHAR(20) UNIQUE NOT NULL, -- e.g. EUR/USD, BTC/USD
  class               ENUM('FOREX', 'CRYPTO') NOT NULL,
  base_asset          VARCHAR(10) NOT NULL,
  quote_asset         VARCHAR(10) NOT NULL,
  provider            TEXT NOT NULL, -- e.g. 'binance', 'frankfurter'
  provider_symbol     TEXT NOT NULL, -- symbol as the upstream provider names it
  is_executable       BOOLEAN NOT NULL DEFAULT FALSE, -- false = indicative price only, no order entry
  contract_size       NUMERIC(18,4) NOT NULL DEFAULT 1,
  min_volume          NUMERIC(18,4) NOT NULL DEFAULT 0.01,
  max_volume          NUMERIC(18,4) NOT NULL DEFAULT 100,
  volume_step         NUMERIC(18,4) NOT NULL DEFAULT 0.01,
  max_leverage        INTEGER NOT NULL DEFAULT 100,
  trading_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at          DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);

-- Latest quote per instrument (upserted on every tick)
CREATE TABLE IF NOT EXISTS market_quotes (
  instrument_id   CHAR(36) PRIMARY KEY,
  bid             NUMERIC(24,8) NOT NULL,
  ask             NUMERIC(24,8) NOT NULL,
  last            NUMERIC(24,8) NOT NULL,
  high_24h        NUMERIC(24,8),
  low_24h         NUMERIC(24,8),
  volume_24h      NUMERIC(24,8),
  change_24h_pct  NUMERIC(10,4),
  is_indicative   BOOLEAN NOT NULL DEFAULT TRUE, -- true until a real executable venue is connected
  source_ts       DATETIME(6) NOT NULL,
  received_at     DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_market_quotes_instrument FOREIGN KEY (instrument_id) REFERENCES instruments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candles (
  id              BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  instrument_id   CHAR(36) NOT NULL,
  timeframe       VARCHAR(4) NOT NULL, -- 1m,5m,15m,30m,1H,4H,1D,1W,1M
  open_time       DATETIME(6) NOT NULL,
  open            NUMERIC(24,8) NOT NULL,
  high            NUMERIC(24,8) NOT NULL,
  low             NUMERIC(24,8) NOT NULL,
  close           NUMERIC(24,8) NOT NULL,
  volume          NUMERIC(24,8) NOT NULL DEFAULT 0,
  UNIQUE (instrument_id, timeframe, open_time),
  CONSTRAINT fk_candles_instrument FOREIGN KEY (instrument_id) REFERENCES instruments(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_candles_lookup ON candles (instrument_id, timeframe, open_time);

-- ============================================================
-- ORDERS, EXECUTIONS, POSITIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  trading_account_id CHAR(36) NOT NULL,
  instrument_id     CHAR(36) NOT NULL,
  side              ENUM('BUY', 'SELL') NOT NULL,
  type              ENUM('MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT') NOT NULL,
  volume            NUMERIC(18,4) NOT NULL,
  limit_price       NUMERIC(24,8),
  stop_price        NUMERIC(24,8),
  stop_loss         NUMERIC(24,8),
  take_profit       NUMERIC(24,8),
  status            ENUM('PENDING', 'OPEN', 'FILLED', 'PARTIALLY_FILLED', 'CANCELLED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
  rejection_reason  TEXT,
  commission        NUMERIC(18,6) NOT NULL DEFAULT 0,
  fees              NUMERIC(18,6) NOT NULL DEFAULT 0,
  created_at        DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  executed_at       DATETIME(6),
  cancelled_at      DATETIME(6),
  CONSTRAINT fk_orders_trading_account FOREIGN KEY (trading_account_id) REFERENCES trading_accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_orders_instrument FOREIGN KEY (instrument_id) REFERENCES instruments(id)
);
CREATE INDEX IF NOT EXISTS idx_orders_account ON orders (trading_account_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);

CREATE TABLE IF NOT EXISTS order_executions (
  id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  order_id        CHAR(36) NOT NULL,
  fill_price      NUMERIC(24,8) NOT NULL,
  fill_volume     NUMERIC(18,4) NOT NULL,
  executed_at     DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_order_executions_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_executions_order ON order_executions (order_id);

CREATE TABLE IF NOT EXISTS positions (
  id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  trading_account_id CHAR(36) NOT NULL,
  instrument_id     CHAR(36) NOT NULL,
  opening_order_id  CHAR(36),
  side              ENUM('BUY', 'SELL') NOT NULL,
  volume            NUMERIC(18,4) NOT NULL,
  entry_price       NUMERIC(24,8) NOT NULL,
  stop_loss         NUMERIC(24,8),
  take_profit       NUMERIC(24,8),
  swap_accrued      NUMERIC(18,6) NOT NULL DEFAULT 0,
  margin_reserved   NUMERIC(18,2) NOT NULL DEFAULT 0,
  realized_pnl      NUMERIC(18,6),
  status            ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  opened_at         DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  closed_at         DATETIME(6),
  CONSTRAINT fk_positions_trading_account FOREIGN KEY (trading_account_id) REFERENCES trading_accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_positions_instrument FOREIGN KEY (instrument_id) REFERENCES instruments(id),
  CONSTRAINT fk_positions_opening_order FOREIGN KEY (opening_order_id) REFERENCES orders(id)
);
CREATE INDEX IF NOT EXISTS idx_positions_account ON positions (trading_account_id, status);

-- ============================================================
-- BALANCES & LEDGER
-- ============================================================
CREATE TABLE IF NOT EXISTS balances (
  trading_account_id CHAR(36) PRIMARY KEY,
  cash_balance      NUMERIC(18,2) NOT NULL DEFAULT 0, -- excludes open-position P/L
  used_margin       NUMERIC(18,2) NOT NULL DEFAULT 0,
  updated_at        DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_balances_trading_account FOREIGN KEY (trading_account_id) REFERENCES trading_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
  id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  trading_account_id CHAR(36) NOT NULL,
  type              ENUM('DEPOSIT', 'WITHDRAWAL', 'FEE', 'COMMISSION', 'SWAP', 'ADJUSTMENT', 'REALIZED_PNL') NOT NULL,
  amount            NUMERIC(18,2) NOT NULL, -- signed
  reference_id      CHAR(36), -- order_id / deposit_id / withdrawal_id depending on type
  description       TEXT,
  created_at        DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_transactions_trading_account FOREIGN KEY (trading_account_id) REFERENCES trading_accounts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions (trading_account_id, created_at);

-- ============================================================
-- DEPOSITS & WITHDRAWALS
-- ============================================================
CREATE TABLE IF NOT EXISTS deposits (
  id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  trading_account_id CHAR(36) NOT NULL,
  amount            NUMERIC(18,2) NOT NULL,
  currency          VARCHAR(8) NOT NULL DEFAULT 'USD',
  method            TEXT NOT NULL,
  provider_reference TEXT, -- payment provider's own transaction id, set on confirmation
  status            ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  created_at        DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  confirmed_at      DATETIME(6),
  CONSTRAINT fk_deposits_trading_account FOREIGN KEY (trading_account_id) REFERENCES trading_accounts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_deposits_account ON deposits (trading_account_id, created_at);

CREATE TABLE IF NOT EXISTS withdrawals (
  id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  trading_account_id CHAR(36) NOT NULL,
  amount            NUMERIC(18,2) NOT NULL,
  currency          VARCHAR(8) NOT NULL DEFAULT 'USD',
  method            TEXT NOT NULL,
  destination       TEXT NOT NULL,
  notes             TEXT,
  status            ENUM('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  otp_confirmed_at  DATETIME(6),
  approved_by       CHAR(36), -- admin_users(id)
  created_at        DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  processed_at      DATETIME(6),
  CONSTRAINT fk_withdrawals_trading_account FOREIGN KEY (trading_account_id) REFERENCES trading_accounts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_withdrawals_account ON withdrawals (trading_account_id, created_at);

-- ============================================================
-- FEES & COMMISSIONS (configurable schedules)
-- ============================================================
CREATE TABLE IF NOT EXISTS fees (
  id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name            TEXT NOT NULL,
  applies_to      TEXT NOT NULL, -- 'withdrawal' | 'inactivity' | 'conversion' | ...
  amount          NUMERIC(18,6),
  percentage_bps  INTEGER, -- basis points, alternative to flat amount
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS commissions (
  id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  instrument_id   CHAR(36),
  account_tier    ENUM('STANDARD', 'PRO', 'VIP') NOT NULL,
  per_lot_amount  NUMERIC(10,4) NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_commissions_instrument FOREIGN KEY (instrument_id) REFERENCES instruments(id) ON DELETE CASCADE
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id         CHAR(36) NOT NULL,
  type            TEXT NOT NULL, -- ORDER_FILLED, ORDER_REJECTED, SL_TRIGGERED, TP_TRIGGERED, DEPOSIT_COMPLETED, WITHDRAWAL_UPDATE, KYC_UPDATE, SECURITY_ALERT, ...
  title           TEXT NOT NULL,
  body            TEXT,
  read_at         DATETIME(6),
  created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, read_at);

-- ============================================================
-- BROKER / EXCHANGE API CONNECTIONS (admin-configured, secrets encrypted)
-- ============================================================
CREATE TABLE IF NOT EXISTS api_connections (
  id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  provider_name     TEXT NOT NULL, -- e.g. 'binance', a licensed forex broker's name
  provider_type     ENUM('FOREX', 'CRYPTO') NOT NULL,
  base_url          TEXT,
  api_key_encrypted TEXT,
  api_secret_encrypted TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT FALSE,
  created_by        CHAR(36), -- admin_users(id)
  created_at        DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at        DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);

-- ============================================================
-- ADMIN USERS & RBAC
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_roles (
  name            ENUM('SUPER_ADMIN', 'COMPLIANCE', 'TRADING_ADMIN', 'SUPPORT', 'FINANCE') PRIMARY KEY,
  description     TEXT
);

CREATE TABLE IF NOT EXISTS admin_users (
  id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email           VARCHAR(254) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  role            ENUM('SUPER_ADMIN', 'COMPLIANCE', 'TRADING_ADMIN', 'SUPPORT', 'FINANCE') NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);

ALTER TABLE kyc_profiles ADD CONSTRAINT fk_kyc_reviewed_by FOREIGN KEY IF NOT EXISTS (reviewed_by) REFERENCES admin_users(id);
ALTER TABLE withdrawals ADD CONSTRAINT fk_withdrawal_approved_by FOREIGN KEY IF NOT EXISTS (approved_by) REFERENCES admin_users(id);
ALTER TABLE api_connections ADD CONSTRAINT fk_api_conn_created_by FOREIGN KEY IF NOT EXISTS (created_by) REFERENCES admin_users(id);

-- ============================================================
-- AUDIT LOG (every sensitive admin / account action)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id              BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor_type      VARCHAR(16) NOT NULL, -- 'user' | 'admin' | 'system'
  actor_id        CHAR(36),
  action          TEXT NOT NULL, -- e.g. 'LOGIN', 'ORDER_PLACED', 'KYC_APPROVED', 'WITHDRAWAL_APPROVED'
  target_type     TEXT,
  target_id       CHAR(36),
  ip_address      VARCHAR(45),
  metadata        JSON,
  created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor_type, actor_id, created_at);

-- ============================================================
-- SYSTEM SETTINGS (admin-configurable platform-wide values)
-- ============================================================
CREATE TABLE IF NOT EXISTS system_settings (
  `key`           VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin PRIMARY KEY,
  value           JSON NOT NULL,
  updated_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);

-- Seed default account tiers (admin can edit via /admin, not hard-coded in app logic)
INSERT INTO account_tier_configs (tier, min_deposit, default_leverage, spread_markup_bps, commission_per_lot, description) VALUES
  ('STANDARD', 100,  100, 10, 0,    'Variable spread, configurable leverage, no commission'),
  ('PRO',      1000, 200, 2,  3.5,  'Lower spreads, commission-based pricing, advanced tools'),
  ('VIP',      10000,500, 0,  2.0,  'Custom pricing, dedicated support, advanced features')
ON DUPLICATE KEY UPDATE tier = tier;

INSERT INTO admin_roles (name, description) VALUES
  ('SUPER_ADMIN',   'Full access to all admin functions'),
  ('COMPLIANCE',    'KYC review, AML, compliance pages'),
  ('TRADING_ADMIN', 'Market/instrument and risk configuration'),
  ('SUPPORT',       'Read-only user support access'),
  ('FINANCE',       'Deposits, withdrawals, fees, commissions')
ON DUPLICATE KEY UPDATE name = name;
