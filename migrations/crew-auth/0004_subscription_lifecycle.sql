-- Subscription lifecycle and metering primitives. Apply after 0003_membership.sql.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS koolo_subscriptions (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES crew_auth_users(id) ON DELETE CASCADE,
 provider TEXT NOT NULL CHECK(provider IN ('google_play','apple','web')),
 provider_subscription_id_hash TEXT NOT NULL,
 product_id TEXT NOT NULL,
 plan TEXT NOT NULL CHECK(plan IN ('plus','pro')),
 status TEXT NOT NULL CHECK(status IN ('pending','trialing','active','grace','on_hold','paused','canceled','expired','revoked')),
 started_at INTEGER NOT NULL,
 current_period_start INTEGER,
 current_period_end INTEGER,
 auto_renew INTEGER NOT NULL DEFAULT 0 CHECK(auto_renew IN (0,1)),
 canceled_at INTEGER,
 updated_at INTEGER NOT NULL,
 UNIQUE(provider,provider_subscription_id_hash),
 CHECK(current_period_end IS NULL OR current_period_start IS NULL OR current_period_end > current_period_start)
);
CREATE INDEX IF NOT EXISTS koolo_subscriptions_user ON koolo_subscriptions(user_id,status,current_period_end);
CREATE TABLE IF NOT EXISTS koolo_voice_sessions (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES crew_auth_users(id) ON DELETE CASCADE,
 period_key TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('reserved','active','settled','expired')),
 reserved_seconds INTEGER NOT NULL CHECK(reserved_seconds > 0),
 consumed_seconds INTEGER NOT NULL DEFAULT 0 CHECK(consumed_seconds >= 0),
 started_at INTEGER NOT NULL,
 last_heartbeat_at INTEGER,
 ended_at INTEGER,
 expires_at INTEGER NOT NULL,
 CHECK(consumed_seconds <= reserved_seconds)
);
CREATE INDEX IF NOT EXISTS koolo_voice_sessions_user_active ON koolo_voice_sessions(user_id,state,expires_at);
CREATE INDEX IF NOT EXISTS koolo_voice_sessions_expiry ON koolo_voice_sessions(state,expires_at);
-- Explicitly verified account linking only. Never link by email equality.
CREATE TABLE IF NOT EXISTS koolo_account_link_challenges (
 id TEXT PRIMARY KEY,
 source_user_id TEXT NOT NULL REFERENCES crew_auth_users(id) ON DELETE CASCADE,
 target_user_id TEXT NOT NULL REFERENCES crew_auth_users(id) ON DELETE CASCADE,
 challenge_hash TEXT NOT NULL UNIQUE,
 state TEXT NOT NULL CHECK(state IN ('pending','confirmed','expired','rejected')),
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 confirmed_at INTEGER,
 CHECK(source_user_id <> target_user_id)
);
CREATE INDEX IF NOT EXISTS koolo_account_link_expiry ON koolo_account_link_challenges(state,expires_at);
