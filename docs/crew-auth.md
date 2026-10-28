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

## Cloudflare Workers OAuth redirect compatibility (2026-10-28)

Cloudflare Workers/Pages Functions support only `fetch` redirect modes `follow` and `manual`, not `error`. The former `redirect:"error"` in both token exchange and profile requests threw a runtime `TypeError` before contacting Google/GitHub and surfaced as `auth_stage=token&auth_reason=token_transport` even with valid credentials. Both now use `redirect:"manual"`; token exchanges explicitly reject any 3xx response, so credentials are never auto-forwarded to another origin. This fix requires a Pages production deployment, but **no OAuth credential changes**. Source: https://developers.cloudflare.com/workers/runtime-apis/request/
