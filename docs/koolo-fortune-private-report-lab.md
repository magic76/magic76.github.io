# Koolo NT$379 — private AI report acceptance lab (NOT public)

## Scope and access

This is a **private report-writing acceptance tool**, not a purchase feature.
There is **no menu link, React SPA route, public offer button, price change, checkout, paid entitlement, queue, R2 storage or production PDF generator** added by this PR.

URL after deployment: \`https://koolo.app/api/fortune/report-lab\`
- Every GET and POST first requires an existing valid \`__Host-crew_session\`, origin allowlist, \`KOOLO_FORTUNE_LAB_ENABLED=1\`, and the server-only exact \`crew_auth_users.id\` allowlist.
- All non-allowed accounts receive HTTP **404** (a signed-out account gets 401); the HTML interface itself is NOT delivered to other users.
- The route is marked \`noindex, nofollow, noarchive\`, \`no-store\`, strict CSP, and has no public navigation link.
- No ECPay callback, purchase report or voice wallet is changed.
- Each allowed account can create **at most 3 reports per Taipei day**, enforced in the D1 insert, including failures.
- Generated text and compact derived chart facts live in **\`koolo_fortune_lab_reports\`** only. Access is scoped to \`user_id\`. Birth date, place, raw profile, private API key and payment details are **not** submitted.

## Required Cloudflare setup

1. Apply \`migrations/crew-auth/0010_fortune_lab.sql\` to the existing **\`CREW_AUTH_DB\` D1**, not a new DB. You can paste the full SQL into the D1 console: it has no compound triggers.
2. Sign in to Koolo with the one account that should be allowed. Visit \`https://koolo.app/api/auth/session\` and find only your own \`user.id\`. **Do not post it to GitHub or a public chat.**
3. Cloudflare Pages project -> Settings -> Variables and Secrets -> **Production** (runtime):
   - \`KOOLO_FORTUNE_LAB_ENABLED\` = \`1\` (**Text**; default OFF/404).
   - \`KOOLO_FORTUNE_LAB_USER_IDS\` = your exact single \`user.id\` UUID (**Text**; no wildcard, no email).
   - \`KOOLO_FORTUNE_LAB_GEMINI_KEY\` = a valid Gemini developer key (**Secret**, never \`VITE_*\` or committed to Git).
   - Optional \`KOOLO_FORTUNE_LAB_MODEL\` = \`gemini-2.5-flash\` by default (**Text**). If unavailable on the key/account, set to a supported Gemini text model and re-deploy.
   - Existing \`CREW_AUTH_DB\` binding remains unchanged.
4. Deploy Pages once the runtime variables are saved. Open \`https://koolo.app/api/fortune/report-lab\` directly; no menu entry is added.

## How to test the 10-page book

1. In the same browser + origin (\`koolo.app\`), create an ordinary BaZi chart using \`/fortune/reading?mode=bazi\`.
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
- **Off switch**: set \`KOOLO_FORTUNE_LAB_ENABLED=0\` and redeploy; data remains for owner until manually removed according to retention policy.

## Testing before merging

\`\`\`bash
node --test tests/fortune-private-report-lab.test.mjs tests/fortune-paid-reports.test.mjs tests/koolo-ecpay-stage.test.mjs
npm run check:web
npm run build:web
npm run build:cloudflare
npm run test:cloudflare
\`\`\`

Do not trigger manual GitHub Actions merely for this private acceptance feature; local tests and a controlled Pages deployment suffice.
