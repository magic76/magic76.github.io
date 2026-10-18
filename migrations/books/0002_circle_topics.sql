-- Extend the original book exchange schema without losing existing posts/comments.
-- Run once, after 0001_init.sql and before enabling new circle posts.
-- SQLite ALTER TABLE on D1 supports additive columns; legacy kind CHECK remains intact.
ALTER TABLE book_posts ADD COLUMN category TEXT NOT NULL DEFAULT 'books';
ALTER TABLE book_posts ADD COLUMN post_type TEXT;
CREATE INDEX IF NOT EXISTS idx_book_posts_category ON book_posts(category, created_at DESC);
-- Existing posts use COALESCE(post_type, kind) to retain their original intent.
