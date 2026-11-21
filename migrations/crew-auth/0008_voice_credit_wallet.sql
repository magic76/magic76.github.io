-- Koolo one-time voice credit groundwork, independent from Plus/Pro subscription.
-- Apply to the existing CREW_AUTH_DB D1. No top-up or metering writes are enabled.
-- D1 Console-safe: tables/indexes only; no multi-statement triggers.
PRAGMA foreign_keys=ON;

-- One server-owned wallet per authenticated Koolo account, measured in seconds.
-- Both available and reserved must remain nonnegative; never hold cash value.
CREATE TABLE IF NOT EXISTS koolo_voice_wallets (
 user_id TEXT PRIMARY KEY REFERENCES crew_auth_users(id) ON DELETE CASCADE,
 available_seconds INTEGER NOT NULL DEFAULT 0 CHECK(available_seconds >= 0),
 reserved_seconds INTEGER NOT NULL DEFAULT 0 CHECK(reserved_seconds >= 0),
 version INTEGER NOT NULL DEFAULT 0 CHECK(version >= 0),
 updated_at INTEGER NOT NULL
);

-- Append-only *by application contract*; never update/delete a completed event.
-- The wallet is a materialized projection, updated atomically with a ledger insert
-- by a future trusted server-only payment/session service. This migration does
-- not create write APIs or claim that metering/transactions are implemented.
-- A voice session will eventually reserve available seconds, consume reserved
-- time, and release any unused reservation exactly once.
CREATE TABLE IF NOT EXISTS koolo_voice_credit_ledger (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES crew_auth_users(id) ON DELETE CASCADE,
 event_type TEXT NOT NULL CHECK(event_type IN (
  'topup','reserve','consume','release','refund','adjustment'
 )),
 delta_available_seconds INTEGER NOT NULL,
 delta_reserved_seconds INTEGER NOT NULL DEFAULT 0,
 source_type TEXT NOT NULL CHECK(source_type IN (
  'billing_order','voice_session','admin','system'
 )),
 source_id TEXT NOT NULL CHECK(length(source_id) BETWEEN 1 AND 128),
 created_at INTEGER NOT NULL,
 UNIQUE(user_id,source_type,source_id,event_type),
 CHECK(
  (event_type='topup' AND delta_available_seconds>0 AND delta_reserved_seconds=0) OR
  (event_type='reserve' AND delta_available_seconds<0 AND delta_reserved_seconds=-delta_available_seconds) OR
  (event_type='consume' AND delta_available_seconds=0 AND delta_reserved_seconds<0) OR
  (event_type='release' AND delta_available_seconds>0 AND delta_reserved_seconds=-delta_available_seconds) OR
  (event_type='refund' AND delta_available_seconds<0 AND delta_reserved_seconds=0) OR
  (event_type='adjustment' AND delta_available_seconds<>0 AND delta_reserved_seconds=0)
 )
);
CREATE INDEX IF NOT EXISTS koolo_voice_credit_ledger_user_time
 ON koolo_voice_credit_ledger(user_id,created_at DESC);

-- Shared checkout order shell for FUTURE one-time products. The existing
-- koolo_fortune_orders remains authoritative for its current report system;
-- linking/migrating fortune orders is a separate verified billing PR.
CREATE TABLE IF NOT EXISTS koolo_billing_orders (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES crew_auth_users(id) ON DELETE CASCADE,
 product_kind TEXT NOT NULL CHECK(product_kind IN ('fortune_report','voice_pack')),
 product_id TEXT NOT NULL CHECK(length(product_id) BETWEEN 1 AND 100),
 credit_seconds INTEGER,
 amount_twd INTEGER NOT NULL CHECK(amount_twd > 0),
 currency TEXT NOT NULL DEFAULT 'TWD' CHECK(currency='TWD'),
 provider TEXT NOT NULL DEFAULT 'ecpay' CHECK(provider IN ('ecpay','google_play','apple')),
 provider_payment_id_hash TEXT UNIQUE,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN (
  'pending','paid','canceled','refunded','chargeback'
 )),
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 paid_at INTEGER,
 CHECK(
  (product_kind='voice_pack' AND credit_seconds IS NOT NULL AND credit_seconds>0)
  OR (product_kind='fortune_report' AND credit_seconds IS NULL)
 ),
 CHECK(status<>'paid' OR paid_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS koolo_billing_orders_user_created
 ON koolo_billing_orders(user_id,created_at DESC);

-- Gateway notifications must be signature-checked before insertion. Unique
-- event hashes support exactly-once processing/reconciliation in the next PR.
CREATE TABLE IF NOT EXISTS koolo_billing_events (
 id TEXT PRIMARY KEY,
 order_id TEXT NOT NULL REFERENCES koolo_billing_orders(id) ON DELETE CASCADE,
 provider TEXT NOT NULL CHECK(provider IN ('ecpay','google_play','apple')),
 provider_event_hash TEXT NOT NULL,
 event_type TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 UNIQUE(provider,provider_event_hash)
);
CREATE INDEX IF NOT EXISTS koolo_billing_events_order
 ON koolo_billing_events(order_id,created_at);
