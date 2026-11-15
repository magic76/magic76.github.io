# Crew Web Feedback (Cloudflare D1, no fallback)

Visitors can submit problem reports, feature suggestions, and general feedback at `/feedback` without signing in. The submission includes only the message, optional contact email, category, and origin **pathname** (never query strings, full URLs, chat messages, recordings, keys, or GA identifiers).

## Setup: one binding, zero secrets or external services

1. Cloudflare Dashboard > Workers & Pages > D1 > Create database, name it `crew-feedback`.
2. Cloudflare Dashboard > Workers & Pages > **the existing Crew Pages project** > Settings > Bindings > Add > **D1 database binding**.
3. Variable name **`CREW_FEEDBACK_DB`** (exact spelling); choose the newly created `crew-feedback` database from the dropdown. This is a **binding**, not a text Value or Secret.
4. Redeploy the Pages project so the new binding is active. If using Preview separately, configure its D1 binding as appropriate.

No SQL console step is needed: the API creates the `crew_feedback` and `crew_feedback_limit` tables on the first POST. No GitHub PAT, Turnstile keys, or email fallback. The submit button is always clickable so input errors can be explained. When D1 is missing or unavailable, the API returns a real error and the form keeps the draft; it **never** silently succeeds or redirects to a different service.

## Reading submissions

Open the D1 database > Console and run:

```sql
SELECT id, kind, message, contact, page, created_at
FROM crew_feedback
ORDER BY id DESC
LIMIT 100;
```

Issue references shown to users are `FB-<D1 id>`. They do not reveal private database details. Only server-side Pages Functions can access D1; there is no public listing endpoint. D1 records contain **no raw IP address**. Separate, hourly SHA-256 network buckets are used only to throttle submissions to **3 per IP/hour**; buckets older than 48 hours are pruned automatically on new submissions.

## Abuse defenses and operational caveats

The API checks exact same-origin requests, the content type and body size, input lengths, a honeypot field, and Cloudflare's `CF-Connecting-IP` header. An **atomic D1 UPSERT** prevents straightforward concurrent submissions from bypassing the 3/hour/IP limit. This is deliberately simpler than a CAPTCHA; it is **not bot-proof**. Configure a Cloudflare WAF rate-limit rule on `POST /api/feedback` for additional protection, especially if traffic grows. Rate limiting may also affect several legitimate visitors behind the same IP (e.g. school/company NAT).

When D1 is not bound or cannot write, the form retains the user's draft and shows an error; it does **not** send via email or silently claim success. D1 Free plan usage and storage quotas apply. Running the D1 schema creation dynamically adds small per-submission query overhead for simpler initial setup.

## Checks

`node --test tests/crew-feedback.test.js`, `npm run check:web`, `npm run check:i18n`, `npm run build:cloudflare`. After deployment, test a normal submission, 4th same-IP hourly submission, missing DB binding, Android WebView, 390px mobile, and SQL console retrieval.

## Private owner inbox (same Cloudflare Access as /usage)

The owner opens **`/usage/feedback`** from the private `/usage` dashboard. It uses the existing Cloudflare Access application on `www.3sssi.com/usage*`. **Verify this wildcard includes `/usage/feedback` in your Access policy**; do not publish the inbox without edge protection. Existing Access-protected `/api/usage/report?view=feedback` handles D1 reads/updates after independently verifying the JWT's issuer, audience, expiration, signature and owner email, just like the analytics report. No extra Token, Secret, or Access application is needed if `/usage*` already works.

The owner can filter kind and review status (待處理 `new`, 處理中 `working`, 已完成 `done`), read 30 submissions per page and update status. Review status lives in an auto-created `crew_feedback_review` D1 table (no migration for existing records); missing status is `new`. GET and POST both require a signed owner JWT; POST additionally verifies Origin and JSON input. Public `/api/feedback` continues to accept anonymous submissions only.

Private data, including optional email, is served with `Cache-Control: no-store` and is not linked from the public form. Verify: when signed out, both `/usage/feedback` and `/api/usage/report?view=feedback` deny access; when signed in, filtering, paging and status updates work. If the Cloudflare Access UI uses a non-wildcard `/usage` path, extend it to `/usage*` to protect the new page.

## Optional Telegram notifications (owner only)

The submission API can send a **best-effort Telegram Bot message after a successful D1 insert**. It contains **only** the FB reference number, category label, and private inbox link. It never includes the visitor's message, optional email, source path, IP, credentials, or any URLs from the visitor. Telegram is a third-party service; keeping user-submitted content out of notifications limits external data sharing. Notification failures do not turn a stored feedback into an error, do not retry automatically, and do not claim delivery to the visitor. Failures log only the feedback reference to server-side Cloudflare logs. No new D1 tables or public endpoints are required.

1. In Telegram, open the verified **@BotFather** and send `/newbot`. Copy the generated Bot Token. **Never paste the Token into a GitHub issue, client bundle, chat, or frontend configuration.**
2. Open the newly created bot's chat and press **Start**, or send `/start`. Bots cannot message users who have not started them.
3. Find your numeric personal `chat.id` with the official Telegram `getUpdates` API after sending a message to the bot (e.g. use a private terminal): `curl -s 'https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates'`. In the response look for `result[].message.chat.id`. Keep the URL containing your Token out of browser histories and screenshots; replace `<YOUR_TOKEN>` locally, not in the repo. If a webhook is already set for the bot, `getUpdates` cannot be used until the webhook is removed.
4. In the **same** Cloudflare Pages project > **Settings > Variables and Secrets > Production**, add:
   - `CREW_FEEDBACK_TG_BOT_TOKEN` — **Secret**: BotFather token.
   - `CREW_FEEDBACK_TG_CHAT_ID` — **Secret**: your numeric personal chat ID (string of digits, potentially negative for groups).
5. Redeploy **Production** so the new secrets are available. Test a legitimate submission at `/feedback`; expect a normal FB receipt and one Telegram message with a link to `/usage/feedback`. Ensure the Access policy covers `/usage*` and that the inbox itself stays private.

If either secret is missing/invalid, or the runtime does not supply `context.waitUntil`, notifications remain disabled and feedback submission still succeeds. Notification HTTP failures are visible only in Cloudflare runtime logs. **Do not add either secret to `VITE_*`, GitHub source, localStorage, or a public /api response.**

Tests: `node --test tests/crew-feedback-telegram.test.js`.
