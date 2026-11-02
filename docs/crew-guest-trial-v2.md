# Crew Web guest Live trial — five-minute Phase 1

> Cloudflare Secrets 與 Binding 完整對照：[CLOUDFLARE_KEYS.md](CLOUDFLARE_KEYS.md)。此文件僅記錄變數用途，不存任何 Secret 值。


## Public trial

- Visitors without a BYOK Gemini API Key may use the original Teacher/Friend voice UI after completing Turnstile. No separate /try page, no private QA password. /try redirects to teacher selection.
- Worker API: GET/POST /api/guest/token. Legacy /api/guest/qa is removed (404).
- The short-lived Gemini Live token allows one use, a 30-second new-session window, and expires after 310 seconds. UI stops at 300 seconds after issuance. No reconnect, no guest chat memory/history or teacher reports.
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

## Phase 3 — member-counted trial

Signed-in Google or GitHub accounts can use up to **3** successfully issued five-minute trials. The Worker counts successful Gemini token issuance in D1, not minutes actually spoken; ending early still uses one grant. Existing usage is retained (no migration or reset). Metering is opt-in with `GUEST_ACCOUNT_METER_ENABLED=1` while `GUEST_REQUIRE_SIGNIN=0` preserves anonymous trials. Both Google and GitHub identities are separate until securely linked.

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

### Phase 2 reporting navigation

The private `/usage` dashboard now has a shortcut to the trial summary. It distinguishes eligible entry from unavailable entry and shows event-count ratios for start, token issuance and Live connection. These are not authenticated-user conversion rates. Deploy Cloudflare Pages for this change; no changes to the isolated `crew-guest-trial` Worker or its Secrets are required.

## Five-minute duration (November 2, 2026)

- Guest Worker returns `seconds:300` and mints a one-use ephemeral token with `expireTime` 310 seconds after issuance; `newSessionExpireTime` stays at 30 seconds to limit token redemption.
- Teacher/Friend Live UI enforces a hard 300-second deadline and still requests a brief farewell during the last ten seconds.
- This change affects **both** Cloudflare Pages and the separately deployed `crew-guest-trial` Worker. Deploy Pages first, then the Worker: the updated frontend checks GET config for `seconds:300` **before** starting Turnstile/token issuance. While an old Worker still reports `180`, the guest entry stays unavailable (BYOK remains functional), so no one-use quota claim is consumed by a mismatched 60-second grant. The old frontend rejects 300-second grants, so avoid deploying Worker first.
- The rate limiter's 60-second period controls token issuance frequency, **not** call length; do not increase it solely to change trial duration. Existing global/day/account trial quota semantics remain unchanged.
- After deployment, smoke check GET `https://crew-guest-trial.shanliyoung.workers.dev/api/guest/token` from the site origin and confirm `seconds:300`, then start a genuine trial and verify a 3-minute stop; never place long-lived credentials in browser code.

## Phase 3 signed-in account metering (opt-in, 3 minutes)

After the member D1 migration and matched `CREW_GUEST_TICKET_SECRET` Secrets, Worker `GUEST_ACCOUNT_METER_ENABLED=1` enables up to three account-counted tokens for signed-in visitors **without requiring anonymous visitors to log in**. `GUEST_REQUIRE_SIGNIN=1` is a separate, stronger mode and is intentionally not enabled in Git. See `docs/crew-auth.md` for deploy ordering, D1 bindings, smoke checks and rollback. The trial length remains 300 seconds in either mode.

## Faster shared trial discovery (October 31, 2026)

The three public components that read guest trial configuration (HomePage, OnboardingGate, GuestLiveStarter) now share a single in-flight read of the public Worker configuration. An enabled config is cached **only in JS memory** for 30 seconds, and an unavailable/disabled response for 5 seconds. No short-lived Gemini Token, Turnstile challenge, OAuth/session response, secret, or user identity is cached. A subsequent request rechecks the Worker state; any error still fails closed and does not enable guest trial.

When Turnstile confirms the human challenge, the Live JS runtime is prefetched in the background. Starting the real session still requires a dedicated user click, microphone permission, a server-issued short-lived token and Worker verification. A failed script preload can be retried: the script-loader promise cache removes rejected promises. There is no new account gate, no database change, no change to the configured trial duration, and no bypass of Turnstile or per-account quotas. Test: `tests/crew-guest-config-cache.test.js`.
