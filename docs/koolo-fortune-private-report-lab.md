# Koolo NT$379 — private AI report acceptance lab (NOT public)

## Scope and access

This is a **private report-writing acceptance page**, not a purchase feature. The UI is served by a protected Pages Function at `/fortune/report-lab`, while data fetches and generation use `/api/fortune/report-lab`.
There is **no menu link, public SPA route, public offer button, price change, checkout, paid entitlement, queue, R2 storage or production PDF generator** added by this PR.

Page URL after deployment: `https://koolo.app/fortune/report-lab` (the `/api/fortune/report-lab` endpoint is JSON-only and is not a user-facing page).
- Both the page GET and JSON API GET/POST require an existing valid Koolo `__Host-crew_session` (used to tie the report to a user), the origin allowlist and the **same server-side `verifyAccess` function used by `/api/usage/admin` and `/api/usage/report`**. This accepts an eligible Google-verified `KOOLO_ADMIN_EMAILS` administrator or the existing cryptographically verified Cloudflare Access policy; no separate fortune admin UUID list exists.
- Administrators who can use `/usage` and are also logged into Koolo can use this lab. Cloudflare Access alone **without a Koolo login** is not enough, because report ownership and storage require a signed-in user. Non-admin accounts receive **404** (missing Koolo login receives **401**). The HTML interface itself is not delivered to unauthorized users.
- The route is marked `noindex, nofollow, noarchive`, `no-store`, strict CSP, and has no public navigation link.
- No ECPay callback, purchase report or voice wallet is changed.
- Each allowed account can have **at most 3 in-progress or ready reports per Taipei day**. Failed reports do not consume one of these slots, and abandoned synchronous generations are marked failed after 15 minutes on the next submission.
- Generated text and compact derived chart facts live in **`koolo_fortune_lab_reports`** only. Access is scoped to `user_id`. Birth date, place, raw profile, private API key and payment details are **not** submitted.

## Required Cloudflare setup

1. Apply `migrations/crew-auth/0010_fortune_lab.sql` to the existing **`CREW_AUTH_DB` D1**, not a new DB. You can paste the full SQL into the D1 console: it has no compound triggers.
2. Sign in to Koolo using an account already permitted to use the management dashboard (`/usage`). The report lab reuses `/api/usage/admin`'s `verifyAccess` authorization and the existing `CREW_AUTH_DB`; **do not create or copy a separate administrator UUID list**. If `/usage` uses Cloudflare Access, complete that verification as well, and still sign in to Koolo so the private report can be bound to your account.
3. Cloudflare Pages project -> Settings -> Variables and Secrets -> **Production** (runtime). There is **no separate fortune-lab enabled switch**:
   - **No `KOOLO_FORTUNE_LAB_USER_IDS` is needed.** Existing `KOOLO_ADMIN_EMAILS` and/or Cloudflare Access settings continue to control dashboard administrator access.
   - `KOOLO_FORTUNE_LAB_GEMINI_KEY` = a valid Gemini developer key (**Secret**, never `VITE_*` or committed to Git).
   - Optional `KOOLO_FORTUNE_LAB_MODEL` = `gemini-2.5-flash` by default (**Text**). If unavailable on the key/account, set to a supported Gemini text model and re-deploy.
   - Existing `CREW_AUTH_DB` binding remains unchanged. To authorize a Google admin login, the existing `0005_verified_admin_email.sql` migration and `KOOLO_ADMIN_EMAILS` configuration must already be in place, just as for `/usage`.
4. Deploy Pages once the runtime variables are saved, including the new `/fortune/report-lab` Pages Function route in `_routes.json`. Open `https://koolo.app/fortune/report-lab` directly; no menu entry is added.

## How to test the 10-page book

1. In the same browser + origin (`koolo.app`), create an ordinary BaZi chart using `/fortune/reading?mode=bazi`.
2. Directly open the private lab URL. Select a saved BaZi chart, write one or two non-sensitive questions, and press **產生專屬命書（測試）**.
3. Keep the browser tab open for the bounded Gemini request; the V1 acceptance flow is **synchronous**, not a durable Queue job. Failed checks return an error and do not save a ready report.
4. Review 10 designed pages: cover, opening letter, computed chart, personality, work/wealth, relationships, three-year timeline, AI guide letter, four-week action plan, back cover.
5. Press **列印／儲存為 PDF**; choose Save as PDF, A4, enable background graphics, and disable browser headers/footers. Compare with the previously approved 10-page PDF layout.
6. Reload the lab. Use **已產生的測試命書** to open the account-owned saved snapshot. Visit using another signed-in account: no lab access or snapshot.
7. Test mobile widths 360 and 390, and 1280 desktop. Mobile pages may grow vertically to prevent text clipping; print uses fixed A4 pages.

## If generation returns HTML instead of JSON

The browser must **not** call `response.json()` blindly. The private lab now
checks HTTP status, Content-Type and redirects before decoding. A Cloudflare
HTML response is not a local-chart or D1 migration problem.

- **HTTP 200 + HTML:** the POST likely reached static SPA HTML rather than
  `functions/api/fortune/report-lab.js`, or an edge rewrite served a page.
  Check the Production deployment, route, and Cloudflare Rules.
- **HTTP 401/403 or redirect:** verify the existing Koolo login and the same
  Google-verified/Cloudflare Access policy used by `/usage`; a redirect to
  Access login does not produce API JSON.
- **HTTP 5xx + HTML:** inspect Cloudflare Workers & Pages > Pages project >
  Observability > Logs / real-time logs for a Function exception or edge
  timeout. Synchronous Gemini generation is now bounded to 65 seconds and
  returns a JSON `AI_TIMEOUT` (HTTP 504) when the upstream fetch is aborted.
- **HTTP 502 JSON `GEMINI_UPSTREAM_...` / `QUALITY_CHECK_FAILED`:** the
  Pages Function did execute; verify AI model availability and quality guards.
- The private lab JavaScript now has a version query and `no-store` cache
  rule so installed PWAs load diagnostics promptly. Do not paste tokens, full
  requests, birth data or Gemini keys into issue logs.

Changing the SQL or Gemini key cannot fix an edge rewrite that returns HTML.
If the error persists, record only the displayed HTTP status and error
category so the next diagnosis can target the appropriate layer.

## Constraints / open risks before charging customers

- Chart details originate from the **existing client-side BaZi calculator**. The server validates their shape, that day master matches the pillars, counts, current 3-year timeline, and allowed fields — but **does not independently recompute the true BaZi**. Do not reuse this as paid-order proof.
- Gemini writing is generated with a bounded 8192-token limit and server-side key. Output must be valid JSON, contain seven distinct substantive sections, mention the real day master/element and an actual supplied year; failures return **502** and are never published as ready.
- Do not treat the symbolic reading as professional medical, financial or legal advice.
- Synchronous generation may fail if a browser/network request disconnects. For paid customers, use **Queues/Workflows with idempotent retries** and a persisted job lifecycle.
- Browser print-to-PDF is for owner quality assurance only; production should implement server-controlled PDF generation and private R2 storage or equivalent.
- Production purchase still needs verified ECPay callback, D1 product catalog extension, double-charge prevention, billing reconciliation, refunds, permanent paid entitlements, and separation from the test table.
- The private lab is controlled by the existing server-side management authorization; there is no separate enabled switch. Revoke access through the existing admin policy. Report data remains until explicitly removed according to retention policy.

## Testing before merging

```bash
node --test tests/fortune-private-report-lab.test.mjs tests/fortune-paid-reports.test.mjs tests/koolo-ecpay-stage.test.mjs
npm run check:web
npm run build:web
npm run build:cloudflare
npm run test:cloudflare
```

Do not trigger manual GitHub Actions merely for this private acceptance feature; local tests and a controlled Pages deployment suffice.

### Diagnosing non-first-party HTTP 502 JSON

A valid private lab API JSON response includes the server marker `X-Koolo-Fortune-Lab-API: v1` and, on error, a safe `error` code. If the client receives HTTP 502 JSON without the `error` field, it now displays a distinct **Cloudflare/proxy response** message and a safe `CF-Ray` request ID when available; it does not print untrusted upstream response bodies. Use that Ray ID and timestamp in **Cloudflare Pages → Observability → Logs** to identify the platform failure; only the owner with Cloudflare access can inspect these logs. If a marked error is returned, inspect the safe `GEMINI_UPSTREAM_...`, `AI_TIMEOUT` or `QUALITY_CHECK_FAILED` code instead. Never expose API keys, user cookies, birth data or full prompt contents in reports or logs.
