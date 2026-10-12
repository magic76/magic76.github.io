# Crew Web international SEO
The static marketing website is intentionally separate from the existing interactive app at `/crew-app/#/`. Do not migrate its HashRouter paths.

## Canonical domains and language paths
The Pages `CNAME` is `www.3sssi.com`; keep all canonical and alternate URLs on `https://www.3sssi.com`.

| Product | Traditional Chinese | English |
| --- | --- | --- |
| Home | `/` | `/en/` |
| Teacher | `/teacher/` | `/en/teacher/` |
| Story | `/story/` | `/en/story/` |
| Fortune | `/fortune/` | `/en/fortune/` |
| Research | `/research/` | `/en/research/` |

Each static page includes reciprocal `hreflang="zh-Hant"`, `hreflang="en"`, and `x-default` pointing to zh-Hant. The sitemap lists both languages with equivalent alternate links. No browser-language auto-redirect is used, because both crawlability and explicit language choice matter.

## Source and checks
Edit `scripts/generate-seo.mjs` and regenerate all ten public pages; do not edit generated HTML directly.

```sh
node scripts/generate-seo.mjs
node scripts/generate-seo.mjs --check
npm test
npm run check:web
npm run build:web
```

SEO regression tests validate generator output, reciprocal alternates, canonical URLs, nonempty language-specific content, JSON-LD, social images and sitemap. The OG image assets at `social/{crew,teacher,story,fortune,research}.png` are 1200×630 PNGs with English product identifiers to serve both locales.

Structured data is conservative: `WebSite`, page, `BreadcrumbList`, plus `SoftwareApplication` where the website actually has an interactive app. No fabricated reviews, ratings or paid/free offer claims.

The interactive SPA stays `noindex,follow`. Its interface language settings remain independent of the landing page's locale. No model prompts, voice or memory logic changes.

## Post-merge rollout checklist
1. Confirm that GitHub Pages deploys the static directories, and check 200 responses for both `/teacher/` and `/en/teacher/`.
2. Test image responses and social card previews; caching can delay updates.
3. In Google Search Console verify `www.3sssi.com` (or domain ownership), submit `https://www.3sssi.com/sitemap.xml`, inspect representative URLs in both languages, and monitor index coverage.
4. Research articles should receive individual indexable URLs only after editorial review; do not auto-index unreviewed daily drafts.

## Content policy
English pages are fully authored in English. Switching languages should never change an active Crew Teacher/Friend target language, raw user content or model-generated output. For now the landing pages explain products and link to their canonical Crew Web interactive experiences.
