-- Run in the Cloudflare D1 SQL editor before enabling public sign-in.
-- Provider IDs are unique; equal e-mail addresses are NOT automatically linked.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS crew_auth_users(
 id TEXT PRIMARY KEY,
 display_name TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS crew_auth_identities(
 provider TEXT NOT NULL CHECK(provider IN ('google','github')),
 provider_id TEXT NOT NULL,
 user_id TEXT NOT NULL REFERENCES crew_auth_users(id) ON DELETE CASCADE,
 created_at INTEGER NOT NULL,
 PRIMARY KEY(provider,provider_id)
);
CREATE INDEX IF NOT EXISTS crew_auth_identity_user ON crew_auth_identities(user_id);
CREATE TABLE IF NOT EXISTS crew_auth_sessions(
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES crew_auth_users(id) ON DELETE CASCADE,
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS crew_auth_session_user ON crew_auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS crew_auth_session_expiry ON crew_auth_sessions(expires_at);
