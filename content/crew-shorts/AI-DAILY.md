# Crew Shorts — AI daily story and character photo generator

## What it does

`Crew Shorts AI daily generate` is a new upstream workflow, separate from the existing stable `Crew Shorts Pages publish` workflow. The original 15 stories, `image-prompts.json`, WebP photos and all previously published content are retained.

Every **scheduled** run (06:30 Asia/Taipei, may be delayed by GitHub) creates five NEW, independent social diary posts and five individual portrait 3:4 photos for Zoe, Bella, Hugo, Theo and Yuna. A text model plans captions, Traditional Chinese translations, accessible descriptions and scenes using each character's last three posts. An image model receives each friend's **canonical avatar from `assets/friends/`** and the previous photo to maintain face, environment and prop continuity. A vision QA pass checks each result against the character reference and new scene. Python Pillow verifies decoding, enforces portrait ratio and encodes one WebP per post (target ≤200 KiB, hard limit 350 KiB).

The batch only enters `content/crew-shorts/approved/` after **all five** photos and visual reviews pass. Missing credentials, invalid images, generation failures and rejected QA **do not replace the previous approved source or published feed**. Successful production jobs commit both the approved batch and any due public feed to the Git-connected Cloudflare Pages repository; future posts remain unpublished until the existing 08:00 Taipei Pages publishing workflow releases them. GitHub Actions bot commits do not trigger downstream push Actions: the combined generation job publishes any already-due posts itself, and the separate schedule still handles the 08:00 release.

For long-term use, the newest 100 approved posts are kept in the live feed; older captions and metadata are preserved in `content/crew-shorts/approved/archive/YYYY-MM.json`, and historical WebPs remain in the source `media/` directory. **This is rolling feed retention, not automatic deletion of story history.**

## One-time configuration

1. GitHub repository → **Settings → Secrets and variables → Actions → Secrets** → add repository secret `GEMINI_API_KEY`. This is an API key from [Google AI Studio](https://aistudio.google.com/apikey). It is never committed to the repository. An existing mobile/web BYOK key cannot be used by server-side GitHub Actions unless you explicitly add it as this secret.
2. Run **Actions → Crew Shorts AI daily generate → Run workflow** with `mode: plan`. This requires no key, spends no tokens, and creates an Artifact with `manifest.json` showing which stories would be generated. When 2026-10-16 through 2026-10-18 already have approved entries, the report will state `already-approved`; this is intentional and avoids replacing the original seed.
3. On or after **2026-10-19 Taipei time**, run `mode: preview`, `date` blank. Gemini API and image output incur charges and the generated five images, captions and per-image QA decisions are packaged in the run's **Artifacts → crew-shorts-daily-<run_id>**. This run DOES NOT publish or change any approved data.
4. After inspecting real preview photos, run `mode: publish` (same day); or turn on the daily schedule by setting Actions **Variables** `CREW_SHORTS_AUTO_GENERATE_ENABLED=true`. The scheduled run uses your key and creates due content when the original seed no longer covers the day. Until this variable is set, the scheduled generation job is intentionally skipped; the existing daily Pages publisher continues working.

Optional Actions variables: `SHORTS_TEXT_MODEL` (default `gemini-2.5-flash`) and `SHORTS_IMAGE_MODEL` (default `gemini-2.5-flash-image`). Models, pricing, rate limits and output formats depend on Google account and region: verify your account's access and billing before enabling. There is no automatic image-generation fallback to fake/placeholder pictures.

## How to inspect each day's actual results

Open `https://github.com/magic76/magic76.github.io/actions/workflows/crew-shorts-daily-generate.yml`, choose a run, scroll to **Artifacts** and download `crew-shorts-daily-<run_id>`. Open `YYYY-MM-DD/manifest.json` for English + Traditional Chinese captions, image filenames, QA outcome and any generation errors. The `YYYY-MM-DD/*.webp` files are the actual five separately generated and decoded character photos. If an image fails, the Artifact contains the partial work and the failure reason but **no approved commit**. Only successful `publish` jobs are committed. `plan` has no AI-generated stories, by design.

The daily release itself is verified separately at:

- `https://github.com/magic76/magic76.github.io/actions/workflows/crew-shorts-pages.yml`
- `https://www.3sssi.com/features/teacher/shorts/posts.json`
- `https://www.3sssi.com/teacher/shorts`

## Failure and cost controls

- API calls are protected with per-request timeouts, at most two retries for transient HTTP 408/429/5xx, and no retries on invalid key/permission.
- Five image generations and five extra vision QA reviews are made per non-skipped daily batch; preview uses real paid API calls. No background generation happens until the GitHub Actions variable is enabled.
- `plan` never requires an API key. Runs which already have five approved posts for the date skip all Gemini calls.
- GitHub shared concurrency prevents simultaneous generation and publication jobs. Re-running the same date is idempotent against approved post IDs; no generated image can replace an existing source image.
- If generation fails, check `manifest.json` and review failed request limits/quota; the publisher keeps previously published feed. For rollback disable the variable and revert the daily content commit while keeping archived originals.
- Automatic image QA is a useful gate, **not an absolute guarantee** of identical facial features, perfect hands or zero text. Review early Artifact previews before enabling unattended daily publication.