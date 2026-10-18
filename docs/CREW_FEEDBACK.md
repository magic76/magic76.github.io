# Crew Feedback v1 (Cloudflare free-tier compatible)

## Scope

Anonymous, login-free bug reports, suggestions and experience ratings on Crew Web.
Entry points:
- Settings: feedback/suggestion modal
- Teacher Live and Friend Live: feedback button
- Crew Play games: thumbs up / thumbs down (negative rating may include a reason)
- Owner inbox: /admin/feedback (private, with status workflow)

No Gemini key or paid AI API is used. Android can adopt the structured POST contract in a later PR.

## Architecture

- Client: web-spa/src/feedback/FeedbackWidget.tsx
- POST /api/feedback: functions/api/feedback/index.ts
- GET /api/feedback/admin?status=new&offset=0: pages of 50 (owner only)
- PATCH /api/feedback/admin: set status = new / reviewed / closed (owner only)
- SQLite schema: db/migrations/0001_feedback.sql, Cloudflare D1 binding FEEDBACK_DB
- Cloudflare Pages Functions: dist/_routes.json includes both /api/feedback and /api/feedback/*
- No additional backend, Firebase, or paid service.

D1 stores feedback messages. The existing Analytics Engine tracks feature usage only and
must NOT receive the user-entered text or be overloaded as a feedback database.

## Provision once (Production)

1. Cloudflare Dashboard > Workers & Pages > D1 SQL Database > Create database.
   Name it **crew-feedback**. D1 Free can be used.
2. Open the database's Console and run the statements in
   db/migrations/0001_feedback.sql. Or use a configured Wrangler CLI:

   `npx wrangler d1 execute crew-feedback --remote --file=db/migrations/0001_feedback.sql`

3. Workers & Pages > Pages project > Settings > Bindings > Production >
   Add D1 Database binding: **FEEDBACK_DB** → **crew-feedback**.
4. Generate a long random secret, for example `openssl rand -hex 32`.
   Add it as a **Production encrypted Secret** named **CREW_FEEDBACK_RATE_SECRET**
   (at least 24 characters). Never use a VITE_ variable or publish the value.
5. Cloudflare Zero Trust > Access > Applications:
   protect **www.3sssi.com/admin/feedback*** and
   **www.3sssi.com/api/feedback/admin*** (both GET and PATCH), restricting to
   your administrator email. Do NOT protect /api/feedback (public anonymous POST).
6. Authentication in the admin Function verifies the Access JWT signature
   independently, using:
   - CREW_USAGE_ACCESS_ISS: existing Cloudflare team issuer URL
   - CREW_USAGE_ADMIN_EMAIL: existing administrator email
   - CREW_FEEDBACK_ACCESS_AUD: Audience AUD tag of the Access app protecting
     the feedback API; if the same existing Access app and AUD covers it, this
     variable can be omitted and CREW_USAGE_ACCESS_AUD is used.
   Configure the relevant values in Pages Production settings.
   A separate Access app with a different AUD MUST configure
   CREW_FEEDBACK_ACCESS_AUD; do not reuse the old AUD by mistake.
7. Redeploy the Production Pages build. A 503 "not configured" is intentional
   until D1 and the rate-limit secret exist.

The free Pages/Workers request allowance is shared with other Functions.
The system has no guaranteed monetary cost if a plan/billing setup is changed
or free allowances are exceeded: consult your account's Cloudflare usage.

## POST contract

```json
{
  "kind": "bug",
  "product": "friend",
  "platform": "web",
  "reason": "repeated_question",
  "message": "It asked for the same clue three times.",
  "includeDiagnostics": true,
  "page": "/friend/live",
  "roleId": "zoe",
  "model": "gemini-3.8-live",
  "locale": "en"
}
```

- kind: bug | idea | other | rating
- rating: 1 or 5, required for rating only. Rating text is optional.
- product: teacher | friend | play | story | shorts | site
- platform: web | android
- reason: empty, wrong_language, repeated_question, interrupted,
  bad_response, connection, game_logic, other
- message: up to 1600 characters; required for non-rating feedback
- includeDiagnostics: boolean, default false in API; UI asks opt-in
- page (path without query string), roleId, model, errorCode, locale,
  buildVersion: optional structured diagnostics, stored only if approved
- Unknown fields (e.g. transcript, geminiKey, chatHistory, recording) are rejected.
- 201: {ok:true,id}; 400/403/413/415 invalid request; 429 rate limited;
  503 binding missing / data store unavailable.
- Access API does not accept public writes; PATCH requires same-site Origin.

No user registration or session key. Requests from another browser Origin are
rejected; Android's future native HTTP calls can omit Origin, while still subject
to the server's rate limit. This is *not* authenticated attribution, so submitted
platform/role/model values are untrusted self-reported diagnostics.

## Safety and privacy

- The anonymous POST requires explicit user action; unlike telemetry it is not
  silently triggered. The analytics opt-out controls automatic analytics only.
- No IP, full user-agent, transcript, audio, Gemini key, email or URL query is
  saved. The server uses Cloudflare's IP header with an HMAC secret to derive
  an hourly pseudonymous rate bucket (limit: five submissions per hour), and
  deletes obsolete buckets opportunistically. The rotating HMAC cannot be
  used as a user identity across hours.
- Stored free text may itself contain personal details if a user types them.
  UI warns users not to include sensitive information. Admin inbox is
  private and renders text as React text, never unsafe HTML.
- Submit endpoint accepts requests without login. Rate limits are abuse
  mitigation, not cryptographic bot authentication. Add Turnstile or Cloudflare
  WAF rules if spam increases; do not invent fake successful writes.
- Review and delete old feedback in the D1 Console when no longer needed.
  Example one-time retention operation (choose an appropriate period):
  `DELETE FROM feedback WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-180 days');`
  There is no automatic feedback deletion schedule in v1.
- If a user requests deletion of an anonymous submission, identify it by the
  generated submission UUID where available; there is no account linkage.
  Protect owner Access secrets and do not display inbox publicly.

## Smoke checks

1. `npm ci && npm run check:web && npm test && npm run build:cloudflare && npm run test:cloudflare`.
2. After deploy, Settings > feedback > bug > submit: POST /api/feedback 201.
3. D1 Console: `SELECT kind,product,status,created_at FROM feedback ORDER BY created_at DESC LIMIT 5;`
4. Crew Play: positive rating sends immediately; negative opens optional
   reasons/modal. Teacher/Friend Live: report button reachable while chatting.
5. Open /api/feedback/admin without Cloudflare Access: HTTP 403.
   A fake Cf-Access-Jwt-Assertion must also fail.
6. Owner authenticates through Access and opens /admin/feedback;
   change new → reviewed → closed and refresh to verify persistence.
7. Reject unknown keys, empty bug report, and cross-site Origin.
   Submit >5 times from the same network within one UTC hour -> 429.
8. Missing D1 or rate secret -> 503 and an actionable error in the UI,
   never a false success.
9. Preview/localhost needs its own D1 binding & secret to exercise backend.
