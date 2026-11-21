# Koolo Voice Credits — read-only foundation (not activated)

## What this change DOES
- Existing Google/GitHub Koolo accounts stay the identity source; every wallet belongs to one `crew_auth_users.id`.
- Store future **paid voice time as integer seconds**, not TWD / stored cash value.
- Allow a per-account wallet with separate **available** and **reserved** seconds, an append-only-by-contract movement ledger, and idempotency keys.
- Stage a **general one-time checkout order** for `voice_pack` and `fortune_report`; it is NOT connected to the existing `koolo_fortune_orders` yet. Do not create two independently paid orders for one checkout. A later payment PR must explicitly choose the authoritative order, link any existing fortune record and verify reconciliation.
- Private `GET /api/voice/credits` returns `availableSeconds`, `reservedSeconds`, `totalSeconds`, and at most 30 account-only events; it always returns `topupsEnabled:false`, `paidVoiceEnabled:false`.
- A visible `/me/voice-credits` page linked from **My Koolo** shows balances, previous movement history and a clear "not available" notice.

## What this change DOES NOT do
- No new checkout, top-up, grant/adjust, reservation, metering, deduct, refund, or account-link **write** endpoint; no payment secrets or card data.
- No changed Gemini Live connection, microphone handling, guest 5-minute trial, Google Play, Plus/Pro plan or legacy membership limit.
- No change to existing fortune NT$79 interest survey, report read permissions or paid-report schema.
- There are no paid credits to spend yet. A zero balance does **not** block the existing free voice trial.

## Database setup (manual production gate)
1. Open **Cloudflare D1** for the existing Koolo auth DB bound to Pages as `CREW_AUTH_DB` — not a new database.
2. Execute **only** `migrations/crew-auth/0008_voice_credit_wallet.sql`. The script uses `CREATE TABLE/INDEX IF NOT EXISTS` and **contains no `CREATE TRIGGER`**, avoiding the earlier Console `incomplete input: SQLITE_ERROR` problem. It can be retried after partial success.
3. Verify tables:
   ```sql
   SELECT name FROM sqlite_master
   WHERE type='table' AND name IN (
      'koolo_voice_wallets',
      'koolo_voice_credit_ledger',
      'koolo_billing_orders',
      'koolo_billing_events'
   ) ORDER BY name;
   ```
   Expect four rows. No production D1 migration is executed automatically by merging.
4. Deploy Pages with `/api/voice/*` included in `_routes.json`. Anonymous `GET /api/voice/credits` => HTTP 401. Logged in, after migration => HTTP 200 and an empty wallet/ledger (zero seconds); missing D1 schema/binding => HTTP 503, **not** zero.

## Data invariants
- `koolo_voice_wallets.available_seconds` and `reserved_seconds` are nonnegative; projection row optional (new members have no row).
- `koolo_voice_credit_ledger` defines topup `(+available,0)`, reserve `(-available,+reserved)`, consume `(0,-reserved)`, release `(+available,-reserved)`, refund `(-available,0)` and admin adjustment `(+/-available,0)`.
- The tuple `(user_id,source_type,source_id,event_type)` is unique for idempotency. A verified order may cause **one** topup grant; the same notification must never credit twice.
- Never let a client submit deltas. Source IDs, owner and the actual paid/consumed state are server-verified. Legacy `koolo_usage_ledger` is a period usage counter, **not** a wallet balance.
- The materialized wallet balance + immutable ledger must be updated in a **single, contention-safe D1 transaction**, and settlement/concurrency must be implemented and tested **before any write endpoint is exposed**.
- Voice calls must reserve seconds before connection, periodically account for consumption, release unused time after hang-up/expiry, prevent double spending across devices/tabs, and handle failures/timeout. If measured seconds are disputed, retain source audit events.
- No expiry rule has been set yet. Decide expiry/refund/chargeback policy and ledger guards with legal review before selling minutes.
- When enabling purchases, server must validate ECPay signatures, currency/amount/product, paid state, merchant order and account binding. Only the server may mark an order paid, and notification retry must be idempotent.

## Privacy, access & deployment tests
- `GET /api/voice/credits` validates origin, expired session, trusted server-side session-user ID, and account-owned `WHERE user_id=?` queries. Unknown origins -> 404; logged out -> 401; unavailable table/DB -> 503.
- Response uses `Cache-Control: private, no-store` and `Vary: Cookie`. The ledger API returns **no provider payment reference, full order, billing ID, raw identity, key or card data**.
- `/me/voice-credits` and `/api/voice/*` are `noindex, nofollow`.
- Tests: `node --test tests/koolo-voice-credits.test.mjs`, `npm run check:web`, `npm run build:web`. CI should not be manually rerun just for the new read-only tables.

## Future billing enablement sequence
1. Establish stable wallet/session accounting and D1 atomic reservation/settlement; add read+write contract tests simulating simultaneous calls, crash recovery, duplicate notifications, refunds and malicious requests.
2. Implement a single product catalog and order initiation with explicit prices, verified ECPay checkout/callback, source idempotency and a unified purchase ledger. Bridge the existing fortune orders without charging twice.
3. Add mobile/platform-specific purchases and explicit Google/GitHub account linking if required; never merge accounts solely on matching email.
4. Use actual Gemini costs and merchant fees to set sustainable packs; only then enable paid voice requests and a user-facing purchase button.
