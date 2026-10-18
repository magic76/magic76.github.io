# Crew Content Hub v2 — incremental migration

## Source of truth and backward compatibility

- **Approved Shorts source:** `content/crew-shorts/approved/posts.json` + verified 3:4 WebP files.
- **Research source:** `web-spa/public/briefings/YYYY-MM-DD.json` and its date index.
- **No source moves:** both existing daily workflows remain authoritative.
- **Public Shorts v1:** `/features/teacher/shorts/posts.json` retains the **100 latest** published moments for existing Android installations.
- **Public Shorts v2:** `/features/teacher/shorts/v2/index.json` lists 50-item pages under `v2/pages/00001.json`; includes an ID-to-page lookup for old conversation deep links.
- **Web:** reads v2 first, scrolls through subsequent pages, falls back to v1 when v2 is absent. Home preview fetches only one page.
- **Android:** stays on the v1 contract until its consumer gets independent v2 support. Do not remove v1 without an Android migration.
- **Media:** current verified WebPs continue on Pages at `/features/teacher/shorts/media/<sha>.webp`. No R2 or video service is enabled by this change.

## Shared editorial metadata (contract, not an additional CMS)

`content/schemas/content-v2.schema.json` and `scripts/content-hub.mjs` define:
- `type: article | moment`, stable `id`, `status`, `publishedAt`, localized captions/titles, and `media[]`.
- `draft -> review -> approved -> scheduled -> published -> archived` with explicit review/rollback transitions.
- For moments, keep the canonical `authorId` and `storyId`; published references are *untrusted fictional scene context*, not character identity or user memory.
- For media, `image | video` with storage-independent `assetId` and explicit URLs. This is preparatory metadata only; video rendering and upload are not part of this PR.

These are **derived metadata contracts**: do not write them over the v1 JSON documents, and do not expose draft or scheduled stories. The research workflow may publish source-only briefs that are not SEO-indexable; Content Hub does not change the existing editorial-quality gate.

## Publication steps

1. Generate/create content outside the public runtime.
2. Human-review Shorts photos and captions; commit only reviewed assets to `approved/`. Research continues to use its evidence/quality review gate.
3. Validate both streams offline with `node scripts/check-content-hub.mjs`. A missing/unsafe media reference or invalid content identity fails publication.
4. Shorts Pages publisher validates due date and *all* due WebPs, then writes v1 latest 100, all v2 pages/index, and fingerprinted media before a single Git commit. The public feed never contains scheduled stories.
5. Cloudflare Pages deploys on Git integration; Web reads data over the network without bundling posts/photos in JS.
6. Rollback by reverting the content publication commit. Archived pages remain accessible only through the current published index; never use private Draft data in Pages.

## R2 and video migration boundary (not yet enabled)

When video becomes a concrete product:
- Put MP4, posters and subtitles in R2 with immutable object keys; keep editorial metadata in Git.
- Publish verified media manifest URLs (or same-origin Worker-proxied URLs) using the v2 media contract; validate source, MIME, size, poster, aspect ratio, and ownership.
- The web player should only preload near the viewport, play one video at a time, respect reduced-motion/autoplay policies and mute-by-default requirements.
- Evaluate Cloudflare Stream only when adaptive bitrate/transcoding and playback analytics justify its cost. Avoid using Git/Pages for MP4 bytes.
- Update the Android consumer separately under the cross-platform contract before removing the legacy v1 feed.

## Checks

```sh
node scripts/check-content-hub.mjs
node --test tests/content-hub.test.js tests/shorts-pages-publisher.test.js tests/shorts-feed.test.js
npm run check:web
npm test
npm run build:cloudflare
```
