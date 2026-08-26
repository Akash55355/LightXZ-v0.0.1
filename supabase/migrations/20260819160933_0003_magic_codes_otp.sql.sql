/*
# Create magic_codes table for OTP email authentication

## Purpose
Stores hashed one-time numeric codes (OTP) for email-based authentication.
The actual 6-digit code is NEVER stored in plaintext — only its SHA-256 hash.
This table is written to and read from exclusively by edge functions using
the service_role key, so RLS is enabled and NO policies are added for anon/authenticated
roles — the table is locked down to everyone except the service role (which bypasses RLS).

## New Tables
- `magic_codes`
  - `id` (uuid, primary key, auto-generated)
  - `email` (text, not null) — the email address the code was sent to
  - `code_hash` (text, not null) — SHA-256 hash of the 6-digit OTP
  - `expires_at` (timestptz, not null) — when the code expires (10 minutes from creation)
  - `attempts` (integer, default 0) — number of failed verification attempts
  - `max_attempts` (integer, default 5) — maximum allowed attempts before code is invalidated
  - `used` (boolean, default false) — whether this code has been successfully used
  - `created_at` (timestamptz, default now()) — when the code was created

## Indexes
- `idx_magic_codes_email` on `email` — for looking up codes by email
- `idx_magic_codes_code_hash` on `code_hash` — for looking up codes by hash
- `idx_magic_codes_expires_at` on `expires_at` — for cleanup of expired codes

## Security
- RLS is ENABLED on `magic_codes`.
- NO policies are created for anon or authenticated roles — only the service_role
  (used by edge functions) can read/write this table, because service_role bypasses RLS.
- The anon key cannot access this table at all, which is the correct behavior:
  the frontend never touches this table directly, only via edge functions.

## Important Notes
1. The `pgcrypto` extension is required for `gen_random_uuid()` and is enabled if not present.
2. Only hashed codes are stored — plaintext OTP codes exist only in the edge function
   memory and in the outgoing email. They are never persisted or logged.
3. Rate limiting (5 codes/hour, 60s cooldown) is enforced in the edge function logic,
   not at the database level, because it requires counting recent rows.
*/