-- Subscription lifecycle and voice reservation foundation.
-- All timestamps are UTC unix seconds. These tables are inert until verified billing is enabled.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS koolo_subscriptions (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES crew_auth_users(id) ON DELETE CASCADE,
 provider TEXT NOT NULL CHECK(provider IN ('google_play','apple','web')),
 provider_subscription_key_hash TEXT NOT NULL,
 product_id TEXT NOT NULL,
 plan TEXT NOT NULL CHECK(plan IN ('plus','pro')),
 status TEXT NOT NULL CHECK(status IN ('pending','trialing','active','grace','past_due','canceled','expired','revoked')),
 current_period_start INTEGER,
 current_period_end INTEGER,
 auto_renew INTEGER NOT NULL DEFAULT 0 CHECK(auto_renew IN (0,1)),
 canceled_at INTEGER,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 UNIQUE(provider,provider_subscription_key_hash),
 CHECK(current_period_start IS NULL OR current_period_end IS NULL OR current_period_end>=current_period_start)
);
CREATE INDEX IF NOT EXISTS koolo_subscriptions_user_status ON koolo_subscriptions(user_id,status,current_period_end);
CREATE TABLE IF NOT EXISTS koolo_voice_sessions (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES crew_auth_users(id) ON DELETE CASCADE,
 period_key TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('reserved','active','closed','expired')),
 reserved_seconds INTEGER NOT NULL CHECK(reserved_seconds>0),
 consumed_seconds INTEGER NOT NULL DEFAULT 0 CHECK(consumed_seconds>=0),
 started_at INTEGER,
 last_heartbeat_at INTEGER,
 ended_at INTEGER,
 created_at INTEGER NOT NULL,
 CHECK(consumed_seconds<=reserved_seconds)
);
CREATE INDEX IF NOT EXISTS koolo_voice_sessions_user_period ON koolo_voice_sessions(user_id,period_key,status);
CREATE TABLE IF NOT EXISTS koolo_account_link_challenges (
 id TEXT PRIMARY KEY,
 source_user_id TEXT NOT NULL REFERENCES crew_auth_users(id) ON DELETE CASCADE,
 target_user_id TEXT REFERENCES crew_auth_users(id) ON DELETE CASCADE,
 verifier_hash TEXT NOT NULL UNIQUE,
 expires_at INTEGER NOT NULL,
 consumed_at INTEGER,
 created_at INTEGER NOT NULL,
 CHECK(target_user_id IS NULL OR target_user_id<>source_user_id)
);
CREATE INDEX IF NOT EXISTS koolo_account_link_expiry ON koolo_account_link_challenges(expires_at);
-- Account linking must be performed by a future explicit re-authenticated flow.
-- Never merge accounts automatically by email or client-supplied user IDs.
