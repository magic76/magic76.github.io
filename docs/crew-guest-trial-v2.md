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

## Worker rollout for 3sssi.com (OFF by default)

The UI points to the existing standalone Worker **crew-guest-trial.shanliyoung.workers.dev**. The old Pages Function implementation is reused by `workers/guest-trial/worker.mjs`; do not configure Secrets on Pages for this setup. The Worker currently deployed from Hello World must be replaced by this entrypoint before the trial endpoint exists.

1. **Deploy the new Worker code** to the existing `crew-guest-trial` Worker via Wrangler or a GitHub-connected Worker deployment. Entry: `workers/guest-trial/worker.mjs`. It imports `../../functions/api/guest/token.js`; deploy from repo root with a proper Wrangler configuration. Do not paste private keys into source.
2. **Create Cloudflare D1 database** `crew-guest-trials`, run migration `migrations/guest-trial.sql` against it, then add D1 binding `GUEST_DB` to **the Worker**, not Pages.
3. **Worker Secrets:** `GEMINI_GUEST_API_KEY` (dedicated Google key), `TURNSTILE_SECRET_KEY` (the name already configured in Dashboard), `GUEST_HASH_SALT` (stable, randomly generated 32+ characters). The original name `GUEST_TURNSTILE_SECRET` is also accepted.
4. **Worker plain variables:** `GUEST_TRIAL_ENABLED=0` (always OFF until live smoke QA), `GUEST_DAILY_SESSION_LIMIT=20` (start conservatively). The site key `0x4AAAAAAFpJ8ljaQjJq_Aqy` is a public fallback; optionally set `GUEST_TURNSTILE_SITE_KEY` to the same value.
5. **Turnstile widget hostname:** production host `www.3sssi.com` must be allowed by Turnstile. The frontend origin is explicitly pinned to `https://www.3sssi.com`; arbitrary origins are rejected, and the Worker supports preflight OPTIONS.
6. **Protected Preview QA (optional):** protect Pages preview with Cloudflare Access, add its exact hostname to Turnstile, and on the Worker set `GUEST_ALLOW_PREVIEW=1` and `GUEST_PREVIEW_ORIGIN=https://<exact-preview>.magic76-github-io.pages.dev`. Never enable arbitrary preview origins. Worker rewrites only trusted browser origins to pass the shared handler's origin / hostname checks.
7. Verify `GET /api/guest/token` with `Origin: https://www.3sssi.com` returns `enabled:false` before enabling. After D1 and all secrets exist, test authorized preview and role audio only with `GUEST_TRIAL_ENABLED=1` on an access-protected environment. On an existing single Worker, toggling `1` also enables production—avoid doing so while `www.3sssi.com` is public. Use a **separate protected QA Worker** for pre-production end-to-end testing when needed.
8. Test one successful voice session, 180-second stop, repeat blocked by D1, global quota, failure behavior, mobile microphone release and existing BYOK Teacher/Friends flow. Merge/deploy separately; only enable public trials after billing/abuse monitoring is in place.

**Budget warning:** `GUEST_DAILY_SESSION_LIMIT` limits **issued sessions**, not actual USD billed, and a three-minute UI timer is not a hard financial cutoff. A dedicated Google project/key, conservative provider quotas and alerts are required. Disabling the Worker prevents new tokens but previously issued tokens can run until expiration.

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
