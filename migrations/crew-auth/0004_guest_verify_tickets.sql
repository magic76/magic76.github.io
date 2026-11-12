-- Anonymized 30-minute proof of completed Turnstile verification.
-- No raw token, IP, user-agent, Gemini credential, or transcript is stored.
CREATE TABLE IF NOT EXISTS crew_guest_verify_tickets (
 ticket_hash TEXT PRIMARY KEY NOT NULL,
 visitor_hash TEXT NOT NULL,
 expires_at INTEGER NOT NULL,
 voice_redeemed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_crew_guest_verify_tickets_expires
 ON crew_guest_verify_tickets(expires_at);
