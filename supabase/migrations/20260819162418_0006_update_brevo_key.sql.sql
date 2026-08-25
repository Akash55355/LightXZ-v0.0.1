/*
# Update Brevo API key in Vault

## Purpose
Deletes the old Brevo key and stores the new valid key.
*/

DELETE FROM vault.secrets WHERE name = 'BREVO_API_KEY';

SELECT vault.create_secret(
  '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',
  'BREVO_API_KEY',
  'Brevo API key for sending OTP emails'
);