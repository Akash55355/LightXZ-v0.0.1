/*
# Create magic_codes table for OTP email authentication

## Purpose
Stores hashed one-time numeric codes (OTP) for email-based authentication.
Only SHA-256 hashes are stored — never plaintext codes.

## New Tables
- `magic_codes`
  - `id` uuid PK
  - `email` text NOT NULL
  - `code_hash` text NOT NULL (SHA-256 of 6-digit OTP)
  - `expires_at` timestamptz NOT NULL (now() + 10 minutes)
  - `attempts` integer DEFAULT 0
  - `max_attempts` integer DEFAULT 5
  - `used` boolean DEFAULT false
  - `created_at` timestamptz DEFAULT now()

## Indexes
- idx_magic_codes_email on email
- idx_magic_codes_code_hash on code_hash
- idx_magic_codes_expires_at on expires_at

## Security
- RLS ENABLED, NO anon/authenticated policies — only service_role (edge functions) can access.
- Frontend never touches this table directly.

## Notes
- pgcrypto extension enabled for gen_random_uuid().
- Rate limiting enforced in edge function logic (5 codes/hour, 60s cooldown).
*/

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