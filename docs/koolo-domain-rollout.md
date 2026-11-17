# Koolo domain migration: safe rollout

## Scope
Existing production: `https://www.3sssi.com`. Planned preferred canonical hostname: `https://koolo.app` (apex, no www).
This PR makes both precise HTTPS origins available to the Pages and standalone Guest Trial backends **without** switching SEO URLs, redirects, DNS, OAuth provider settings, Turnstile registration, or Worker deployment. In particular, nothing on 3sssi.com should redirect yet.

## Phase 1 — dual-domain backend support (this PR)
- [ ] Deploy this Pages code to accept `https://koolo.app` for OAuth, sessions/logout, guest-token endpoint and usage events, without changing legacy `www.3sssi.com`.
- [ ] **Separately deploy** `workers/guest-trial/worker.mjs` (and `text-chat.mjs`) using the existing standalone Worker release process. A Pages deploy does *not* deploy the Worker, and secrets/bindings remain server-side.
- [ ] In Cloudflare, open Workers & Pages → existing Pages project → Custom domains → add `koolo.app` and wait until Active with TLS. `www.koolo.app` can be added and configured as a same-path redirect to the apex; do not serve the app on a second new hostname.
- [ ] Cloudflare Turnstile → existing widget → Settings → Hostname Management → add `koolo.app`, retain legacy hostname.
- [ ] Google Cloud OAuth Web client → Authorized redirect URIs: add `https://koolo.app/api/auth/google/callback`; add Authorized JavaScript origin `https://koolo.app` if relevant. Keep legacy values.
- [ ] GitHub → Settings → Developer settings → OAuth Apps → existing app → add the callback `https://koolo.app/api/auth/github/callback` (OAuth Apps now support multiple callback URLs, up to ten). Keep the legacy callback. Do not enable wildcard matching just for this migration.
- [ ] Verify that old site and `koolo.app` both load: `/api/auth/health`, Google/GitHub OAuth start/callback, logout, guest Live and text through the existing Worker, Turnstile, feedback and usage events. Read browser console for 403/404, CORS or cookie failures.


### Dedicated Trial Worker endpoint: `p.koolo.app`
If `p.koolo.app` has already been added under **crew-guest-trial → Settings → Domains & Routes**, keep it there. This code adds the same Custom Domain in `wrangler.toml` and allows the Worker to respond to both `p.koolo.app` and `crew-guest-trial.shanliyoung.workers.dev` (both exact HTTPS hosts).
1. Deploy from repository root: `npx wrangler deploy --dry-run --config workers/guest-trial/wrangler.toml`, followed by `npx wrangler deploy --config workers/guest-trial/wrangler.toml`.
2. Confirm the Worker responds to `OPTIONS https://p.koolo.app/api/guest/token` with `Origin: https://koolo.app`: status 204, `access-control-allow-origin: https://koolo.app`. Also verify old origin/host.
3. After the Worker endpoint is verified, deploy `chatgpt/koolo-frontend-guest-api`. Exact `https://koolo.app` now uses `https://p.koolo.app` for both Live and text trial; legacy `www.3sssi.com`, previews and Android continue using the old `workers.dev` endpoint. This does not switch SEO/301.
4. Turnstile allowed hostname should include `koolo.app`, **not** `p.koolo.app`: the challenge is rendered by the website, not the API Worker. Keep `www.3sssi.com`.
5. Do not disable the old `workers.dev` hostname or change D1, production secrets, quotas, Cron or OAuth callback settings as part of this Worker-only deployment.

## Phase 2 — SEO and hostname cutover (**separate PR**, after Phase 1 validation)
- [ ] Change the SEO generator, pre-rendered HTML/SSG, social OG URLs, JSON-LD, robots, sitemap and live SEO tests to `https://koolo.app`; regenerate generated artifacts.
- [ ] Cloudflare on the **old** 3sssi.com zone: use HTTP Redirect Rules or Bulk Redirects for `3sssi.com` and `www.3sssi.com` to `koolo.app`, with 301, preserve path and query. Only enable once new app works. **Do not** use Pages `_redirects` for cross-domain matching: it does not support domain-level conditions and cannot intercept Pages Functions.
- [ ] Cloudflare on the **new** zone: 301 `www.koolo.app` to `koolo.app`, preserving path and query.
- [ ] Test that indexed public URLs return 200 on the new host, old links 301 to the corresponding new path, and canonical/OG/hreflang/sitemap all point to the new origin. Check robots/noindex.
- [ ] Google Search Console: verify the new domain, submit `https://koolo.app/sitemap.xml`, use Change of Address for domain move and retain redirects for at least one year.

## User-data migration impact
Browser localStorage and host-only cookies are **not shared** between 3sssi.com and koolo.app. Users may need to log in again, and browser-local preferences, learning state, stored charts and BYOK Gemini keys **will not appear** on the new domain automatically. Do not copy keys/user data cross-origin without a separate consent-based migration. Where configured, the existing D1 identity and account tables remain shared by both domains.

## Rollback
Retain old Pages domain, OAuth callback, D1 bindings and Worker secrets while validating the new domain. If new domain checks fail, disable its traffic without breaking the existing one. After phase 2 redirects are active, plan any rollback explicitly.
