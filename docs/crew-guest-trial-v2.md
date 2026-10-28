# Crew Web guest Live trial — one-minute Phase 1

## Public trial

- Visitors without a BYOK Gemini API Key may use the original Teacher/Friend voice UI after completing Turnstile. No separate /try page, no private QA password. /try redirects to teacher selection.
- Worker API: GET/POST /api/guest/token. Legacy /api/guest/qa is removed (404).
- The short-lived Gemini Live token allows one use, a 30-second new-session window, and expires after 70 seconds. UI stops at 60 seconds after issuance. No reconnect, no guest chat memory/history or teacher reports.
- Existing BYOK sessions stay unchanged. Client only receives a short-lived token, not the owner's key.
- No D1 in Phase 1. Requests are protected by Turnstile hostname/action verification and a required Cloudflare Worker per-edge limit (one request/minute/edge); not a global cap, per-person cap, or hard dollar budget.
- A free Gemini API key may still be limited by model availability/quota; monitor usage and disable public trial with GUEST_TRIAL_ENABLED=0 when needed.

## Worker settings

| Name | Type | Use |
| --- | --- | --- |
| GEMINI_GUEST_API_KEY | Secret | required |
| TURNSTILE_SECRET_KEY | Secret | required |
| GUEST_TURNSTILE_SITE_KEY | Public variable | required |
| GUEST_TRIAL_RATE_LIMITER | Rate-limiting binding | required; 1/60s per edge |
| GUEST_TRIAL_ENABLED | Text variable | 1=open, 0=off |

The old GUEST_QA_ENABLED, GUEST_QA_ALLOW_PRODUCTION, GUEST_QA_UNTIL, GUEST_QA_ACCESS_TOKEN and GUEST_QA_RATE_LIMITER are unused after deployment. Remove old QA secrets and variables if desired; never delete the Gemini or Turnstile secrets.

Cloudflare Workers Builds should set **Root directory** to `workers/guest-trial`, leave **Build command** empty, and set **Deploy command** to `npx wrangler deploy` (or explicitly `npx wrangler deploy --config wrangler.toml`). A committed `workers/guest-trial/wrangler.toml` is provided; no manual copying is required. Confirm the two required Secrets and rate-limiter binding, and verify the API after build. If the Cloudflare Workers Build check stays red, inspect that Build's logs; GitHub CI success alone does not deploy Worker.

## Phase 2 deferred

- D1 guest quota database, per-fingerprint/day limits, production billing observation. D1 is not required for Phase 1.
- Global abuse/cost ceilings are not guaranteed by the current limiter.
- Phase 2 will validate duplicate claims and billing controls after reviewing usage.

## Verification

```sh
node --test tests/guest-trial.test.js
npm run check:web
npm run check:i18n
npm run build:web
npm run check:bundle
```
