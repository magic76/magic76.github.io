-- Phase 3: one successful 60-second Live guest trial per signed-in account.
-- Apply to the same crew-auth D1 database used for OAuth sessions.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS crew_guest_usage(
 user_id TEXT PRIMARY KEY REFERENCES crew_auth_users(id) ON DELETE CASCADE,
 used INTEGER NOT NULL DEFAULT 0 CHECK(used >= 0),
 updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS crew_guest_ticket_claims(
 nonce TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES crew_auth_users(id) ON DELETE CASCADE,
 claimed_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS crew_guest_ticket_claims_time ON crew_guest_ticket_claims(claimed_at);
