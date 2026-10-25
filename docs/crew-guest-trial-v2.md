# Crew Web guest voice trial V2

This replaces the **unmerged Firebase AI Logic** experiment in PR #125. It does **not** use Firebase, does **not** copy the owner's Gemini API key into browser bundles, and does **not** change existing BYOK Teacher / Friend sessions.

## Architecture

- `/try`: isolated Teacher / Zoe 3-minute Live demo using the existing `crew-live.js` capture/playback engine.
- `GET /api/guest/token`: returns enabled/disabled status and the public Turnstile site key (never a Gemini secret).
- `POST /api/guest/token`: verifies Cloudflare Turnstile server-side, checks a salted fingerprint claim in D1, atomically reserves a daily session slot, and provisions a one-use Gemini Live ephemeral token.
- Browser connects directly to Gemini Live via **v1beta BidiGenerateContentConstrained?access_token=...**. Existing BYOK remains on its unchanged v1alpha `?key=` connection.
- Token limited to the `gemini-3.8-live` model and AUDIO, 45 seconds to begin a new session, 200 seconds total expiry. UI stops at 180 seconds, measured from token issuance. Guest transport never automatically retries a spent one-use token.
- Trial claims expire in 30 days. Fingerprint is salted hash of the Cloudflare-provided IP and browser User-Agent; no raw IP, User-Agent, voice, transcript or long-term guest identifier is persisted. It is **not** proof of unique users. Changing browser/network may bypass the per-user limit.
- Daily cap is **a count of reserved sessions**, not a precise USD billing cap. An issued token could be used outside the app until expiry. Provision a dedicated key/project, set a conservative cap, monitor Gemini billing, and keep the emergency switch available.

## Required operator setup (disabled by default)

1. Create a **dedicated Gemini API key** in a project separate from personal BYOK. Confirm the project supports Live API and ephemeral token provisioning on v1beta.
2. In Cloudflare: create a separate D1 database, e.g. `crew-guest-trials`. Apply `migrations/guest-trial.sql`:
   `npx wrangler d1 execute crew-guest-trials --remote --file=migrations/guest-trial.sql`.
3. In Cloudflare Pages > Settings > Bindings, bind that D1 database to the variable name **GUEST_DB**. Redeploy after changing bindings.
4. Create a Cloudflare Turnstile widget with hostnames `www.3sssi.com` and any protected preview hostname that will be used for QA.
5. Set Cloudflare Pages **runtime variables / encrypted secrets** (not `VITE_*`; never check values into Git):
   - Secret **GEMINI_GUEST_API_KEY**: operator's separate Gemini key.
   - Secret **GUEST_TURNSTILE_SECRET**: Turnstile secret.
   - Secret **GUEST_HASH_SALT**: randomly generated, stable 32+ character value. Rotation resets anonymous trial claims.
   - Variable **GUEST_TURNSTILE_SITE_KEY**: public Turnstile widget site key.
   - Variable **GUEST_DAILY_SESSION_LIMIT**: initial value `20` (must be integer from 1 through 1000). Represents maximum reserved sessions *per UTC day*.
   - Variable **GUEST_TRIAL_ENABLED**: set `0` until QA; use `1` only when prepared.
6. For a **protected** Cloudflare Pages preview only, additionally set `GUEST_ALLOW_PREVIEW=1` in the Preview environment. Protect the preview with Cloudflare Access before enabling the trial; never rely on an obscure preview URL for access control.
7. Open `/try` on an authorized preview, grant mic permission, pass Turnstile, verify a real spoken Teacher and Zoe reply, auto-stop near 180s, and verify an immediate repeat gets `ALREADY_USED`. Use different test fingerprints to test both roles; a successful issue consumes the one-use claim.
8. Test `/settings` and an existing BYOK session; ensure no change in v1alpha fallback, voice, memory or game behavior. Verify mobile microphone release after exiting /try.
9. After reviewing usage and quota logs, enable `GUEST_TRIAL_ENABLED=1` in production. Disable immediately to stop **new** sessions. Already-issued short-lived tokens may continue until their expiry.

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
