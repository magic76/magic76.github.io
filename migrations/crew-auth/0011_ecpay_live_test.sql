-- Isolated live verification receipts: never grants any paid product.
CREATE TABLE IF NOT EXISTS koolo_ecpay_live_test_orders (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES crew_auth_users(id),
 merchant_trade_no TEXT NOT NULL UNIQUE CHECK(length(merchant_trade_no)<=20),
 amount_twd INTEGER NOT NULL DEFAULT 10 CHECK(amount_twd=10),
 created_at INTEGER NOT NULL,
 paid_at INTEGER,
 callback_at INTEGER,
 callback_result TEXT CHECK(callback_result IN ('paid','failed','simulated')),
 trade_no_hash TEXT UNIQUE,
 query_at INTEGER,
 query_result TEXT,
 CHECK((paid_at IS NULL AND trade_no_hash IS NULL) OR (paid_at IS NOT NULL AND trade_no_hash IS NOT NULL AND callback_result='paid'))
);
CREATE INDEX IF NOT EXISTS koolo_ecpay_live_test_user ON koolo_ecpay_live_test_orders(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS koolo_ecpay_live_test_created ON koolo_ecpay_live_test_orders(created_at);
