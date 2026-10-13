# Crew Research: publication quality and contextual discovery

This is a writing and publishing contract for daily research, not a request to invent longer text to get indexed. The canonical public source is `crew-app/briefings/index.json` and each referenced `YYYY-MM-DD.json`. Every published article remains readable at `/research/YYYY-MM-DD/:id/`.

## Quality before search indexing

A useful Crew Research article answers four distinct questions:
1. **What does the original source actually claim?** Identify source type, paper or official documentation and publication date. Cite its exact URL; avoid claiming a paper was tested by Crew.
2. **What part applies to Crew?** Name the relevant project(s), existing verified behavior, and the decision a developer might need to make. A blanket “this concerns Pocket/Deck” is not enough.
3. **What would disprove the idea?** State applicability limits, uncertainty, and what the source did not demonstrate. Never present external benchmarks as Crew's own results.
4. **How can it be verified?** Provide reproducible questions, measurements, test scenarios, and explicit pass/fail conditions rather than generic “read the original and build a PoC.”

Prefer clear paragraphs headed `研究發現：`, `Crew 應用：`, and `研究限制：` (or equally specific variants). Those headings are an editorial aid, not evidence that the claims are true. Avoid paraphrasing the abstract and padding it out. The author must verify each external claim independently before publication.

The automatic check `scripts/research-quality.mjs` blocks **SEO indexing only** if a source is missing, the body resembles an excerpt, Crew applicability is generic, limitations are absent, or no actionable test plan exists. It cannot determine factual accuracy, copyright compliance, authorship, originality, scientific validity or source authenticity; manual editorial review remains necessary. Publication itself is not blocked. A short source-only item can still be read and cited by humans while marked `noindex,follow`.

## Daily volume is a ceiling, not a quota

The automatic daily issue selects up to 12 diversified recent leads and publishes up to 6, targeting 4–6 when verifiable sources are available. Only up to 3 leads are submitted to Gemini for detailed traditional-Chinese analysis; at most 2 passing the same SEO eligibility rules enter the issue as deep analyses. Remaining slots show clearly identified source-only briefs, which should not enter the sitemap. Official RSS/Atom engineering blogs and selected GitHub release notes supplement HN/OpenAlex. Relevant release notes must actually mention a technical change. Missing Gemini API credentials, invalid output, and source/network failures must not be hidden: keep source briefs, log warnings, and avoid implying the analysis was performed.

No automatic tool can establish factual accuracy or true originality. An SEO-eligible article is a candidate for indexing, not proof of external verification, ranking, or traffic; human review and Search Console remain decisive.

## Daily build / feedback

```sh
node scripts/research-quality-report.mjs
npm run build:cloudflare
npm run test:cloudflare
node --test tests/research-editorial.test.js
```

The Cloudflare CI step emits the per-article eligibility and failure reasons into the GitHub Actions run summary. The published sitemap includes eligible articles only. This does **not** mean Google has indexed them. Never change the threshold simply to make every paper appear in Sitemap; instead improve the actual editorial substance and verify it.

## Relevant reading and product links

`scripts/research-discovery.mjs` chooses at most three related *published* articles using the same research topic, overlapping topic words and shared project references. It does not create made-up titles, sources or routes. Links to `/teacher`, `/story`, `/fortune` or `/` appear **only** when the article explicitly tags the corresponding Crew product. There is no standalone landing-page copy. Articles about Pocket/Deck remain discoverable through other genuinely related research; do not invent Web product URLs for them.

The same build-generated recommendation list is embedded as the article SSG hydration seed and saved to `/briefings/discovery.json` for client-side navigation. The user's reading status, notes, memory, or API keys never enter these files.

## Future improvements

Use Search Console index reports and queries to decide which topics deserve original experiments and comparison articles. Do not optimize solely toward word count, keyword repetition, or SEO scores. Revisit link relevance when the catalogue expands.
