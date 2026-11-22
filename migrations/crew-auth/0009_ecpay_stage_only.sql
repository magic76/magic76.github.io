-- ECPay AIO STAGE-ONLY test orders. NOT a production entitlement.
-- Apply to the existing CREW_AUTH_DB after 0006; console-safe; idempotent.
-- Never use this table as authorization for full paid reports or voice minutes.
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS koolo_fortune_stage_orders (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES crew_auth_users(id) ON DELETE CASCADE,
 merchant_trade_no TEXT NOT NULL UNIQUE CHECK(length(merchant_trade_no) BETWEEN 1 AND 20),
 amount_twd INTEGER NOT NULL DEFAULT 79 CHECK(amount_twd=79),
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','paid')),
 facts_json TEXT NOT NULL CHECK(length(facts_json) BETWEEN 2 AND 4096),
 report_json TEXT CHECK(report_json IS NULL OR length(report_json)<=131072),
 trade_no_hash TEXT,
 created_at INTEGER NOT NULL,
 paid_at INTEGER,
 CHECK((state='pending' AND paid_at IS NULL AND report_json IS NULL AND trade_no_hash IS NULL)
   OR (state='paid' AND paid_at IS NOT NULL AND report_json IS NOT NULL AND trade_no_hash IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS koolo_fortune_stage_orders_user_created
 ON koolo_fortune_stage_orders(user_id,created_at DESC);
