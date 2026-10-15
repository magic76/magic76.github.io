# Crew Shorts demo (P1)

- Web: `/teacher/shorts` (lazy route), linked from the Teacher landing page.
- Content: `features/teacher/shorts/posts.json`, delivered as plain static JSON, not bundled into JS. Cloudflare Pages' existing copy of `features/` publishes this path.
- Feed schema v1: `id`, `friendId`, `friendName`, `caption`, `image`, `imageAlt`, `publishedAt`, `language`, `storyId`.
- Preview uses third-party Unsplash photos, visibly marked **DEMO**. These photos are not claimed to be photos taken by AI friends, nor AI-generated. Self-hosted generated media is deferred to P2.
- Interaction: local-only likes, browser speech synthesis, optional Traditional Chinese translation, and `post=<id>` link into existing Friend Live. Live resolves that ID against the current public feed, checks the selected friend, and uses bounded fictional story background in the opening; ordinary friend conversation behavior and memory consent are preserved.
- Images load from remote URLs and are only requested when visible. They must never be embedded into the SPA JavaScript bundle.
- No new Gemini key or backend API is needed to browse.
- Future P2 should batch generate verified content, upload images to R2, atomically publish an immutable dated JSON feed and switch the stable pointer. Use a content moderation pass before publication. See `CREW_SHORTS_IMPORT.md`.
- Data must eventually match the user's target language; the demo is explicitly English-only. `scripts/check-shorts-feed.mjs` validates content before publishing.
- Keep this separate from Android's canonical behavioral contract until a shared feature is defined.
