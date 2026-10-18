-- Apply with: npx wrangler d1 execute crew-feedback --remote --file=db/migrations/0001_feedback.sql
CREATE TABLE IF NOT EXISTS feedback (
 id TEXT PRIMARY KEY,
 kind TEXT NOT NULL CHECK (kind IN ('bug','idea','other','rating')),
 rating INTEGER CHECK (rating IN (1,5)),
 reason TEXT NOT NULL DEFAULT '',
 message TEXT NOT NULL DEFAULT '',
 product TEXT NOT NULL CHECK (product IN ('teacher','friend','play','story','shorts','site')),
 platform TEXT NOT NULL CHECK (platform IN ('web','android')),
 page TEXT NOT NULL DEFAULT '',
 role_id TEXT NOT NULL DEFAULT '',
 model TEXT NOT NULL DEFAULT '',
 error_code TEXT NOT NULL DEFAULT '',
 locale TEXT NOT NULL DEFAULT '',
 build_version TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','closed')),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_feedback_status_created ON feedback(status,created_at DESC);
CREATE TABLE IF NOT EXISTS feedback_rate_limits (
 bucket TEXT PRIMARY KEY,
 hits INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
