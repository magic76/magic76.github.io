# Crew Shorts ingestion contract

Crew Shorts content is static JSON and CDN media, never bundled into JavaScript.
`features/teacher/shorts/config.json` selects the feed URL (today: bundled fallback `posts.json`).
Future R2/Cloudflare publishes an **immutable** dated JSON feed plus media and updates a stable URL. The frontend reads that URL; daily content does **not** require a new frontend build once configured.

## Incoming seed pack

The external conversation prepared `crew-shorts-seed-v1.zip` (5 friends, 3 story days, 15 English posts, Traditional Chinese translations, image descriptions). **The archive has not been attached or committed to this repository.** Also, the other conversation reported that final generated photos were not ready. Do not invent/rewrite captions or present demo photos as the AI friends' original photos.

Import procedure when archive is available:
1. Unzip it outside the public web root. Review its manifest and original texts.
2. Map every original post to this file's fields; keep original story order and translations.
3. Place generated image files in CDN/R2 using a dated immutable path, ideally WebP <= 200 KB for feed and optionally a larger detail image. Use HTTPS; don't ship base64 or images inside JS.
4. Run `node scripts/check-shorts-feed.mjs path/to/posts.json` before publishing. The validation rejects missing media in published feed.
5. Upload images first; then upload the versioned JSON; lastly atomically update the stable feed object. Never publish a partial batch. Keep the last good version in case daily generation fails.
6. Once an external HTTPS feed endpoint is deployed, change `feedUrl` in `config.json` once. Frontend will prefer the CDN feed and fall back to local demo feed if unavailable.

## Feed JSON v1

```json
{
  "schema": 1,
  "kind": "crew-shorts",
  "source": "seed",
  "generatedAt": "2026-10-15T00:00:00Z",
  "posts": [{
    "id": "stable-id-per-original-post",
    "friendId": "zoe",
    "friendName": "Zoe",
    "caption": "<verbatim original English text>",
    "translationZh": "<verbatim original Traditional Chinese translation>",
    "image": "https://media.example.com/shorts/.../zoe.webp",
    "imageAlt": "<verbatim photo description>",
    "publishedAt": "2026-10-15T08:00:00Z",
    "language": "en",
    "storyId": "same-id-across-story-days",
    "storyContext": "optional brief vetted recap of already-established fictional facts",
    "mediaCredit": "optional"
  }]
}
```

Required: `id`, `friendId`, `friendName`, `caption`, `image`, `imageAlt`, `publishedAt`, `language`, `storyId`.
Optional: `translationZh`, `storyContext`, `mediaCredit`. Posts may be localized later, but are never auto-translated in Live unless user requests help.

The published feed URL and each photo must be publicly accessible without an API key. The browser never receives any generation keys.
The Friend Live route accepts `post=<id>`, resolves it against the published feed, checks that the friend ID matches, and **only then** adds the caption/scene to the friend persona prompt. An invalid or deleted post falls back to a normal friend chat with a notice. No learner memory is written until a real user conversation happens, following the existing consent controls.
