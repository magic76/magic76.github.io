# Crew Web production launch checklist

Production: https://www.3sssi.com/ ; Cloudflare Pages project: magic76-github-io.

## P0 — Browser stability

GitHub CI builds the Cloudflare production dist, checks HTML/SEO/static assets, and launches real Chrome through Playwright (CI-only dependency). All ten SSG entry routes are checked for hydration warnings, actual Crew header/styles, literal backslash-n, in-app React navigation and refreshing the nested /teacher/roles route.

Manual browser/device checks remain necessary for Gemini key persistence, teacher/friend voice, microphone permissions, story page-turning/audio, Fortune history, remembered learning preferences, and mobile UI. Never put user keys in CI.

## P1 — Cloudflare Web Analytics

1. Cloudflare Dashboard → Workers & Pages → magic76-github-io → Metrics.
2. Under Web Analytics click Enable (unless already enabled).
3. Deploy a new production build. Cloudflare Pages automatically injects its beacon into valid HTML. Do NOT add another script or generate a fictitious token.
4. In the production site's Network panel verify beacon.min.js from static.cloudflareinsights.com and requests to /cdn-cgi/rum (browser blockers may suppress them). Inspect visits, sources, paths and CWV in Web Analytics.

Cloudflare automatically records React Router soft navigation / SPA page views. Do not manually double-count history changes. Avoid `no-transform` response headers, which stop beacon auto-injection.

Google Analytics 4 can be deferred until user-journey funnels are needed; it adds privacy/configuration overhead.

Official: https://developers.cloudflare.com/pages/how-to/web-analytics/
Official SPA support: https://developers.cloudflare.com/web-analytics/get-started/web-analytics-spa/

## P2 — Google Search Console

1. Open https://search.google.com/search-console/ . Add a Domain property with exactly `3sssi.com` (no https:// or www).
2. Copy Google's actual DNS TXT verification token. In Cloudflare → 3sssi.com → DNS → Records → Add record, set Type TXT, Name @, and Content to the exact token. Do not invent it and do not remove it after verifying.
3. In Google Search Console click Verify. DNS propagation may take time.
4. Under Sitemaps submit `sitemap.xml`. Inspect the root, /teacher/, /story/, /fortune/, /research/ and corresponding /en/ pages.
5. Confirm Google-selected canonical matches the www.3sssi.com canonical and check Indexing and Core Web Vitals later; submitting a sitemap never guarantees immediate indexing.

The build validates robots.txt, all ten SSG canonical/hreflang entries, and sitemap.xml in CI. `_headers` adds X-Robots-Tag: noindex only to pages.dev aliases to prevent duplicate site indexing; www.3sssi.com stays indexable.

Docs: https://support.google.com/webmasters/answer/34592
Docs: https://support.google.com/webmasters/answer/9008080
Docs: https://developers.cloudflare.com/pages/configuration/headers/

## Limits

The assistant cannot turn on Cloudflare Metrics or add a Google DNS TXT on behalf of the account without authorized access. CI tests localhost Chromium, not the Cloudflare edge or a phone microphone. After auto-deployment, confirm the real domain and mobile experience manually.