# Crew Shorts — approved content to Cloudflare R2

This is the **publication** pipeline, not an AI image-generation service. It publishes only previously approved fictional posts and real WebP image files. It does not invent texts, generate photos or call Gemini. It preserves the user-authored seed.

## Step 1. Import the original seed ZIP (not in this repository yet)

The separate conversation generated a download link `crew-shorts-seed-v1.zip` (five friends Zoe, Bella, Hugo, Theo and Yuna; three days, 15 English posts with Traditional Chinese translations and photo prompts). Its bytes are **not available in this repo** and final photos were **not included**. No fictitious substitute content should be approved.

When the ZIP is available, manually inspect its JSON and map the original fields without rewriting copy into:

```text
content/crew-shorts/approved/
  posts.json
  media/
    zoe-day1.webp
    bella-day1.webp
    ...
```

A proposed post format (use original approved words, not these placeholders):

```json
{
  "schema":1, "kind":"crew-shorts", "source":"seed",
  "generatedAt":"2026-10-15T00:00:00Z",
  "posts":[{
    "id":"original-stable-id", "friendId":"zoe", "friendName":"Zoe",
    "caption":"<original English>", "translationZh":"<original translation>",
    "image":"media/zoe-day1.webp", "imageAlt":"<original photo description>",
    "publishedAt":"2026-10-15T08:00:00Z", "language":"en",
    "storyId":"original-story-id", "storyContext":"<approved factual recap>"
  }]
}
```

`image` must be a relative path to a **real optimized WebP** in the approved directory. For future-dated posts, `image` can temporarily be empty; on their publication date, the pipeline will reject missing images and preserve the old feed. Do not put secrets, user chat memory or PII in public posts. Full approved assets must be staged before enabling scheduled publication.

Run a local dry run without any Cloudflare configuration:

```bash
node scripts/publish-shorts-r2.mjs \
  --feed content/crew-shorts/approved/posts.json \
  --origin https://media.example.invalid \
  --as-of 2026-10-15 \
  --output /tmp/crew-shorts-preview.json \
  --dry-run
```

The script checks friend/story identity, duplicate posts, lengths, all due images, local path traversal, WebP file signature and file size (max **350 KiB**). It filters out future posts, rewrites each due image URL to a content-hashed immutable R2 path, and creates a JSON manifest preview. No image data is compiled into the app JavaScript.

## Step 2. Configure R2

1. Create one R2 bucket (for example `crew-shorts`). Attach a public custom domain in the Cloudflare R2 bucket settings, ideally `media.3sssi.com`. The domain must actually exist; the example is not automatically configured.
2. Create an R2 token restricted to **Object Read & Write** on that bucket (Cloudflare: R2 -> Manage R2 API tokens). Save its S3-compatible Access Key and Secret Access Key. Do not use an all-account API token.
3. In the GitHub repository **Settings → Secrets and variables → Actions**, add:

| Kind | Name | Example / meaning |
|---|---|---|
| Variable | `CREW_SHORTS_R2_ACCOUNT_ID` | 32-character Cloudflare Account ID |
| Variable | `CREW_SHORTS_R2_BUCKET` | `crew-shorts` |
| Variable | `CREW_SHORTS_MEDIA_ORIGIN` | `https://media.3sssi.com` |
| Variable | `CREW_SHORTS_ENABLED` | `true` only **after** a successful manual publication |
| Secret | `CREW_SHORTS_R2_ACCESS_KEY_ID` | bucket-scoped S3 Access Key |
| Secret | `CREW_SHORTS_R2_SECRET_ACCESS_KEY` | bucket-scoped S3 Secret Key |

The website fetches a JSON feed from the media domain, so configure R2 bucket CORS to allow GET/HEAD from production `https://www.3sssi.com` (and any intended preview origin); caching custom-domain rules should honor the feed's 60-second TTL while images and versioned feeds are immutable.

## Step 3. Dry run and first release

In GitHub → Actions → **Crew Shorts R2 publish**, run `workflow_dispatch` with `dry_run=true` and optionally `as_of=YYYY-MM-DD`. Inspect the `crew-shorts-preview` artifact for captions, translations, stable IDs, chronological releases and CDN image paths.

Once the content and real R2 bucket are ready, manually rerun with `dry_run=false`. It uploads **media first**, then `shorts/feeds/YYYY-MM-DD-<digest>.json`, verifies it exists, backs up the previous `shorts/posts.json` pointer if any, and finally replaces `shorts/posts.json`. If a step fails before the final upload, the old public feed remains untouched.

Confirm the public URL is accessible **without credentials**:

```text
https://media.3sssi.com/shorts/posts.json
```

Then update the *one-time* Web setting `features/teacher/shorts/config.json`:

```json
{"schema":1,"feedUrl":"https://media.3sssi.com/shorts/posts.json"}
```

This one-time config deployment makes the app read the stable R2 endpoint. **Daily content updates after that require no Web rebuild.** The client falls back to its bundled demo feed if the remote endpoint is inaccessible. Verify CORS and the Live post-click flow using the same public URL.

After this first release, set `CREW_SHORTS_ENABLED=true`. The action runs at **00:00 UTC / 08:00 Asia/Taipei** daily and includes all publishedAt date-stamped posts through today's Asia/Taipei editorial date. It cannot publish a day with missing required images and will not silently switch to demo imagery. If content has no posts due yet, it leaves the previously published feed unchanged.

## Rollback

All earlier immutable feeds are retained at `shorts/feeds/`, and the previous live pointer is backed up under `shorts/backups/`. After verifying the desired version, a maintainer with bucket-scoped credentials can restore a prior feed with:

```bash
aws --endpoint-url "https://<ACCOUNT_ID>.r2.cloudflarestorage.com" s3api copy-object \
  --bucket crew-shorts \
  --copy-source "crew-shorts/shorts/feeds/<version>.json" \
  --key "shorts/posts.json" \
  --metadata-directive REPLACE \
  --content-type "application/json; charset=utf-8" \
  --cache-control "public, max-age=60, must-revalidate"
```

Only publish reviewed, fictional Crew Friend content. Images, captions and story context are untrusted data, not hidden instructions or permanent user memories.

## Future generation

Generating fresh images/captions is a *separate* approved-content preparation job, not part of this publisher. It can eventually produce `posts.json` and WebPs in an approval queue. No generation automation is enabled until model/provider, moderation and cost controls are established.
