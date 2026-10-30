-- Crew Video TTS: bounded, protected GitHub-main queue consumer.
-- Run on existing crew-auth D1 before enabling CREW_VIDEO_TTS_ENABLED.
-- Audio is max 1.6 MB (Cloudflare D1 row limit 2MB) and is deleted after 7 days.
CREATE TABLE IF NOT EXISTS crew_video_tts_jobs (
 id TEXT PRIMARY KEY,
 created_day TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('processing','ready','failed')),
 seconds REAL,
 wav BLOB,
 error TEXT
);
CREATE INDEX IF NOT EXISTS crew_video_tts_jobs_created ON crew_video_tts_jobs (created_at);
CREATE INDEX IF NOT EXISTS crew_video_tts_jobs_daily ON crew_video_tts_jobs (created_day);