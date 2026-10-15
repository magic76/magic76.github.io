# Crew Shorts demo (P1)

- Web: `/teacher/shorts` (lazy route), linked from the Teacher landing page.
- Content: `features/teacher/shorts/posts.json`, delivered as plain static JSON, not bundled into JS. Cloudflare Pages' existing copy of `features/` publishes this path.
- Feed schema v1: `id`, `friendId`, `friendName`, `caption`, `image`, `imageAlt`, `publishedAt`, `language`, `storyId`.
- Preview uses third-party Unsplash photos, visibly marked **DEMO**. These photos are not claimed to be photos taken by AI friends, nor AI-generated. Self-hosted generated media is deferred to P2.
- Interaction: local-only likes, browser speech synthesis, and link into existing Friend Live. **Chat does not yet ingest the selected post as context**. Do not claim it does.
- Images load from remote URLs and are only requested when visible. They must never be embedded into the SPA JavaScript bundle.
- No new Gemini key or backend API is needed to browse.
- Future P2 should batch generate verified content, upload images to R2, atomically publish a manifest and JSON feed on CDN, and carry `storyId` and `postId` into the chat context without violating friend memory consent. Use a content moderation pass before publication.
- Data must eventually match the user's target language; the demo is explicitly English-only.
- Keep this separate from Android's canonical behavioral contract until a shared feature is defined.
