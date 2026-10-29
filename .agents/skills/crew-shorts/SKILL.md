---
name: crew-shorts
description: Create, review, and safely publish Crew Shorts photo diaries for all 16 Crew Friends in magic76/magic76.github.io. Use for Shorts captions, images, imports, preview batches, publishing, QA, and story continuity.
---

# Crew Shorts — canonical production skill

## Scope and source of truth

Repository: `magic76/magic76.github.io`. Read `AGENTS.md`, `docs/CREW_SHORTS.md`, and `content/crew-shorts/README.md` before editing. Always sync the latest `master` and inspect the active published JSON and approved source. This document is an operational checklist, **not** an installed global ChatGPT skill: when starting a new Work conversation, explicitly give the path/URL to this file.

- Canonical Friend roster: `content/character-identities/manifest.json` (`characters` with `role === "friend"`). It currently contains **16** Friends. Never silently fall back to the original five.
- Canonical identity: `content/character-identities/v2/friends/<friendId>.json` and **actual verified bytes** at `assets/friends/crew_friend_<friendId>.webp`. Do not substitute generated Shorts photos as face references.
- Approved editorial source: `content/crew-shorts/approved/posts.json` and `content/crew-shorts/approved/media/*.webp`. Preserve every existing item and unique ID.
- Published compatibility feed: `features/teacher/shorts/posts.json` (latest 100). Public historical feed: `features/teacher/shorts/v2/index.json` plus `v2/pages/*.json` (50/page). Do **not** hand-edit these: the Pages publisher generates them.
- Web client: `web-spa/src/teacher/shortsFeed.ts`, `ShortsPage.tsx`, `HomeShortsPreview.tsx`. Android uses the shared released feed.
- Publisher: `scripts/publish-shorts-pages.mjs` + `.github/workflows/crew-shorts-pages.yml`. AI generation: `scripts/generate-shorts-daily.mjs` + `.github/workflows/crew-shorts-daily-generate.yml` (**manual dispatch only**).

## Default behavior

1. For "make Shorts", determine the date (Taipei), number of days, and whether the request is **draft/preview** or **explicit publication**. If not explicit, create a reviewable draft/PR; never publish automatically. Avoid asking for details already supplied.
2. For each requested full date, cover **each of the 16 canonical Friends once**. For a single-role preview, render only that role; do not attempt to publish an incomplete batch. Inspect the last three approved posts for each character to avoid repeated situations and to continue real story arcs when appropriate.
3. Every story needs one natural **English first-person caption**, a fluent **Traditional Chinese translation**, a vivid visual `scene`, accessible English `imageAlt`, stable `storyId`, and bounded `storyContext`. Prefer ordinary, specific, slightly surprising personal moments—not generic motivational quotes, artificial drama, identical activities, product placements, or invented real-user memories.
4. Produce **one independent, full-bleed 3:4 photo per post**, one recognizable Friend in frame, naturally varying clothes/poses/locations. Use the official **master image bytes** as a reference, maintain the exact face and identity, and do not crop a single collage into multiple photos. No text, watermarks, logos, duplicate backgrounds, or substitute faces.
5. Validate each candidate visually against its master: same face, eyes, hair, skin, visible face, single person, scene match, photographic realism, no text/logo (all nine must be true). Require human review for uncertain cases. If any required photo or QA fails, **do not promote the batch**. Never fabricate `qa.pass=true`.
6. After approval, preserve prior posts/media, ensure IDs are unique, and publish only due timestamps. No new API keys, cloud infrastructure, automatic Gemini schedule, or expensive generation jobs unless specifically requested.

## Photo and metadata contract

- Photo output: 900 × 1200 pixels, WebP; target ≤200 KiB, hard publisher limit **350 KiB**. Validate image decoding, not just a `.webp` extension. One photo per ID, e.g. `media/ada-20261029.webp`.
- Captions: English first-person, target 30–170 characters, validated limit 500. `translationZh` is natural Traditional Chinese, max 500.
- `imageAlt` in English, max 180. `storyContext` max 650. `storyId` max 110. ISO release instant `YYYY-MM-DDT08:00:00+08:00` for normal daily releases.
- Example approved post fields (sample values are illustrative, **not a photo or verified real post**):

```json
{
  "id": "ada-20261029",
  "friendId": "ada",
  "friendName": "Ada",
  "caption": "One screw left over. I have decided it is decorative.",
  "translationZh": "剩下一顆螺絲。我決定把它當成裝飾。",
  "image": "media/ada-20261029.webp",
  "imageAlt": "Ada sitting at a workbench holding a spare screw after assembling a small shelf.",
  "publishedAt": "2026-10-29T08:00:00+08:00",
  "language": "en",
  "storyId": "ada-workbench-spare-screw",
  "storyContext": "Ada has been building a small shelf at home."
}
```

## Safe generation and publication

**No-cost checks** (from repo root):
```bash
node scripts/generate-shorts-daily.mjs --mode plan --date YYYY-MM-DD
node scripts/publish-shorts-pages.mjs --feed content/crew-shorts/approved/posts.json --as-of YYYY-MM-DD --dry-run
node scripts/check-shorts-feed.mjs features/teacher/shorts/posts.json
node scripts/check-content-hub.mjs
```

**Optional paid generation**, only if authorized and `GEMINI_API_KEY` is configured in GitHub Actions secrets: use **Actions → Crew Shorts AI generate (manual)**, select `mode: preview` (no commit) or `mode: publish` (commits approved source). `friend` supports all 16; choosing one Friend can never publish. Preview artifact includes `manifest.json`, review HTML, and individually generated WebPs. A 16-Friend run can incur 16 image calls plus QA/retries. No recurring generation job is enabled.

**Manual/Work photo production:** generate externally with the image tool, inspect identity against canonical originals, encode and check WebPs, append JSON to approved source, and create a PR with **approved source and media**. Run the validation commands and tests. Merge only after review; the existing publisher releases due content. For explicit manually approved full-date local preview batches, `node scripts/shorts-submit.mjs --date YYYY-MM-DD --approve` can create a PR, but review the artifacts first and make sure every canonical Friend has a passing nine-field QA record.

**Validation before PR/merge:** `npm run check:web`, `npm test`, `npm run build:web`, `npm run build:cloudflare` (when available), publish dry-run, compare approved JSON count + dates + media checksums, and list any existing baseline failures separately. Do not hide failing validations or invent a green status.

## Deliverables when handing off

Report exact date range, count of new posts and unique photos, per-Friend coverage, image dimensions/size, QA results, narrative continuity decisions, branch/PR URL, changed paths, validation results, and any unapproved/rejected outputs. Explicitly say whether it was **only previewed**, **PR created**, **merged**, or **published**. Provide public feed verification after a real release: `https://www.3sssi.com/features/teacher/shorts/v2/index.json` and `https://www.3sssi.com/teacher/shorts`.
