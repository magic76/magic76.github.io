-- Run before enabling Koolo-session administrator access.
-- Verified Google emails are captured only from Google's authenticated userinfo response.
CREATE TABLE IF NOT EXISTS crew_auth_verified_emails (
 provider TEXT NOT NULL CHECK(provider='google'),
 provider_id TEXT NOT NULL,
 email TEXT NOT NULL,
 verified_at INTEGER NOT NULL,
 PRIMARY KEY(provider,provider_id),
 FOREIGN KEY(provider,provider_id) REFERENCES crew_auth_identities(provider,provider_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS crew_auth_verified_email_lookup ON crew_auth_verified_emails(email);
