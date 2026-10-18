-- Run once in Cloudflare D1, after creating the BOOKS_DB binding.
-- The board is a private group pilot; no personal contact details are collected.
CREATE TABLE IF NOT EXISTS book_posts (
  id TEXT PRIMARY KEY,
  author TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL CHECK (kind IN ('swap','sell','give','want')),
  price INTEGER,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reserved','closed')),
  owner_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS book_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES book_posts(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_books_posts_created ON book_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_comments_post ON book_comments(post_id,created_at);
