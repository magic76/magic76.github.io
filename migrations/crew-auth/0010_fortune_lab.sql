-- Owner-only AI book acceptance; never joins paid orders, reports, or wallet grants.
-- Run on the existing CREW_AUTH_DB. No trigger / no checkout.
CREATE TABLE IF NOT EXISTS koolo_fortune_lab_reports(
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES crew_auth_users(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('generating','ready','failed')),
  model TEXT NOT NULL,
  content_json TEXT CHECK(content_json IS NULL OR length(content_json)<=50000),
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id,request_id)
);
CREATE INDEX IF NOT EXISTS koolo_fortune_lab_owner_created
  ON koolo_fortune_lab_reports(user_id,created_at DESC);
