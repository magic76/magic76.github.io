# Koolo NT$379 — private AI report acceptance lab (NOT public)

## Scope and access

This is a **private report-writing acceptance page**, not a purchase feature. The UI is served by a protected Pages Function at `/fortune/report-lab`, while data fetches and generation use `/api/fortune/report-lab`.
There is **no menu link, public SPA route, public offer button, price change, checkout, paid entitlement, queue, R2 storage or production PDF generator** added by this PR.

Page URL after deployment: `https://koolo.app/fortune/report-lab` (the `/api/fortune/report-lab` endpoint is JSON-only and is not a user-facing page).
- Both the page GET and JSON API GET/POST require an existing valid Koolo `__Host-crew_session` (used to tie the report to a user), the origin allowlist, `KOOLO_FORTUNE_LAB_ENABLED=1`, and the **same server-side `verifyAccess` function used by `/api/usage/admin` and `/api/usage/report`**. This accepts an eligible Google-verified `KOOLO_ADMIN_EMAILS` administrator or the existing cryptographically verified Cloudflare Access policy; no separate fortune admin UUID list exists.
- Administrators who can use `/usage` and are also logged into Koolo can use this lab. Cloudflare Access alone **without a Koolo login** is not enough, because report ownership and storage require a signed-in user. Non-admin accounts receive **404** (missing Koolo login receives **401**). The HTML interface itself is not delivered to unauthorized users.
- The route is marked `noindex, nofollow, noarchive`, `no-store`, strict CSP, and has no public navigation link.
- No ECPay callback, purchase report or voice wallet is changed.
- Each allowed account can create **at most 3 reports per Taipei day**, enforced in the D1 insert, including failures.
- Generated text and compact derived chart facts live in **`koolo_fortune_lab_reports`** only. Access is scoped to `user_id`. Birth date, place, raw profile, private API key and payment details are **not** submitted.

## Required Cloudflare setup

1. Apply `migrations/crew-auth/0010_fortune_lab.sql` to the existing **`CREW_AUTH_DB` D1**, not a new DB. You can paste the full SQL into the D1 console: it has no compound triggers.
2. Sign in to Koolo using an account already permitted to use the management dashboard (`/usage`). The report lab reuses `/api/usage/admin`'s `verifyAccess` authorization and the existing `CREW_AUTH_DB`; **do not create or copy a separate administrator UUID list**. If `/usage` uses Cloudflare Access, complete that verification as well, and still sign in to Koolo so the private report can be bound to your account.
3. Cloudflare Pages project -> Settings -> Variables and Secrets -> **Production** (runtime):
   - `KOOLO_FORTUNE_LAB_ENABLED` = `1` (**Text**; default OFF/404).
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

## Constraints / open risks before charging customers

- Chart details originate from the **existing client-side BaZi calculator**. The server validates their shape, that day master matches the pillars, counts, current 3-year timeline, and allowed fields — but **does not independently recompute the true BaZi**. Do not reuse this as paid-order proof.
- Gemini writing is generated with a bounded 8192-token limit and server-side key. Output must be valid JSON, contain seven distinct substantive sections, mention the real day master/element and an actual supplied year; failures return **502** and are never published as ready.
- Do not treat the symbolic reading as professional medical, financial or legal advice.
- Synchronous generation may fail if a browser/network request disconnects. For paid customers, use **Queues/Workflows with idempotent retries** and a persisted job lifecycle.
- Browser print-to-PDF is for owner quality assurance only; production should implement server-controlled PDF generation and private R2 storage or equivalent.
- Production purchase still needs verified ECPay callback, D1 product catalog extension, double-charge prevention, billing reconciliation, refunds, permanent paid entitlements, and separation from the test table.
- **Off switch**: set `KOOLO_FORTUNE_LAB_ENABLED=0` and redeploy; data remains for owner until manually removed according to retention policy.

## Testing before merging

```bash
node --test tests/fortune-private-report-lab.test.mjs tests/fortune-paid-reports.test.mjs tests/koolo-ecpay-stage.test.mjs
npm run check:web
npm run build:web
npm run build:cloudflare
npm run test:cloudflare
```

Do not trigger manual GitHub Actions merely for this private acceptance feature; local tests and a controlled Pages deployment suffice.
