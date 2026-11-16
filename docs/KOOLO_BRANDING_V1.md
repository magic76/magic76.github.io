# Koolo（酷囉）Branding V1 — isolated preview

Status: PR-only prototype. Do not merge or attach koolo.app until user acceptance and trademark/domain review.

## Scope
- Positioning: natural, playful language practice with an AI friend, not another tutoring course.
- Hero: 「學語言，用聊的就好。」
- Original speech-bubble K brand mark and responsive landing; does not replace Crew favicon, PWA icons or existing production UI.
- Source path: web-spa/public/koolo-preview/ (index.html, koolo.css, koolo-mark.svg). Vite copies public/ into the Cloudflare output.
- Preview route: /koolo-preview/ on the pull request preview host. No special React routes or new dependencies.
- The phone-style illustration uses existing Zoe portrait copied into /assets/friends/ by prepare-cloudflare.mjs and is explicitly labelled as sample content.

## Existing functional routes
- Zoe voice: /friend/live?id=zoe&from=home&entry=bubble
- Zoe text: /friend/live?id=zoe&from=home&chat=text
- Links on the isolated preview point to the existing www.3sssi.com production app so login/Turnstile/guest trial work without separate PR-preview origin allowlists. These are the same destinations used by the current Crew mobile homepage. No new backend, token, microphone request, or API endpoint is introduced.

## SEO and deployment boundaries
- Preview HTML includes noindex,nofollow, no canonical or hreflang; remains deliberately out of the site navigation and sitemap.
- No edits to 3sssi.com canonical, Google/GitHub OAuth callbacks, Cloudflare DNS/Bindings, Worker origin checks, PWA manifest, or existing Crew Home.
- Do not bind koolo.app to the current Pages production project before an explicit hostname migration plan.

## QA checklist
1. Run node --test tests/koolo-branding-preview.test.js.
2. Run npm run check:web, npm run check:i18n, npm run build:cloudflare, npm run test:cloudflare, npm run check:bundle, npm test.
3. Visit /koolo-preview/ on Cloudflare PR preview at 360x640, 390x844 and 1280x800. Check both CTA targets, two buttons above the fold, layout, focus, text wraps, 44px+ hit areas, and Zoe avatar.
4. Click voice and text: verify friend Zoe loads, mic denial still provides text fallback, no Turnstile/OAuth regression.
5. Verify existing production /, /en/, /friend/live, /teacher, SEO canonical and sitemap remain unchanged.
6. Verify static preview HTML returns noindex and separate bundled stylesheet/SVG.

## Later rollout (not V1)
- Confirm Taiwan trademark availability of Koolo/酷囉 and phonetic variants Qoolo/Coolo for software/education.
- Before making koolo.app canonical, update OAuth allowlists, worker CORS/origin controls, Turnstile domains, Analytics, PWA manifests, cookie scope, SEO canonical/hreflang/OG, Search Console and redirects.
- Plan route-level 301 migration only after app functionality and search indexing are verified.
