# Crew Briefing — public AI research reader

## Audience and page contract

Crew Briefing is public research reading, not a personal admin dashboard.

- `/#/briefing`: date archive, editorial lead, research-topic filter, search, bookmark.
- `/#/briefing/YYYY-MM-DD/ID`: article, source publication dates, research implications and verifiable original links.
- `/#/briefing/board`: personal saved/reading/finished lists and optional backup.
- Existing Teacher practice reports remain separate at `/#/teacher/reports`.

**Not shown to public visitors:** per-owner GitHub commit cross-check, Agent delegation UI, Crew Lab SI social-draft editing, and internal five-column research Kanban. Those belonged to a private creator workflow. Do not reintroduce them without actual authentication and per-user authorization; hiding them with a frontend condition is not access control.

Crew project names and public commits can still be mentioned as evidence or practical examples in a published article, but should not dominate public-facing UX.

## Daily editorial directions

Source-of-truth: `scripts/briefing-research-axes.mjs`. Curated around eight questions:

1. **Agent Reliability**: agent failure, verification, task completion and recovery.
2. **Context & Memory**: provenance, compaction, Dreaming, safe retrieval.
3. **Multi-Agent Systems**: delegation, collaboration and shared state.
4. **Realtime Multimodal**: voice latency, interruption, reconnect, vision.
5. **AI Learning**: language tutoring, adaptation, feedback and pedagogy.
6. **Model Efficiency**: routing, smaller models, inference/token costs.
7. **AI Product Economics**: pricing, BYOK, privacy and sustainable operations.
8. **AI Product Experience**: human/agent workflows, usable product patterns.

Ranking is **heuristic and not an AI-assessed relevance score**. It evaluates title signals and source kind rather than accepting the search query as evidence; source metadata and recent papers are prioritized. Broad HN questions and commit-style noise are filtered. A daily issue targets 4–6 published items, with no more than two model-enriched, SEO-eligible traditional-Chinese analyses and the remaining source-only briefs. Discovery may rank up to twelve candidates, diversified by topic; fewer than four are published when valid sources are scarce. Current discovery uses public HN and OpenAlex metadata plus official engineering RSS/Atom feeds and select official GitHub releases. A release must contain a relevant change in its own release notes; arbitrary GitHub commits are not automatically published. No source is invented to fill an issue.

Reader-facing reporting should answer: (1) what problem is being solved; (2) where could it apply; (3) how would one validate it? Headlines, abstracts, age and limitations must be verified before claiming a result.

## Scheduled build and publication

`.github/workflows/crew-briefing-daily.yml` is scheduled at **22:53 UTC = 06:53 Asia/Taipei** (GitHub may delay execution). A code-change-specific push trigger provides smoke testing and workflow_dispatch remains supported. It reads public sources, optional Gemini enrichment, type-checks, builds, runs tests and commits the generated issue/compiled site to master.

- JSON feed: `web-spa/public/briefings/YYYY-MM-DD.json`.
- Index: `web-spa/public/briefings/index.json`.
- RSS: `web-spa/public/briefings/feed.xml`.
- Published by Vite to `crew-app/briefings/`.

Repository secret `CREW_BRIEFING_GEMINI_KEY` enables evidence-constrained traditional-Chinese analysis for at most three candidates, of which at most two passing the shared editorial-quality gate are included. `CREW_BRIEFING_MODEL` defaults to Gemini 2.5 Flash. If the secret is absent, the model fails, or outputs are unfit, the job retains source-only briefs; these are available to read but remain `noindex` under the editorial rules. A user's browser Gemini key is **never** sent to this job. The public GitHub token is used only for the official releases API. The build prints the count of eligible reports and briefs; it does not claim Google has indexed them.

## Privacy and states

Public JSON, RSS, generated static assets and repo contents are visible to everyone. Keep private memory, email, personal messages, keys, unpublished research, private commits and user-specific notes out.

Bookmarks, reading status and notes use localStorage key `crew_briefing_review_v1`. No account login or cross-device sync is provided. Existing research Kanban statuses remain readable; `adopted` is treated as finished, `researching` and `delegated` as reading; new public status is `finished`. The optional backup contains local user notes and must be kept private.

The old editor-only prompt drafting functions may remain in repository history but have no public UI entry points. If a genuine owner workspace is needed, build it separately behind authentication and server-side authorization.

## Verification

Run `npm run check:web`, `npm run build:web`, `npm test`. Check mobile views (360px), tablet (768px), desktop (1440px), date archive, source links, reading notes, local backup, and accessibility. Confirm both daily index and RSS reflect the generated source edition. Verify workflow output and Pages deployment instead of assuming cron will execute exactly on time.
