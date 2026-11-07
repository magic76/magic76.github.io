# Crew Web Google / GitHub sign-in (Phase 3 foundation)

> Cloudflare Secrets 與 Binding 完整對照：[CLOUDFLARE_KEYS.md](CLOUDFLARE_KEYS.md)。此文件僅記錄變數用途，不存任何 Secret 值。


## Scope
- Public site: https://www.3sssi.com/account. Sign in or sign out, using only Google or GitHub.
- Auth APIs run only on the production hostname via Cloudflare Pages Functions. Disabled gracefully when configuration is missing; no user secret is ever bundled into frontend code.
- Authorization code + PKCE (S256), random state stored in a Secure HttpOnly SameSite=Lax host-only cookie for up to 10 minutes.
- A second Secure HttpOnly host-only session cookie contains a 256-bit opaque token. D1 stores only its SHA-256 hash and expiry (30 days). Logout removes its DB session and clears cookie.
- Google scopes: openid email profile; GitHub asks for public identity only, no repository permissions.
- Access tokens are used only in the callback to fetch the provider identity, then discarded (not stored).
- Provider account uniqueness is provider + provider UID. Never auto-link two providers by email alone.
- Existing browser-local Gemini keys, histories and memory are unaffected, and are **not** automatically uploaded or synchronized.
- This first step does **not** yet meter trials by user; trial entitlement and authoritative per-user limits require a separate integration with the guest Worker.

## Cloudflare Pages configuration
1. Create a D1 database, e.g. `crew-auth`.
2. **Required before the first successful sign-in:** apply [migrations/crew-auth/0001.sql](../../migrations/crew-auth/0001.sql) in Cloudflare D1 → crew-auth → Console, or with Wrangler execute. Merely creating the database does not create the required three tables. The migration uses `CREATE TABLE IF NOT EXISTS` and can be safely rerun.
3. Cloudflare Pages project `magic76-github-io` → Settings → Bindings → Add D1 → variable **CREW_AUTH_DB** → select `crew-auth` (Production). Redeploy Pages after attaching.
4. Configure OAuth applications:
   - Google Cloud Console → Auth Platform → OAuth Client (Web application). Authorized redirect URI **https://www.3sssi.com/api/auth/google/callback**. Set consent screen up for your audience (testing status may restrict login to test users).
   - GitHub → Settings → Developer settings → OAuth Apps → New OAuth App. Homepage **https://www.3sssi.com**, Authorization callback URL **https://www.3sssi.com/api/auth/github/callback**.
5. Pages Production environment variables / secrets:
   - Google: `CREW_AUTH_GOOGLE_CLIENT_ID` (Text) + `CREW_AUTH_GOOGLE_CLIENT_SECRET` (Secret).
   - GitHub: `CREW_AUTH_GITHUB_CLIENT_ID` (Text) + `CREW_AUTH_GITHUB_CLIENT_SECRET` (Secret).
   - **Compatible with the initial setup guide:** `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` and `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET` are also accepted. If both name pairs exist for a provider, the `CREW_AUTH_*` pair wins. No credential needs to be moved or re-entered.
   - `AUTH_SESSION_SECRET` from the initial guide is not required by this implementation: a 256-bit random opaque session token is generated per login and only its SHA-256 hash is stored in D1.
   Configure both providers for two sign-in choices. Do not prefix secrets with `VITE_`, do not commit them, and keep OAuth callback endpoints under `www.3sssi.com` only.
6. Redeploy Cloudflare Pages. No `crew-guest-trial` Worker deployment is needed for this login-only phase.

## Smoke tests
- GET /api/auth/session (when configured) returns {enabled:true,providers:{google:true,github:true},user:null}.
- Visit /account → sign in with each provider. After return, GET /api/auth/session returns the provider and user display name, never OAuth tokens.
- POST /api/auth/logout with same-origin browser Origin clears the session. Session GET then returns user:null.
- Browser devtools: both OAuth flow and session cookies must have Secure, HttpOnly, SameSite=Lax and __Host- prefix. OAuth state cookie is cleared on callback.
- Verify an invalid/missing state, a bad code, a preview hostname, a forged logout Origin, and an unavailable D1 fail closed. No browser-local content should change on login/logout.
- Distinct provider identities remain separate even when Google and GitHub return an identical email.

## Operational notes
- Removing sessions: `DELETE FROM crew_auth_sessions WHERE expires_at < unixepoch();` can be run periodically.
- Signing in with a new provider creates a new account identity unless the user explicitly links it in a future secure account-linking flow.
- This is not Cloudflare Access for administrators; the private /usage dashboard retains its separate Access policy.
- The login-only `CREW_AUTH_DB` binding belongs to **Pages**. Member quota mode additionally requires the **same D1 database** bound on `crew-guest-trial` Worker.

## Cloudflare Workers OAuth redirect compatibility (2026-10-28)

Cloudflare Workers/Pages Functions support only `fetch` redirect modes `follow` and `manual`, not `error`. The former `redirect:"error"` in both token exchange and profile requests threw a runtime `TypeError` before contacting Google/GitHub and surfaced as `auth_stage=token&auth_reason=token_transport` even with valid credentials. Both now use `redirect:"manual"`; token exchanges explicitly reject any 3xx response, so credentials are never auto-forwarded to another origin. This fix requires a Pages production deployment, but **no OAuth credential changes**. Source: https://developers.cloudflare.com/workers/runtime-apis/request/

## Phase 3 — optional signed-in 5-minute guest-trial quota (staged, not enabled)

The phase-3 code allows **3 five-minute** ephemeral tokens **per account per Taipei calendar day (UTC+08:00, resetting at 00:00 Taipei time)**, guarded by a one-use, 90-second HMAC assertion from Pages. It must not be confused with the anonymous trial quota or a provider-wide budget. Google and GitHub identities remain distinct accounts until a verified account-linking feature exists.

### Cloudflare preparation (no change to public guest access until explicitly enabled)

1. Confirm OAuth Google/GitHub login works with `GET /api/auth/session`. Execute `migrations/crew-auth/0002_guest_trials.sql` once against the **existing** `crew-auth` D1 database. The migration is idempotent and does not delete sessions.
2. Generate a cryptographically random secret of 32+ characters (e.g. `openssl rand -hex 32`). Set **the identical** `CREW_GUEST_TICKET_SECRET` encrypted secret in **Pages Production** and **crew-guest-trial Worker**. Never commit the actual secret or put it in a `VITE_` variable.
3. Bind the existing **crew-auth** database to the Worker under the **exact same binding name `CREW_AUTH_DB`**. Pages already has its own binding. The optional anonymous trial `GUEST_DB` is a *different* database/binding and must not be substituted. PR #439 configures this Worker binding in `workers/guest-trial/wrangler.toml` with the existing `crew-auth` database ID; check Cloudflare Workers Builds uses that config on deployment. Do not place secrets in this TOML.
4. Deploy **Pages first** so `POST /api/auth/guest-ticket` exists, then deploy the separately built `crew-guest-trial` Worker. Both components retain `seconds:300`, a 310-second ephemeral token expiry and 30-second new-connection window. No account enforcement is activated by deploying code alone.
5. To **meter signed-in members but preserve anonymous trials**, set Worker text variable `GUEST_ACCOUNT_METER_ENABLED=1`, leave `GUEST_REQUIRE_SIGNIN=0` (or absent), and redeploy Worker. GET Worker config reports `memberMetering:true` without `signinRequired:true`. A signed-in browser receives a Pages HMAC proof; Worker reserves one D1 member grant and validates one-use nonce. An unsigned browser continues the existing anonymous Turnstile + limiter/D1 flow.
6. Verify logged-in users see `trial.used:0, trial.limit:3` before starting, then `trial.used:1` afterwards via `GET /api/auth/session`; `/account` shows today's usage out of 3. The third successful token issuance is allowed; the fourth on the **same Taipei day** returns 429 `ALREADY_USED`; after midnight Taipei the same account can use three more grants. Replaying any individual signed ticket always returns 429. Confirm unsigned visitors can still start under anonymous rules and cannot spoof a member ticket. Validate that a failed Gemini mint refunds only that day's account quota. Existing usage rows are preserved and interpreted by their last updated timestamp; **no D1 reset or new migration** is needed. Each successfully issued token counts, even if the Live session ends early.
7. Later, and **only as a separate deliberate rollout**, set `GUEST_REQUIRE_SIGNIN=1` to require a member ticket for everyone. It also implicitly enables member metering, even if `GUEST_ACCOUNT_METER_ENABLED` is absent.
8. Rollback: set both `GUEST_ACCOUNT_METER_ENABLED=0` and `GUEST_REQUIRE_SIGNIN=0` and redeploy Worker. The anonymous flow resumes; do not remove D1 tables or signing secrets. Per-account trials already recorded are preserved.

**Rollout:** Both Pages (`server/crew-auth.mjs`) and standalone `crew-guest-trial` Worker (`functions/api/guest/token.js`) must be deployed for the daily limit to match the display. The anonymous one-use fingerprint window and shared Worker limiter are unchanged. If an account remains open across midnight, the client refreshes its allowance automatically.

**Limitations:** Anonymous visitors are intentionally not tied to member accounts, and signed-out users can use the existing anonymous allowance while mandatory sign-in is off. This is staged analytics and **not** full quota enforcement across all browsers/identities. Neither Cloudflare Pages nor the Worker should be described as deployed merely because GitHub Actions CI passed.
