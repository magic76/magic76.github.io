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
