/*
# Store Brevo API key in Vault

## Purpose
Stores the Brevo (Sendinblue) API key securely in Supabase Vault so the
send-code edge function can use it via the `Deno.env` interface.
Vault secrets are automatically exposed as environment variables to
edge functions when named matching the expected env var name.

## Security
- The key is stored in vault.decrypted_secrets, encrypted at rest.
- Only the service role (edge functions) can access it.
- The key is never stored in the codebase or .env file.
*/

SELECT vault.create_secret(
  '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',
  'BREVO_API_KEY',
  'Brevo API key for sending OTP emails'
);