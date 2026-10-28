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
| GEMINI_GUEST_API_KEYS | Secret | preferred: comma-separated list of up to 20 keys |
| GEMINI_GUEST_API_KEY | Secret | legacy: still supported if the JSON Secret does not exist |
| TURNSTILE_SECRET_KEY | Secret | required |
| GUEST_TURNSTILE_SITE_KEY | Public variable | required |
| GUEST_TRIAL_RATE_LIMITER | Rate-limiting binding | required; 1/60s per edge |
| GUEST_TRIAL_ENABLED | Text variable | 1=open, 0=off |

The old GUEST_QA_ENABLED, GUEST_QA_ALLOW_PRODUCTION, GUEST_QA_UNTIL, GUEST_QA_ACCESS_TOKEN and GUEST_QA_RATE_LIMITER are unused after deployment. Remove old QA secrets and variables if desired; never delete the Gemini or Turnstile secrets.

Cloudflare Workers Builds should set **Root directory** to `workers/guest-trial`, leave **Build command** empty, and set **Deploy command** to `npx wrangler deploy` (or explicitly `npx wrangler deploy --config wrangler.toml`). A committed `workers/guest-trial/wrangler.toml` is provided; no manual copying is required. Confirm the two required Secrets and rate-limiter binding, and verify the API after build. If the Cloudflare Workers Build check stays red, inspect that Build's logs; GitHub CI success alone does not deploy Worker.

## Multiple Gemini keys (Phase 1)

Store multiple keys in **one Cloudflare Worker Secret**, `GEMINI_GUEST_API_KEYS`. The simplest format is a comma-separated list (plain text, without brackets or quotes):

```text
first-gemini-key,second-gemini-key,third-gemini-key
```

Other supported formats include a JSON array, a JSON object containing only a `keys` array, or one key per line. Cloudflare JSON-typed bindings can supply the array/object directly; a Secret with CSV text remains the simplest choice.

```json
["first-gemini-key","second-gemini-key","third-gemini-key"]
```

```json
{"keys":["first-gemini-key","second-gemini-key"]}
```

- A request chooses one valid key using a cryptographic random index. **It makes only one Gemini token mint attempt per guest trial.** We do not automatically retry another key after quota/permission errors.
- Up to 20 keys are accepted; whitespace around commas is fine. Both single- and multi-key modes require a trimmed key of at least 12 characters and do not reject punctuation such as `.` (Google validates actual credentials when minting). Empty entries, extra commas, short or non-string entries, malformed JSON, and invalid lists fail closed even when the old single-key secret remains provisioned.
- Existing `GEMINI_GUEST_API_KEY` continues to work until you choose to migrate, and may be deleted **after** the new multi-key Secret is deployed and API smoke-tested.
- Key values are never put into `wrangler.toml`, web code, logs or returned API payloads. The Worker Secret value must be created in Cloudflare.
- Keys in the **same Google Cloud project share project quotas**. Multiple keys do not automatically multiply free allowance; use for legitimate key management/availability and follow Google's API usage rules.

## Phase 2 — anonymous trial analytics (2026-10-28)

The existing production-only first-party analytics system has a Guest Trial section in the private /usage dashboard with 7-day and 30-day views:

- Funnel: eligible trial entry viewed, clicked start, issued ephemeral Gemini token, actually connected, ended.
- Split funnel counts between Teacher/Friend; failure events for denied mic, setup, token mint and connection.
- Connected-call duration buckets: under 15s, 15–45s, 45–60s.
- Existing production web tracking is privacy-aware (GPC/DNT, opt-out, developer mode); no audio, transcript, Gemini key, token, IP, or arbitrary client detail is collected. Uses the same Analytics Engine and GA4 integrations, no new Worker Secrets, D1 binding or authentication.
- Events are best-effort and may be sampled or blocked, so these are **not authoritative server issuance counts or unique humans**. No retroactive filling of old usage.
- Private reporting still requires Cloudflare Access and read-only Analytics credentials per `docs/CREW_USAGE.md`.

## Phase 3 — planned

Add actual user sign-in and a server-side entitlement/quota ledger for one-trial-per-user counting. Design account controls, privacy/retention and anti-abuse checks before implementing. No authentication or per-account limit is part of Phase 2.

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

## Troubleshooting a disabled guest trial

A GET request to `https://crew-guest-trial.shanliyoung.workers.dev/api/guest/token` deliberately returns only `{"enabled":false}` when public trial configuration is unavailable. To find the cause, open **Cloudflare → Workers & Pages → crew-guest-trial → Observability → Logs** (enable logs if necessary), then reload the Teacher/Friend page on `https://www.3sssi.com`. Filter for `crew_guest_trial_configuration`.

The log contains only `state: "unavailable"` and a fixed `reason` code; it never prints the Gemini keys, Turnstile secret, public site key, request URL, visitor identity or tokens. Supported codes: `trial_disabled`, `gemini_key_missing`, `gemini_keys_invalid`, `turnstile_site_key_missing`, `turnstile_secret_missing`, `rate_limiter_binding_missing`, `d1_hash_salt_missing`, `d1_daily_limit_invalid`. A missing Phase 1 rate limiter must be fixed as a **Rate Limiting Binding**, not a Text variable. No diagnostic metadata is added to the public API response. Logs are emitted only for failed configuration checks of the public GET endpoint.

When `reason` is `gemini_keys_invalid`, the private log now also contains a non-sensitive `detail` code: `empty`, `too_large`, `malformed_json`, `unsupported_shape`, `unsupported_type`, `invalid_count`, or `invalid_key_entry`. This identifies the parsing issue without logging keys or their lengths. An invalid multi-key binding never silently falls back to the single-key secret.
