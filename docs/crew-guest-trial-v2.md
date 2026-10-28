# Crew Web guest voice trial V2

This replaces the **unmerged Firebase AI Logic** experiment in PR #125. It does **not** use Firebase, does **not** copy the owner's Gemini API key into browser bundles, and does **not** change existing BYOK Teacher / Friend sessions.

## Architecture

- `/try`: isolated Teacher / Zoe 3-minute Live demo using the existing `crew-live.js` capture/playback engine.
- `GET https://crew-guest-trial.shanliyoung.workers.dev/api/guest/token`: returns enabled/disabled status and the public Turnstile site key (never a Gemini secret).
- `POST https://crew-guest-trial.shanliyoung.workers.dev/api/guest/token`: verifies Cloudflare Turnstile server-side, checks a salted fingerprint claim in D1, atomically reserves a daily session slot, and provisions a one-use Gemini Live ephemeral token.
- Browser connects directly to Gemini Live via **v1beta BidiGenerateContentConstrained?access_token=...**. Existing BYOK remains on its unchanged v1alpha `?key=` connection.
- Token limited to the `gemini-3.8-live` model and AUDIO, 45 seconds to begin a new session, 200 seconds total expiry. UI stops at 180 seconds, measured from token issuance. Guest transport never automatically retries a spent one-use token.
- Trial claims expire in 30 days. Fingerprint is salted hash of the Cloudflare-provided IP and browser User-Agent; no raw IP, User-Agent, voice, transcript or long-term guest identifier is persisted. It is **not** proof of unique users. Changing browser/network may bypass the per-user limit.
- Daily cap is **a count of reserved sessions**, not a precise USD billing cap. An issued token could be used outside the app until expiry. Provision a dedicated key/project, set a conservative cap, monitor Gemini billing, and keep the emergency switch available.

## Phase 1 — private voice QA WITHOUT D1

This phase tests Gemini Live on an isolated protected preview. It is NOT a public trial
and deliberately does NOT create persistent quotas or promise a daily USD cost ceiling.
The public `/try` route and homepage CTAs remain disabled whenever the production
backend says `enabled:false`.

### Worker deployment

1. Create or choose an **Access-protected Cloudflare Pages preview** for PR #432.
   Cloudflare Access must reject an anonymous incognito browser before you use the
   QA feature. Identify its exact `https://<alias>.magic76-github-io.pages.dev`
   origin and add that **preview hostname** to the Turnstile widget's allowed
   hostnames. Avoid public preview URLs for paid API tests.
2. Copy `workers/guest-trial/wrangler.example.toml` to
   `workers/guest-trial/wrangler.toml`. This template deliberately has **NO D1
   binding**. From repo root deploy via
   `npx wrangler deploy --config workers/guest-trial/wrangler.toml`.
   This replaces the Hello World content in your existing
   `crew-guest-trial.shanliyoung.workers.dev` Worker. Review Wrangler's
   configured account and binding diff BEFORE deployment.
3. In the Worker's Variables and Secrets, keep:
   - `GEMINI_GUEST_API_KEY` (Secret): use an isolated Gemini key.
   - `TURNSTILE_SECRET_KEY` (Secret): the existing Turnstile secret.
   - `GUEST_QA_ACCESS_TOKEN` (NEW Secret): **random 32+ character** private QA
     authorization token. Generate offline, e.g. `openssl rand -hex 32`.
     Do not commit, paste into chats, put in browser localStorage, or publish.
   - `GUEST_TRIAL_ENABLED=0` (plain Variable): always OFF in Phase 1.
   - `GUEST_QA_ENABLED=0` initially; set to `1` only during the supervised
     test window.
   - `GUEST_ALLOW_PREVIEW=1`, `GUEST_PREVIEW_ORIGIN=<exact protected preview
     origin>` (plain Variables). QA is rejected for `www.3sssi.com` even
     when the preview is allowed.
   - `GUEST_QA_UNTIL`: a **UTC ISO8601 timestamp** less than 24 hours in the
     future. The Worker fails closed once this expires. Set it for each
     supervised testing session and turn `GUEST_QA_ENABLED` back to `0`
     afterward.
   - `GUEST_TURNSTILE_SITE_KEY=0x4AAAAAAFpJ8ljaQjJq_Aqy` (public variable).
   - `GUEST_QA_RATE_LIMITER` (Worker rate-limiting binding defined in the
     Wrangler template, configured at 2 requests/60 seconds). The Worker
     refuses minting if the binding is missing or errors.
4. Confirm `GET /api/guest/token` from the public production origin returns
   `{"enabled":false}`. Confirm `GET /api/guest/qa` from production returns
   HTTP 403. A protected preview with the QA header may access the QA endpoint.
5. Open `https://<protected-preview>/try?qa=1`; enter
   `GUEST_QA_ACCESS_TOKEN` in the temporary password field, verify Turnstile,
   grant microphone permission and test Teacher / Zoe Live. The secret only
   lives in React component memory. Only one-time Gemini ephemeral tokens are
   sent to the browser. No long-term voice/transcript data is stored.
6. Verify 3-minute automatic disconnect, microphone cleanup, wrong-token
   rejection, disallowed Origin rejection, expiry, rate limiting, and normal
   BYOK. Immediately set `GUEST_QA_ENABLED=0` after testing.

**Important caveat:** Cloudflare Worker rate limiting is **approximate and
per-edge-location**; it cannot substitute for durable quota accounting or a
hard cost limit. A stolen QA access token can still be abused while QA is
enabled. Minimize the QA window, use a dedicated Gemini project with tight
provider quotas / budget alerts, keep the public trial disabled, and monitor
Gemini usage. Refer to the official Worker rate-limiting documentation.

### QA endpoints

- `GET /api/guest/qa`: private preview origin + `x-crew-qa-token` header
  required; returns `enabled`, public Turnstile site key and duration.
- `POST /api/guest/qa`: same authorization, valid Turnstile (expected
  preview hostname), rate limiting, then mint a single-use 200s token.
- `GET /api/guest/token` stays disabled because `GUEST_TRIAL_ENABLED=0`.
  BYOK flows are unchanged.

## Phase 2 — D1 and public rollout (NOT enabled)

1. Create a standalone D1 database named `crew-guest-trials`, apply
   `migrations/guest-trial.sql` and bind it to the **Worker** as `GUEST_DB`.
2. Add secret `GUEST_HASH_SALT` (stable 32+ random characters) and variable
   `GUEST_DAILY_SESSION_LIMIT` (start with `20`). Update the Wrangler
   config with the commented-out `[[d1_databases]]` section after the
   actual D1 ID is known.
3. Audit and test the original `functions/api/guest/token.js` per-visitor claim,
   daily quota, CAPTCHA, emergency disable and failed-token refunds.
4. Verify voice quality, UI, usage billing and browser/device behavior.
   Only then separately consider `GUEST_TRIAL_ENABLED=1` for production and
   hiding the QA route.

**Cost warning:** Neither Phase 1 rate limits nor Phase 2 session counts
guarantee a hard US$3 billing ceiling. Ephemeral tokens may continue briefly
after the feature is disabled.

## Failure handling and cost controls

- **Fail closed** if any credential, Turnstile provider, D1 binding, origin verification or quota counter is unavailable.
- `GUEST_TRIAL_ENABLED=0` is the emergency switch. GET returns `enabled:false`; existing BYOK operates normally.
- Claim uses a D1 unique fingerprint. Quota uses an atomic conditional UPDATE. If provisioning fails, the claim and daily reservation are refunded best-effort; database cleanup errors fail conservatively.
- Rate limiting is intentionally strict: one claim per fingerprint per 30 days, plus a daily global cap. Shared networks may be limited. Turnstile verification includes the expected hostname.
- The token has 200s maximum validity; this controls exposure, but the app's 180-second timer is still a client-side UX control. There is no absolute, externally enforced **dollar** cost ceiling; billing may include more than audio.
- Any Cloudflare preview credentials / Turnstile test keys should be independent of production. **Do not** paste secrets into PR comments, screenshots, `VITE_` vars or web localStorage.

## Verification

```sh
node --test tests/guest-trial.test.js
node --test tests/crew-live.lifecycle.test.js
npm run check:web
npm run build:web
npm test
```

A connected, real-Gemini trial cannot be verified without the owner's separate API key, D1 binding and Turnstile widget. Leave production disabled until smoke tests complete.
