CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS magic_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 5,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_magic_codes_email ON magic_codes(email);
CREATE INDEX IF NOT EXISTS idx_magic_codes_code_hash ON magic_codes(code_hash);
CREATE INDEX IF NOT EXISTS idx_magic_codes_expires_at ON magic_codes(expires_at);

ALTER TABLE magic_codes ENABLE ROW LEVEL SECURITY;