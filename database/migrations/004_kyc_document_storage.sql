-- KYC documents: store the uploaded file itself (AES-256-GCM encrypted with ENCRYPTION_KEY),
-- which side of a two-sided ID it is, and integrity metadata. Before this migration only a
-- placeholder storage key was recorded and the file was discarded.
-- The database is used as storage because Hostinger replaces the app directory on every deploy.
-- Additive only: existing rows keep working (content_encrypted stays NULL for them).

ALTER TABLE kyc_documents
  ADD COLUMN IF NOT EXISTS side ENUM('FRONT', 'BACK') NULL AFTER document_type,
  ADD COLUMN IF NOT EXISTS content_encrypted LONGBLOB NULL,
  ADD COLUMN IF NOT EXISTS size_bytes INT UNSIGNED NULL,
  ADD COLUMN IF NOT EXISTS sha256 CHAR(64) NULL;

-- When the user submitted their documents for review (NULL until they do).
ALTER TABLE kyc_profiles
  ADD COLUMN IF NOT EXISTS submitted_at DATETIME(6) NULL AFTER status;
