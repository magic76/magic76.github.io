-- Sandbox-only order lifecycle metadata; settlement remains in the original order table.
-- Apply after 0013 before enabling the updated sandbox UI. Safe to repeat.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS koolo_fortune_stage_book_lifecycle (
 order_id TEXT PRIMARY KEY REFERENCES koolo_fortune_stage_book_orders(id) ON DELETE CASCADE,
 cancelled_at INTEGER,
 checked_at INTEGER,
 provider_state TEXT CHECK(provider_state IN ('unknown','failed'))
);
CREATE INDEX IF NOT EXISTS koolo_stage_book_active_lookup
 ON koolo_fortune_stage_book_orders(user_id,state,created_at);
