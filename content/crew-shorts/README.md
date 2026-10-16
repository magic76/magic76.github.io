# Crew Shorts — Cloudflare Pages first

Crew Shorts uses the existing Git-connected Cloudflare Pages project. No R2 bucket, Cloudflare payment method, or R2 API key is needed. This job publishes only approved captions and WebP images: it does not generate AI content or call Gemini.

## Original seed (imported)

The original Crew Shorts seed has been imported with 15 approved English posts, Traditional Chinese translations, original image prompts and individual WebP lifestyle photos for Zoe, Bella, Hugo, Theo and Yuna. The original captions and translations were preserved; imageAlt metadata was updated to reflect the final photos showing the characters.

When the files are available, review them and add the approved content to:

    content/crew-shorts/approved/posts.json
    content/crew-shorts/approved/media/zoe-day1.webp
    content/crew-shorts/approved/media/bella-day1.webp
    ...

Source JSON: schema=1, kind=crew-shorts, source=seed (or daily), posts array (max 100). Each item has an original stable id, friendId, friendName, caption, imageAlt, image (relative path such as media/zoe-day1.webp), publishedAt, language and storyId. Optional: translationZh and storyContext. Maintain the original order, identities, consent constraints and translations.

Source future posts and media stay in content/crew-shorts/approved; the Pages build does not copy this directory. The publisher adds only due content to the public features/teacher/shorts/ folder.

## Dry run

    node scripts/publish-shorts-pages.mjs --feed content/crew-shorts/approved/posts.json --out-dir features/teacher/shorts --as-of 2026-10-15 --dry-run

No credentials or external services required. The publisher validates post identity, story ownership, image path, WebP signature and size (max 350 KiB). Missing photos for posts due to be published stop publication without replacing the current feed. Future posts are excluded. Dry-run never writes files.

## First release

Go to GitHub Actions → Crew Shorts Pages publish → Run workflow. Run with dry_run=true, then dry_run=false after reviewing the seed and photos.

The workflow prepares and validates content, runs TypeScript and the full Node test suite, then creates a git commit of only features/teacher/shorts/ on master using the built-in GitHub Actions token. If no new approved posts are due, it does not commit.

The existing Cloudflare Pages Git integration must be enabled for the production master branch. Verify that Cloudflare builds and deploys the new content commit. The content URLs are:

    https://www.3sssi.com/features/teacher/shorts/posts.json
    https://www.3sssi.com/features/teacher/shorts/media/<hash>.webp

No one-time change to config.json is necessary; it already points at this first-party JSON. The frontend continues loading the feed over the network and does not bundle photos into JS.

Note: Commits created by GitHub Actions using GITHUB_TOKEN do not trigger other GitHub Actions push workflows. This publisher runs tests BEFORE committing. Cloudflare Pages Git integration deploys on GitHub pushes independently; verify the first bot-triggered deployment in the Cloudflare dashboard.

## Automatic release

The publisher now runs when approved source files or this workflow are merged into master, and daily at 00:00 UTC / 08:00 Taipei. A pull request dry-run validates all 15 original images and posts before merge. No special GitHub variable is needed; no R2 service is used. It publishes already approved content with publishedAt dates up to today. It is NOT a content or image generator; keep adding reviewed source images/captions to the approved directory.

## Rollback

Disable the workflow schedule by reverting the activation change if broken images or an invalid seed are found. Revert the automatically generated content(shorts): publish approved daily photo stories commit and let Cloudflare Pages deploy the reverted git state. Git history preserves prior published JSON and images.

## Limits and future R2 migration

The source/published feed is currently limited to 100 posts; a later release should implement archives/pagination. The Pages project has file count and build limits. If the project grows, its feed config allows moving to R2 later without rewriting the product flow. The previous R2 publisher remains an optional historical tool, but there is no active R2 workflow.

## AI generated daily Stories (opt-in)

See [AI-DAILY.md](./AI-DAILY.md) for the upstream `Crew Shorts AI daily generate` job, Gemini API key and Artifact preview. It creates new captions, translations and five separate character-anchored photos; the stable Pages publisher remains independent. AI generation is disabled by default until `CREW_SHORTS_AUTO_GENERATE_ENABLED=true` is set in Actions Variables. No demo images can be promoted from this workflow.
