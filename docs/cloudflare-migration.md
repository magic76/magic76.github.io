# Cloudflare Pages migration: one React app, clean routes

## Why

The legacy GitHub Pages deployment lives at `/crew-app/#/...` because Vite previously published to `crew-app/` and the site used React `HashRouter`. Neither is a product requirement.

Cloudflare Pages builds the **same React app** to the website root with `BrowserRouter`. Public routes are `/`, `/teacher`, `/story`, `/fortune`, `/research` and `/settings`. Existing nested functionality remains at `/teacher/roles`, `/story/read/:id`, etc. `/briefing` is redirected to `/research`. Historical `/crew-app/#/... ` links are decoded by a tiny compatibility document.

**Until the production domain is switched**, `npm run build:web` continues compiling the old `crew-app/` artifact for GitHub Pages, preserving current functionality. Do not delete its build or remove HashRouter support until the Cloudflare rollout is verified.

## Cloudflare Pages setup (no deploy token needed)

- Cloudflare Dashboard > Workers & Pages > Create > Pages > Connect GitHub.
- GitHub repository: `magic76/magic76.github.io`; Root directory: repo root.
- Production branch: `master` (not `main`).
- Build command: `npm run build:cloudflare`.
- Build output directory: `dist`.
- Node.js: 22.x (set `NODE_VERSION=22` if the selected Pages build environment needs a specific version).
- No API token or Gemini key should be supplied at build time; the existing runtime asks users for their own Gemini API key.
- Test on the assigned `*.pages.dev` URL **before** adding `www.3sssi.com` as a custom domain. Don't change DNS until the checks below pass.

Cloudflare Pages auto-falls back to root `index.html` for unknown SPA paths when no top-level `404.html` is present, so refreshing `/story/read/:id`, `/teacher/live`, and `/settings` works without a custom Worker. Fixed SEO pages have their own static HTML entry files, with original user-visible content and canonical metadata at the **same URL** the React App boots. React replaces the fallback with the real functional screen after loading JS.

## Build and verification

```sh
npm ci
npm run check:web
npm run build:cloudflare
npm run test:cloudflare
npm test
```

To protect against external `/assets/*.css` requests failing after React mounts, the Cloudflare output **also inlines the exact minified Vite CSS bundle** in each public HTML entry. The app CSS comes before the fallback `/seo.css` in HTML, so the branded landing styling remains visible until `useLayoutEffect` removes the landing stylesheet after a successful React commit. The hashed stylesheet file is still retained under `/assets/` for diagnostics. The tradeoff is larger HTML responses (about 150 KB before gzip) until the CSS delivery issue is conclusively traced to the deployed CDN.

The first-paint experience avoids flashing two different websites: an early inline head script adds a JS-only class **before the browser paints**, hiding the static SEO marketing fallback. While React loads, a lightweight Crew-style shell appears after a brief delay. On successful React commit, the app removes its temporary class and the legacy SEO stylesheet. When JavaScript is disabled, the original readable SEO content is visible; if React fails to mount within eight seconds, the static fallback automatically reappears. This is progressive enhancement rather than a separate page or redirect. Search engines that render JavaScript see the functional React app, while non-JavaScript visitors can still access meaningful static content.

SEO landing HTML retains the full `/seo.css` for the non-JavaScript and failure fallback. After React commits, a `useLayoutEffect` hook removes only the tagged fallback stylesheet, preventing style collisions. If JavaScript fails, the visitor retains the complete styled landing instead of an unstyled page. If product UI still does not appear, inspect the browser Network/Console for missing `/assets/*.js` and `/assets/*.css` requests.

The build copies legacy publicly served scripts `crew.js`, `crew-live.js`, `crew-live-ui.js`, and the required `features/` folder into `dist`. It also copies the published `crew-app/briefings/` feed to `dist/briefings/`, plus public images and sitemap. Do **not** deploy the full repository directory or unreviewed drafts.

Smoke-test these URLs at Pages preview domain:
- `/`, `/teacher/`, `/story/`, `/fortune/`, `/research/` — each opens the actual React screen, not a marketing-to-app redirect.
- `/en/teacher/` — English interface plus correct canonical and reciprocal `hreflang`.
- `/teacher/roles?mode=friends`, `/teacher/live`, `/story/read/<existing-id>`, `/fortune/reading`, `/research/board` — reload remains in React; avoid breaking audio permissions or browser storage.
- `/crew-app/#/teacher/practice` and `/crew-app/#/story/read/<id>?page=1` — old bookmarks redirect to clean route.
- Check `/briefings/index.json`, `/features/shared/db.js`, `/crew-live.js`, `/sitemap.xml`, and `/social/teacher.png` return the expected content types instead of SPA HTML.
- Test Gemini Key, microphone, live interruption, story progression, local memory and browser-storage restoration.

## Domain cutover

After the preview is verified, attach `www.3sssi.com` to the Cloudflare Pages project via **Custom domains**. Cloudflare manages zone DNS; do not independently delete or recreate records before the UI confirms the target. Confirm HTTPS and indexable canonical pages; submit `https://www.3sssi.com/sitemap.xml` to Search Console. The former `magic76.github.io` domain can remain as a legacy deployment, but custom `CNAME` ownership / GitHub Pages configuration must be reconciled to avoid redirect loops between hosts.

## Boundaries and future work

This migration does **not** change Gemini Live transport, learning language, storage keys, or Android apps. `/en/` routes follow the existing UI translation coverage; some Briefing inner content still lacks full i18n and should be completed before editorial English article pages are indexed.

Dynamic research articles still require their own vetted HTML/metadata before indexing. Do not include raw AI-generated drafts in sitemap. The SEO fallback is a progressive HTML document, not full React SSR; improving SSR parity and per-article SEO is future work after stable Cloudflare routing.
