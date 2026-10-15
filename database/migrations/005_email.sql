-- Email delivery: one-time password reset links and a log of emails sent to clients.
-- Additive only.

-- Only a SHA-256 of the token is stored, so a database leak can't be used to reset passwords.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id       CHAR(36) NOT NULL,
  token_hash    CHAR(64) NOT NULL UNIQUE,
  expires_at    DATETIME(6) NOT NULL,
  used_at       DATETIME(6) NULL,
  created_at    DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens (user_id, created_at);

-- What was emailed to whom and whether the mail server accepted it (bodies aren't kept).
CREATE TABLE IF NOT EXISTS email_log (
  id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id         CHAR(36) NULL,
  kind            VARCHAR(40) NOT NULL,
  to_address      VARCHAR(254) NOT NULL,
  subject         VARCHAR(200) NOT NULL,
  status          ENUM('SENT', 'FAILED') NOT NULL,
  error           VARCHAR(255) NULL,
  sent_by_admin   CHAR(36) NULL,
  created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_email_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_email_log_user ON email_log (user_id, created_at);
