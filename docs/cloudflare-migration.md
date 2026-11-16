# Crew Web — minimal React SSG on Cloudflare Pages

Crew Web is **one React Router app** built by Vite. Cloudflare Pages serves static files; there is **no request-time server, Worker, SSR framework or second marketing UI**.

## Build

Cloudflare Pages (branch `master`):
- Build command: `npm run build:cloudflare`
- Output: `dist`
- Node.js: 22
- Root directory: project root

The build first compiles the React client and CSS, then runs `scripts/prepare-cloudflare.mjs`. Its small `scripts/ssg-renderer.mjs` helper asks Vite to render the **real** `<App />` through React `renderToString` and `StaticRouter` for ten public URLs: `/`, `/teacher`, `/story`, `/fortune`, `/research` in zh-Hant and English `/en/`. The pre-existing SEO files supply **head metadata only** (canonical, social cards, hreflang and JSON-LD), not a second homepage. The original pages and assets for GitHub Pages remain available for transition/rollback.

Browser entry uses `hydrateRoot` only if the URL matches the embedded SSG route marker. Personal data (Gemini Key, memory, teacher profile and local records) is never read into build-time HTML; affected parts render an empty/default state and update after hydration. Deep routes, including `/teacher/live`, `/story/read/:id`, `/settings`, use the existing SPA fallback and `createRoot`; an early head guard hides a mismatched public-page snapshot before React takes over.

`dist` still includes runtime scripts, published research JSON, complete app CSS (inlined for reliable delivery), images and `sitemap.xml`. This migration does not change Gemini Live or Android apps.

## Verify

```sh
npm ci
npm run check:web
npm run build:cloudflare
npm run test:cloudflare
npm test
```

On Pages preview or `www.3sssi.com`, check the page source for `data-crew-ssg-path`, actual `app-header` and product headings (not `seo-fallback`), then check that the page hydrates and responds to navigation. Reload `/en/teacher` and a deep route `/teacher/roles?mode=friends` to verify URL handling. Test Key setup, mic/audio, memory, teacher and friends, and story/fortune local records with existing browser data.

## Bounds

- A build-time snapshot cannot contain user-specific state. Personal content appears client-side after hydration; this is intentional for privacy.
- Story shelf/user records and the newest research data are loaded by the browser; future article-level SSG is optional.
- Dynamic paths still use the Vite SPA fallback, not request-time rendering.
- When an app route lacks a dedicated prerendered HTML file, Cloudflare serves the root SPA HTML. The first-paint guard suppresses the incorrect snapshot until the correct React route mounts.

## Missing hashed assets on Cloudflare Pages

`prepare-cloudflare.mjs` emits a tiny, headless `dist/assets/build/404.html`, **not** a top-level `dist/404.html`. Pages first looks for a real asset, then walks up from a missing path for the nearest `404.html`: a missing `/assets/build/*.js` receives that file with **404**; `/teacher/roles` and `/story/read/x` find no ancestor 404 and still receive `/index.html` with **200** (SPA fallback). A missing unversioned `/assets/*.webp` still falls back to the SPA HTML; this change intentionally protects only the hashed build directory.

This follows Cloudflare's [Serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/) documentation and the Pages OSS asset server `packages/pages-shared/asset-server/handler.ts` (`notFound()` and `attachHeaders()`, commit `dc47e6d2a061748f47dc9cfba66ed3cffe944754`): after applying `_headers`, **404** responses lose user `Cache-Control` and receive `Cache-Control: no-store`. Real hashed bundles keep the existing immutable rule. The directly requested `404.html` asset redirects to its extensionless `/assets/build/404` URL and can be served with **200**, so `_headers` explicitly detaches the broad `Cache-Control` and sets `no-store` for **both** names *after* the broader rule. A more-specific rule alone would merge conflicting directives; see [Pages headers](https://developers.cloudflare.com/pages/configuration/headers/).

Production Pages routing and edge caching may differ from this OSS implementation; verify **after deployment** (also repeat the missing-chunk request with `-H 'Origin: https://www.3sssi.com'`):

```sh
BASE=https://www.3sssi.com
MISSING="${BASE}/assets/build/does-not-exist-$(date +%s).js"
curl -sS -D - -o /dev/null "$MISSING"                       # 404; cache-control: no-store; NOT immutable
curl -sS -D - -o /dev/null -H 'Origin: https://www.3sssi.com' "$MISSING" # same 404/no-store
curl -sS -D - -o /dev/null "$BASE/assets/build/404"           # 200; cache-control: no-store
curl -sS -D - -o /dev/null "$BASE/teacher/roles"             # 200; text/html (SPA)
curl -sS -D - -o /dev/null "$BASE/story/read/x"             # 200; text/html (SPA)
# Replace with an actual JS path emitted into dist/assets/build/ by this deployment:
curl -sS -D - -o /dev/null "$BASE/assets/build/<real-hashed-entry>.js" # 200; JS MIME; immutable
```

## Search discoverability: product pages and daily articles

The Teacher, Story and Fortune React pages now render concise, user-facing bilingual explanations **below the interactive features**, using the same components for SSG and client-side navigation. No separate SEO-only landing page is maintained.

At build time, `scripts/research-seo.mjs` reads the published `crew-app/briefings/index.json` and each listed `YYYY-MM-DD.json` edition. Vite renders the actual `BriefingDetailPage` at `/research/YYYY-MM-DD/:id/` and embeds only the public edition/article seed into an application/json script. Browser hydration reads that seed to render the exact same first frame, while private reading status/notes are loaded afterward from browser storage. The `/research/` index is also pre-rendered with the latest public edition and article links.

Article HTML includes unique title, description, canonical, OG details, and BlogPosting JSON-LD. Short scraped abstracts and thin reports are still accessible as SSG pages but marked `noindex,follow` and excluded from the generated sitemap. This avoids creating indexable low-information copies of third-party research. The quality gate is conservative (substantial analysis/relevance and at least one HTTPS source) and should be reviewed when editorial standards evolve.

The sitemap is generated from published data **every build**; adding a new public date to `crew-app/briefings/index.json` automatically creates detail HTML on the next Cloudflare deployment. Invalid dates, unsafe article IDs, or duplicate IDs fail the build instead of writing unsafe files.

`npm run test:cloudflare` checks every article/metadata/sitemap entry, and the Chrome smoke test opens selected published articles to check page hydration and source links. Route-level SSR/Workers are not required.
