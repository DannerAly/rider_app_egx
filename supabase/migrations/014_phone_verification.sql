-- 014: Phone verification + OTP fields
--
-- Adds columns to `profiles` for phone number verification via OTP.
--   - phone_verified     : whether the user has verified their phone number
--   - phone_verified_at  : timestamp of successful verification
--   - otp_hash           : hashed OTP code (never store plaintext)
--   - otp_sent_at        : when the last OTP was sent (used for cooldown / expiry)
--   - otp_attempts       : failed verification attempts counter (for rate-limiting)

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified    BOOLEAN     DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS otp_hash          TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS otp_sent_at       TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS otp_attempts      INT         DEFAULT 0;
