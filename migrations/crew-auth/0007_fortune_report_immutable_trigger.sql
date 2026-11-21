-- Separate OPTIONAL trigger. Do NOT paste this with 0006 in D1 dashboard Console.
-- Once schema 0006 is applied, use Wrangler --remote --file or run this trigger alone.
-- Needed before real payments are activated to enforce stored report immutability.
-- Prevent accidental overwrites of a report already delivered to the buyer.
-- Refund/revocation may update status, but never rewrite its original text.
CREATE TRIGGER IF NOT EXISTS koolo_fortune_reports_lock_ready
BEFORE UPDATE ON koolo_fortune_reports
WHEN OLD.status='ready' AND (
 NEW.content_json IS NOT OLD.content_json OR NEW.title IS NOT OLD.title OR
 NEW.version IS NOT OLD.version OR NEW.order_id IS NOT OLD.order_id OR
 NEW.user_id IS NOT OLD.user_id OR NEW.mode IS NOT OLD.mode
)
BEGIN
 SELECT RAISE(ABORT,'ready_report_immutable');
END;
