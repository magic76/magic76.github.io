# Crew Web public SEO foundation

## Deployment and URL structure

The GitHub Pages custom domain is `www.3sssi.com` (from root `CNAME`). All indexable pages use HTTPS and canonical trailing-slash URLs:

- `/` — Crew product overview
- `/teacher/` — Teacher and Crew Friends
- `/story/` — stories and reading
- `/fortune/` — chart exploration
- `/research/` — daily R&D briefing overview

Every page is static semantic HTML, served directly by GitHub Pages via a directory `index.html`. Do not redirect the root to the HashRouter SPA. The actual app remains at `/crew-app/#/...`, which is marked `noindex,follow` in both `web-spa/index.html` (build source) and `crew-app/index.html` (currently checked-in build output).

## Editing / validation

Edit `scripts/generate-seo.mjs` rather than generated landing HTML or `seo.css`. Regenerate:

```sh
node scripts/generate-seo.mjs
node scripts/generate-seo.mjs --check
npm test
```

The `tests/seo-pages.test.js` test runs during existing `npm test`, checks outputs and validates title, description, canonical, crawlable H1 / links, robots and sitemap. `robots.txt` deliberately does **not** disallow `/crew-app/`: crawlers need to be able to read its noindex directive.

## Future phases

- **International SEO:** Publish **complete translated static content** at `/en/`, `/en/teacher/`, etc. before adding reciprocal `hreflang` entries to either language's pages or to the sitemap. The Web App language selector alone is not indexable translated content.
- **Social previews / schema:** Add reviewed OG images and grounded JSON-LD rather than placeholder screenshot / unsupported claims.
- **Content SEO:** Publish vetted individual research reports under stable public article URLs; do not include raw daily AI drafts in the sitemap.
- **Search Console:** Verify the domain, submit `https://www.3sssi.com/sitemap.xml`, and inspect coverage for the five canonical URLs. Verify GitHub Pages domain / HTTPS and slash URL behavior after merge.

The static public pages are not a second implementation of Teacher / Story / Fortune. Feature behavior continues to follow the Android app and existing Web runtime.
