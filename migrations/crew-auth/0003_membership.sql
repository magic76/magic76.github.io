-- Koolo membership foundation. No payment grants or live billing in this migration.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS koolo_memberships (
 user_id TEXT PRIMARY KEY REFERENCES crew_auth_users(id) ON DELETE CASCADE,
 plan TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free','plus','pro')),
 status TEXT NOT NULL DEFAULT 'inactive' CHECK(status IN ('inactive','trialing','active','grace','past_due','canceled','expired','revoked')),
 current_period_end INTEGER,
 updated_at INTEGER NOT NULL,
 CHECK(plan <> 'free' OR status IN ('inactive','expired','revoked'))
);
CREATE TABLE IF NOT EXISTS koolo_purchases (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES crew_auth_users(id) ON DELETE CASCADE,
 provider TEXT NOT NULL CHECK(provider IN ('google_play','apple','web')),
 provider_purchase_id_hash TEXT NOT NULL,
 product_id TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('pending','verified','acknowledged','canceled','refunded','revoked')),
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 UNIQUE(provider,provider_purchase_id_hash)
);
CREATE INDEX IF NOT EXISTS koolo_purchases_user ON koolo_purchases(user_id);
CREATE TABLE IF NOT EXISTS koolo_entitlement_events (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES crew_auth_users(id) ON DELETE CASCADE,
 source TEXT NOT NULL CHECK(source IN ('google_play','apple','web','admin')),
 source_event_id TEXT NOT NULL,
 event_type TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 UNIQUE(source,source_event_id)
);
CREATE INDEX IF NOT EXISTS koolo_entitlement_events_user ON koolo_entitlement_events(user_id,created_at);
CREATE TABLE IF NOT EXISTS koolo_usage_ledger (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES crew_auth_users(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('voice_seconds','text_requests')),
 amount INTEGER NOT NULL CHECK(amount > 0),
 period_key TEXT NOT NULL,
 source_event_id TEXT NOT NULL UNIQUE,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS koolo_usage_user_period ON koolo_usage_ledger(user_id,period_key,kind);
