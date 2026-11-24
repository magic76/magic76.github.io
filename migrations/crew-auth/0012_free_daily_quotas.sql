-- Shared crew-auth database, idempotent. No new D1 required.
CREATE TABLE IF NOT EXISTS crew_free_quota_policy (id INTEGER PRIMARY KEY CHECK(id=1),enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),text_cap INTEGER NOT NULL CHECK(text_cap BETWEEN 1 AND 10000),voice_cap INTEGER NOT NULL CHECK(voice_cap BETWEEN 1 AND 1000),updated_at INTEGER NOT NULL);
INSERT OR IGNORE INTO crew_free_quota_policy (id,enabled,text_cap,voice_cap,updated_at) VALUES (1,1,1500,100,0);
CREATE TABLE IF NOT EXISTS crew_guest_voice_daily (day TEXT PRIMARY KEY,used INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS crew_guest_voice_usage (visitor_hash TEXT NOT NULL,day TEXT NOT NULL,used INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(visitor_hash,day));
CREATE TABLE IF NOT EXISTS crew_guest_text_usage (visitor_hash TEXT NOT NULL,day TEXT NOT NULL,used INTEGER NOT NULL DEFAULT 0,last_at INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(visitor_hash,day));
