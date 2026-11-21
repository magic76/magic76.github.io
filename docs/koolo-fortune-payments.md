# Koolo Fortune: paid BaZi report foundation (ECPay not yet active)

## Shipped in this stage
- Existing free fortune readings and NT$79 *interest survey* remain unchanged: **no checkout or charge is enabled**.
- A private, account-bound bookshelf is available at `/fortune/purchases` from **My Koolo** and the BaZi offer/history pages.
- `GET /api/fortune/reports` lists reports whose order belongs to the **authenticated** account and has `status='paid'`.
- `GET /api/fortune/reports/:id` returns the immutable plain-text snapshot **only** when the same account owns the paid order and the report is `ready`.
- Canceled/refunded/chargeback orders do not unlock reports; reports marked revoked are hidden.
- Both APIs require Koolo's existing `__Host-crew_session` cookie, use the session's server-side SHA-256 hash and expiry, reject unknown origins, and return `Cache-Control: private, no-store`. No browser-provided `user_id` or `plan` can grant access.
- No prompt, birth profile, Gemini key, provider credential, or raw purchase token is returned from the list API. Details return only report sections as plain text (never HTML).
- This is **not** a migration of free/local readings. `crew_fortune_readings_v2` stays local and unchanged.

## Required deployment step
1. Apply `migrations/crew-auth/0006_fortune_paid_reports.sql` to the existing D1 database bound to Pages as `CREW_AUTH_DB`. **Do not create a new D1 or replace the login database.**
2. Deploy Pages with the existing Functions directory and `/api/fortune/*` in `_routes.json`.
3. Validate while signed out: `GET https://koolo.app/api/fortune/reports` => 401. While signed in: => 200 `{"items":[]}` until a verified paid report exists. Missing migration or D1 binding must return 503 (not an empty list).
4. Open `/me` -> **已購買命理報告** -> `/fortune/purchases`; at 360px and 390px card layouts must not overflow.
5. Run `node --test tests/fortune-paid-reports.test.mjs tests/fortune-price-interest.test.js tests/crew-usage.test.js`; additionally run `npm run check:web`, `npm run build:web`, and `npm run test:cloudflare` when local environment is available. Do not manually trigger unnecessary private GitHub Actions.

## Record model (reserved for payment integration)
- `koolo_fortune_orders`: unique server-generated order ID, authenticated `user_id`, exact `bazi-deep-v1`, 79 TWD, pending/paid/refunded/chargeback status, **hashed** ECPay payment reference. One-time product, not subscription or Plus/Pro allowance.
- `koolo_fortune_reports`: one report per order, same owner, `generating/ready/failed/revoked`, immutable `content_json` snapshot, explicit report `version`; no browser-controlled write endpoint.
- `koolo_fortune_payment_events`: unique provider-event hash to support idempotent notification processing later.

The report's stored `content_json` schema is:
```json
{"sections":[{"title":"性格與優勢","body":"已完成的完整文字..."},{"title":"職涯與財運","body":"..."}]}
```
Each section is rendered by React as text. The report is a **completed snapshot**, not a re-run prompt; model or calculation upgrades must not silently replace purchased text.

## Next PR after merchant approval (not implemented yet)
1. Obtain approved ECPay merchant credentials and staging/prod configuration. Bind MerchantID/HashKey/HashIV as **Cloudflare server-side secrets** (never `VITE_*`, never in git).
2. At checkout, require a valid Koolo login; create a server-owned, pending, 79 TWD order with a minimal, explicitly consented, integrity-protected chart snapshot so the report can finish even if the browser closes. Design a duplicate-purchase check against existing paid orders and make order IDs idempotent. Avoid capturing extra birth data until purchase is enabled.
3. Redirect to an ECPay-hosted checkout with server-generated CheckMacValue. Treat the browser return URL as a *display update only*. Verify server-to-server payment notification MAC, amount (79), merchant, trade number, order identity, payment state, and idempotency before a transaction changes `pending` to `paid`.
4. Generate the paid report server-side, store a validated completed snapshot and mark it `ready` in a retry-safe job. If generation fails, keep `failed` and offer a free retry; never charge again for the same paid order. Support refunds and chargebacks by revoking read permission automatically.
5. Implement payment return/polling UI, order history, receipt/terms/refund policy, reconciliation, admin monitoring and failed-generation support. Test notification duplication, forged client responses, cross-account access, stale sessions, retries and cancellation.
6. Google and GitHub accounts are separate until explicit verified linking; equal emails alone never transfer reports.

Do not activate checkout by changing client-side flags alone. This repository stage contains **no public order creation, payment confirmation, paid entitlement mutation, or paid report generation endpoint**.
