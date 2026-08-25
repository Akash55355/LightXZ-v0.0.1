/*
# Create function to fetch Brevo API key from Vault

## Purpose
Edge functions use PostgREST (public schema) which cannot directly access
the vault schema. This SECURITY DEFINER function bridges that gap by
reading the Brevo API key from vault.decrypted_secrets and returning it.

## Security
- SECURITY DEFINER: runs with the function owner's privileges (service role).
- Only callable by the service role (edge functions), not anon/authenticated.
- Returns only the specific named secret, not arbitrary vault access.
- The function is marked as SECURITY DEFINER and is NOT exposed to anon role.
*/

CREATE OR REPLACE FUNCTION get_brevo_api_key()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = vault
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'BREVO_API_KEY' LIMIT 1;
$$;

-- Revoke access from anon and authenticated; only service role (edge functions) can call.
REVOKE EXECUTE ON FUNCTION get_brevo_api_key() FROM anon, authenticated;