# Crew Web global i18n rollout

## Current implementation
The interface offers **18 language choices**. This is a progressive localization beta, **not 18 fully translated products**. The native UI selection and user-selected teaching / chat language remain independent.

- `zh-TW` and `en`: existing full UI dictionaries and published SSG with indexable metadata.
- `ja`, `es`, `pt-BR`, `id`: translated global navigation + homepage, English fallback for incomplete product views. SEO priority but **not yet indexable**.
- `fr`, `de`, `ko`, `vi`, `th`, `hi`, `ar`, `ru`, `it`, `tr`, `nl`, `zh-CN`: experimental language preferences; currently English UI fallback.

Canonical locale registry: `config/ui-locales.json`. Do not change `stage` from `priority` to `published` without publishing equivalent localized content.

## Route behavior
- Unprefixed paths always stay Traditional Chinese (no automatic browser-language, cookie or saved-preference redirects): `/`, `/teacher`, `/story`, `/fortune`.
- Other languages use a route prefix: `/ja/teacher`, `/es/story`, `/pt-BR/fortune`, `/id/teacher`.
- `/en/*` remains unchanged. Navigation uses React Router basename, not a second SPA or a redirect after rendering.
- The legacy `/crew-app/#/...` still uses HashRouter and saved locale.
- All preview locale routes serve `noindex,follow` Cloudflare shells and **are excluded from hreflang and sitemap** until reviewed. Their copy must never be misrepresented as fully translated.

## Search publication checklist
1. Translate each product's remaining namespace and user-facing controls; native speaker or equivalent editorial QA.
2. SSR/SSG render actual localized route content and translated metadata for that locale.
3. Validate canonical URLs, reciprocal hreflang, x-default, JSON-LD and sitemap against published routes.
4. Publish market-researched original content; do not mass translate articles for indexation.
5. Track search impressions → starts → Gemini setup → return visits by locale.

Verification: `npm test`, `npm run check:web`, `npm run build:cloudflare`, `npm run test:cloudflare`. Do not trigger Android AAB.

## Route-level international publication
The legacy zh-TW/en SSG clusters remain unchanged. `config/seo-international.json` is the explicit, per-page release gate for additional interface locales. Do not promote an entire UI locale merely because some pages are ready.
Each entry requires `locale`, normalized app `path` (no trailing slash except root), localized `title` and `description`, content `lastmod` (YYYY-MM-DD), and `reviewed: true` after content and UX QA. The supported app routes are defined in `scripts/seo-publication.mjs`; other routes, including user-specific/live views, are not eligible.
The Cloudflare build renders the actual locale with its namespaces, creates canonical metadata and reciprocal hreflang only for actual sitemap counterparts, and leaves non-published routes noindex. When adding the first entries, verify both slash and slashless routes and private/unpublished deep links on a Pages preview before merging. Do not treat the unit-tested rewrite policy as production HTTP verification.
The registry starts empty deliberately; market-specific page review and publication are separate PRs.
