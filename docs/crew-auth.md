# Crew Web Google / GitHub sign-in (Phase 3 foundation)

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
- The `CREW_AUTH_DB` binding belongs to the **Pages** project, not `crew-guest-trial` Worker.

## Phase 3 signed-in trial quota (staged; disabled by default)

This integration enforces **one successfully issued one-minute Gemini Live trial token per Crew account**. The existing trial stays anonymous until the separate Worker is deliberately put into account-only mode. Do not call a database table a financial or provider-wide hard quota. Google and GitHub provider identities remain separate accounts unless explicitly linked in a future flow.

Complete the **login migration first**: `migrations/crew-auth/0001.sql`. Then execute `migrations/crew-auth/0002_guest_trials.sql` against the same `crew-auth` D1 database. Applying both schemas is essential; D1 creation alone does not initialize tables.

### Secure production activation

1. Test Google and GitHub sign-in at `https://www.3sssi.com/account`; session endpoint must show the signed-in account. No transcript, key or provider access token is uploaded by this process.
2. Generate one new **random secret of at least 32 characters** for `CREW_GUEST_TICKET_SECRET`, for example with `openssl rand -hex 32`. Install **the identical secret** as encrypted Secret on **Cloudflare Pages Production** and **crew-guest-trial Worker**. Do not paste the secret in GitHub or frontend variables.
3. Add a D1 binding **CREW_AUTH_DB** pointing to the existing `crew-auth` database on the **Worker** too. The existing Pages binding remains unchanged. This D1 binding is separate from the older optional `GUEST_DB` trial-fingerprint quota.
4. Deploy **Pages first**, so `POST /api/auth/guest-ticket` is operational. It issues signed assertions only for a validated SameSite HttpOnly Crew session and a same-origin POST.
5. Deploy the **crew-guest-trial Worker** with these bindings, without turning sign-in mode on yet; verify GET /api/guest/token still returns enabled=true.
6. Set Worker text environment variable **GUEST_REQUIRE_SIGNIN=1**; redeploy the Worker. GET /api/guest/token now returns `signinRequired:true`. Its POST requires a valid, signed, unexpired, one-use account assertion. Missing DB / signing Secret / rate limiter fails closed.
7. In a fresh browser, verify the Guest Trial prompts for sign-in, signs in, accepts Turnstile, and grants exactly one Live token. Signing out or changing browsers must **not** reset the account trial count. Replaying the same assertion or starting a second trial from the same account must return 429/ALREADY_USED.
8. Open /account again: the D1-backed readout shows `1 / 1`. Directly calling the public Worker without the signed assertion returns 401, even if Turnstile passes.

**Rollback:** set `GUEST_REQUIRE_SIGNIN=0` and redeploy the Worker. This restores Phase 1 anonymous operation, including its per-edge limiter. Do not remove the database tables or secrets during rollback. Only operate after verifying the quota and login flow; no auto-deploy of the isolated Worker is assumed.

**Important:** the matching `CREW_GUEST_TICKET_SECRET` and Worker D1 binding are *additional* to the original Google/GitHub OAuth configuration. Until activation, account sign-in is available but trial usage tracking/limits remain anonymous as before. An unauthenticated browser cannot self-assert an account ID.
