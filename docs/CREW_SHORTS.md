# Crew Shorts — current production architecture

Last verified against Crew Web master: 2026-10-29.

## Current state

- **16** canonical Crew Friends, defined in `content/character-identities/manifest.json`. The original five-character seed remains in history; generator and client must agree on all 16.
- Approved editorial JSON and photos are in `content/crew-shorts/approved/`. The source on 2026-11-04 has 335 posts ending 2026-11-11; do not assume this number stays constant.
- **Two public contracts:** latest-100 legacy `/features/teacher/shorts/posts.json` (Android backward compatibility), and full paginated v2 `/features/teacher/shorts/v2/index.json` (50 posts per page). Web loads v2 first, then legacy as a fallback.
- Cloudflare Pages hosts first-party fingerprinted WebPs; images and captions are **not** embedded in JavaScript or the Android APK.
- The Pages publishing GitHub workflow is scheduled for 08:17 Asia/Taipei; it only releases already-approved, due posts and does not create new ones.
- The optional Gemini image/text workflow is **manual-only**, even though older planning documents mention an opt-in automatic generator. It never runs on a daily schedule.
- AI generation requires approved official Friend portrait bytes and strict nine-factor visual identity QA. Partial or unreviewed batches do not replace approved content.
- For content preparation in a fresh Work conversation, read `.agents/skills/crew-shorts/SKILL.md`.

## Publishing flow

```text
Canonical Friend roster (16) + prior story history + official portrait references
     ↓
English caption / Traditional Chinese translation / story context / single 3:4 photo
     ↓
Preview → identity/scene QA → human review
     ↓
content/crew-shorts/approved/posts.json + media/*.webp
     ↓
scripts/publish-shorts-pages.mjs (real-time release cutoff, no premature posts)
     ↓
features/teacher/shorts/posts.json (latest 100)
features/teacher/shorts/v2/index.json and v2/pages/*.json (complete archive)
features/teacher/shorts/media/<sha256-prefix>.webp
     ↓
Cloudflare Pages → React Web / compatible Android clients
```

## Reader and interaction

- `web-spa/src/teacher/shortsFeed.ts` strictly validates known Friend IDs, approved first-party WebP paths, dates, and text fields.
- `web-spa/src/teacher/HomeShortsPreview.tsx` randomizes the first retrieved page and displays distinct Friends (default six); clicking a picture opens the actual post.
- `web-spa/src/teacher/ShortsPage.tsx` loads and shuffles archive pages incrementally, provides translations, likes, and story-based prompts to Friend Live.
- `storyId` groups episodes and `storyContext` supports bounded follow-up chat. Photo captions are story background, **never system instructions or real personal memories**.

## Guardrails and checks

- All 16 roles come from the canonical identity manifest; no stale five-person generator list.
- Individual previews must not publish. A full run only promotes new, missing approved posts after all requested images pass QA. Already-approved posts remain unchanged; legacy partial seed dates may be completed safely.
- Photos: 900 × 1200 WebP, target ≤200 KiB, hard limit 350 KiB. Face reference must be the verified official master, not previously generated Shorts photos.
- Do not enable recurring AI image generation without explicit approval; a complete batch can cost up to 16 images plus QA and retries.
- Run `node scripts/publish-shorts-pages.mjs --dry-run --as-of YYYY-MM-DD`, `node scripts/check-content-hub.mjs`, `npm run check:web`, and `npm test` before release.
