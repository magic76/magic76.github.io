-- Phase 1: read-only cloud bookshelf for paid BaZi reports.
-- Apply to the SAME CREW_AUTH_DB D1 used by Koolo OAuth. No checkout is active.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS koolo_fortune_orders(
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES crew_auth_users(id) ON DELETE CASCADE,
 product_id TEXT NOT NULL CHECK(product_id='bazi-deep-v1'),
 amount_twd INTEGER NOT NULL CHECK(amount_twd=79),
 currency TEXT NOT NULL DEFAULT 'TWD' CHECK(currency='TWD'),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','canceled','refunded','chargeback')),
 provider TEXT NOT NULL DEFAULT 'ecpay' CHECK(provider='ecpay'),
 provider_payment_id_hash TEXT UNIQUE,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 paid_at INTEGER,
 CHECK(status<>'paid' OR paid_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS koolo_fortune_orders_user_status ON koolo_fortune_orders(user_id,status,created_at);

CREATE TABLE IF NOT EXISTS koolo_fortune_reports(
 id TEXT PRIMARY KEY,
 order_id TEXT NOT NULL UNIQUE REFERENCES koolo_fortune_orders(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES crew_auth_users(id) ON DELETE CASCADE,
 mode TEXT NOT NULL CHECK(mode='bazi'),
 title TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'generating' CHECK(status IN ('generating','ready','failed','revoked')),
 version TEXT NOT NULL DEFAULT 'bazi-deep-v1',
 -- Completed snapshot, not a prompt; the authorized owner can read it on another device.
 -- No birth profile, raw prompts, AI keys or payment credentials are required here.
 content_json TEXT CHECK(content_json IS NULL OR length(content_json)<=131072),
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 CHECK(status<>'ready' OR content_json IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS koolo_fortune_reports_user_created ON koolo_fortune_reports(user_id,created_at DESC);

-- Future verified ECPay notification reconciliation, unique to survive retries.
-- Never grant access from the browser redirect alone.
CREATE TABLE IF NOT EXISTS koolo_fortune_payment_events(
 id TEXT PRIMARY KEY,
 order_id TEXT NOT NULL REFERENCES koolo_fortune_orders(id) ON DELETE CASCADE,
 provider_event_hash TEXT NOT NULL UNIQUE,
 event_type TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
