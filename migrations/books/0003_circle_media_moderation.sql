-- Run AFTER 0001_init.sql and 0002_circle_topics.sql.
-- Keep the original tables, categories and owner tokens intact.
CREATE TABLE IF NOT EXISTS book_images (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES book_posts(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_book_images_post ON book_images(post_id, created_at);
CREATE TABLE IF NOT EXISTS book_reports (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES book_posts(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_book_reports_post ON book_reports(post_id, created_at);
