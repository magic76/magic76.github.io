-- Persistent sandbox-only order query cooldowns. Never authorize production payment.
CREATE TABLE IF NOT EXISTS koolo_ecpay_stage_query_limits (
 order_id TEXT PRIMARY KEY,
 query_after INTEGER NOT NULL
);
