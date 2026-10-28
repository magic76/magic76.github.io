-- Apply in a NEW D1 database bound as GUEST_DB before enabling public trials.
-- No IP addresses, User-Agent strings, API keys, audio, or transcripts are stored.
CREATE TABLE IF NOT EXISTS guest_trial_claims (
  fingerprint TEXT PRIMARY KEY NOT NULL,
  claimed_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_guest_trial_claims_expires ON guest_trial_claims(expires_at);

CREATE TABLE IF NOT EXISTS guest_daily_quota (
  day TEXT PRIMARY KEY NOT NULL,
  used INTEGER NOT NULL DEFAULT 0 CHECK (used >= 0)
);
