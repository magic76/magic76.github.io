# Koolo international SEO — domain migration

## Canonical origin
Production canonical: **https://koolo.app** (apex; without www). The old `www.3sssi.com` and `3sssi.com` domains are historical entry points, not canonical URLs. Existing backend host allowlists must remain compatible with the old domain during migration.

Public static pages have reciprocal `hreflang="zh-Hant"`, `hreflang="en"` and `x-default` tags. The generated sitemap, robots.txt, OG and Twitter images, JSON-LD, game/course/guide/research SSG and RSS should all point to `https://koolo.app`.

The Cloudflare Pages preview domains, preview UI languages and interactive private SPA remain **noindex**. Do not remove that protection.

## Source of truth / testing
Modify generators, never just hand-edit generated HTML.

```sh
node scripts/generate-seo.mjs
node scripts/generate-seo.mjs --check
node --test tests/seo-pages.test.js tests/seo-live.test.js tests/koolo-seo-cutover.test.js
npm run check:web
npm run build:cloudflare
CREW_CLOUDFLARE_TEST=1 node --test tests/cloudflare-deployment.test.js
```

Production HTTP smoke test (only after the new site is deployed): `node scripts/check-live-seo.mjs`. It checks public 200 responses, canonical, hreflang, sitemap/robots and private noindex; it does **not** prove Google indexing.

## Domain transfer sequence
1. Confirm `koolo.app` is Active with valid TLS and that Google/GitHub OAuth, Turnstile and `p.koolo.app` anonymous text/voice sessions work, as well as the old origin.
2. Deploy this SEO code, then validate `https://koolo.app/robots.txt` and `https://koolo.app/sitemap.xml`. Confirm public pages return 200 and advertise `koolo.app`.
3. Only after functional smoke QA, enable **zone-level Cloudflare Redirect Rules** for both `3sssi.com` and `www.3sssi.com` to `https://koolo.app` (301, keep path/query); on the Koolo zone redirect `www.koolo.app` to the apex. Do NOT use Pages `_redirects` for cross-domain redirects, and do NOT redirect the dedicated Worker subdomain `p.koolo.app`.
4. Confirm no redirect loop and no 404; verify root, `/en/`, `/teacher/`, `/games/1a2b/`, `/fortune/`, `/guides/ai-english-speaking/` and deep links with query strings.
5. Add and verify `koolo.app` in Search Console, submit `sitemap.xml`; once redirects are live use Change of Address on the old verified property. Keep the redirects for at least a year.

**Cookies/localStorage do not migrate** across domains. Users may need to log in again; do not silently copy BYOK keys. Keep old OAuth callbacks and backend compatibility during transition.

See [koolo-domain-rollout.md](koolo-domain-rollout.md) for exact verification steps and rollback.
