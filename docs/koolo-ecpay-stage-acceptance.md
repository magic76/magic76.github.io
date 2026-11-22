# ECPay AIO sandbox: Koolo BaZi NT$79 — owner-only acceptance

This PR is a **sandbox harness only**. It cannot take real payments, grant any `koolo_fortune_orders` entitlement, modify `koolo_billing_orders`, or add voice credits. ECPay's **public stage merchant credentials are public** and must never be interpreted as cryptographic proof of actual money transfer. Never use these stage keys to mark a real purchase paid.

## Deployment steps (run in order)

1. Merge/deploy the code to `koolo.app` (Cloudflare Pages). Leave the stage toggle OFF until you prepare the tester account.
2. In **the existing Cloudflare D1 bound as `CREW_AUTH_DB`**, execute *only* `migrations/crew-auth/0009_ecpay_stage_only.sql`. The table is completely isolated from the purchased report library; there is no trigger, and it is safe to retry `CREATE TABLE IF NOT EXISTS`.
3. Sign into `https://koolo.app` via Google or GitHub and visit `https://koolo.app/api/auth/session`. Copy **only the `user.id` value** for your own Cloudflare configuration (a UUID). Do not paste any session token, OAuth secret or user ID into a public issue/chat.
4. Cloudflare Pages project → Settings → Variables and Secrets → **Production**:
   - `KOOLO_ECPAY_STAGE_ENABLED` = `1` (plain variable; strictly opt-in).
   - `KOOLO_ECPAY_TEST_USER_IDS` = the signed-in `user.id` (comma-separated if necessary). Never set `*` or leave an empty allowlist.
   - Redeploy so Functions receive the updated bindings if necessary. Do not set any **production** ECPay MerchantID/HashKey/HashIV for this test harness. It only uses the **published** ECPay test merchant `3002607` and the official stage gateway.
5. Visit `https://koolo.app/fortune/reading?mode=bazi`, calculate a BaZi chart and look for the **管理員：前往綠界付款測試** button under the NT$79 interest panel; or open `https://koolo.app/fortune/ecpay/test` directly and select a previously calculated BaZi chart.
6. Press **測試付款 NT$79（不會真扣款）**. A server-owned pending sandbox order is created and the browser form-posts to `https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5`. Verify the browser's address is **payment-stage.ecpay.com.tw**, never `payment.ecpay.com.tw`. On the ECPay test card form, use:
   - **ECPay published sandbox card** `4311-9522-2222-2222` (or `4311-9511-1111-1111`).
   - CVV **any three digits** (e.g. `222`); expiry **after current month/year**; ECPay stage 3-D verification code `1234` if prompted.
   - **Never use a real card**.
7. Complete sandbox payment. Follow ECPay's **返回商店** button if shown; alternatively return manually to `https://koolo.app/fortune/ecpay/test` → **我的測試訂單**. The page polls the **server-side** order state, not the browser return parameters. Expected: **測試付款成功，示範報告已保存** and 8 report sections.
8. Refresh, sign out and sign back in using the **same** account, or use another device with that same account. `/fortune/ecpay/test` → **我的測試訂單** must retain the demo report. A different account must not read it. `/fortune/purchases` must remain unchanged: sandbox tests do not appear as real paid reports.
9. Testing only: stage notifications use `POST https://koolo.app/api/fortune/ecpay/test-notify` (no browser cookie). The endpoint requires valid CheckMacValue, merchant ID, merchant order ID, NT$79 and successful Credit status; only then atomically writes the demo report. Replayed signed notifications do not regenerate another report. Failed or `SimulatePaid=1` notifications are ACKed but do **not** unlock the test report.

## Verification & troubleshooting

- Without config: `GET /api/fortune/ecpay/test-config` returns **503** (`STAGE_DISABLED`), and the price panel does **not** show test checkout.
- With config but no Koolo login: **401**.
- Logged-in but non-allowlisted account: **403**.
- Missing `0009` on the D1 actually bound to Pages: **503**.
- Allowed owner, correct migration + flag: `GET /api/fortune/ecpay/test-config` returns **200**, `{"enabled":true,"sandbox":true,"amountTwd":79}`.
- No verified ECPay callback yet: order stays `pending`. The return button does **not** grant access. If ECPay shows success but still pending, check **Cloudflare Pages Functions logs** and that Cloudflare WAF/Access isn't blocking the callback endpoint. Consult the ECPay stage merchant console if needed.
- Duplicate callbacks with the same TradeNo: no second write. Signature/amount tampering: HTTP 403/422, no report.
- Same-account order JSON has no birth name/address/date or keys. Only a restricted snapshot of calculated chart symbols is sent. **The sample is rule-based and is not the finished paid AI report**.
- `npm run check:web`, `npm run build:web`, `node --test tests/koolo-ecpay-stage.test.mjs tests/fortune-paid-reports.test.mjs` and `npm run test:cloudflare` where available.
- To turn this harness OFF without losing test data: set `KOOLO_ECPAY_STAGE_ENABLED=0` and redeploy. It does not affect current free fortune or voice.
- Maximum 12 test orders/account per rolling 24 hours to limit abuse.

## Future real-money PR (NOT included)

- Distinct private **live** MerchantID/HashKey/HashIV as Cloudflare Secrets, with verified payment callback, order querying/reconciliation, refund and dispute handling, idempotency plus duplicate purchase protections.
- Bind authenticated, verified chart snapshots with explicit consent. Current sandbox chart symbols come from the browser and are **not trusted** for a paid product.
- Complete the production deep-report generation service with accepted report version, two question choices, years/followups, retry/monitoring and testing. Do not silently ship the simple demo report as a paid NT$79 product.
- Activate `0007` immutable report trigger and verify production report ownership, D1 transactions and business/reconciliation rules before charging any customers.

## Official sources

- ECPay test merchant/card/code: https://developers.ecpay.com.tw/2856/
- Checkout API/fields: https://developers.ecpay.com.tw/2864/
- ECPay MAC SHA256 algorithm: https://developers.ecpay.com.tw/2902/
- Server-side result notification `1|OK`: https://developers.ecpay.com.tw/2878/
