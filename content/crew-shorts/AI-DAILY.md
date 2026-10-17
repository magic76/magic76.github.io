# Crew Shorts — AI daily story and character photo generator

## What it does

`Crew Shorts AI daily generate` is a new upstream workflow, separate from the existing stable `Crew Shorts Pages publish` workflow. The original 15 stories, `image-prompts.json`, WebP photos and all previously published content are retained.

Every **scheduled** run (06:30 Asia/Taipei, may be delayed by GitHub) creates five NEW, independent social diary posts and five individual portrait 3:4 photos for Zoe, Bella, Hugo, Theo and Yuna. A text model plans captions, Traditional Chinese translations, accessible descriptions and scenes using each character's last three posts. An image model receives each friend's **canonical avatar from `assets/friends/`** and the previous photo to maintain face, environment and prop continuity. A vision QA pass checks each result against the character reference and new scene. Python Pillow verifies decoding, enforces portrait ratio and encodes one WebP per post (target ≤200 KiB, hard limit 350 KiB).

The batch only enters `content/crew-shorts/approved/` after **all five** photos and visual reviews pass. Missing credentials, invalid images, generation failures and rejected QA **do not replace the previous approved source or published feed**. Successful production jobs commit both the approved batch and any due public feed to the Git-connected Cloudflare Pages repository; future posts remain unpublished until the existing 08:00 Taipei Pages publishing workflow releases them. GitHub Actions bot commits do not trigger downstream push Actions: the combined generation job publishes any already-due posts itself, and the separate schedule still handles the 08:00 release.

For long-term use, the newest 100 approved posts are kept in the live feed; older captions and metadata are preserved in `content/crew-shorts/approved/archive/YYYY-MM.json`, and historical WebPs remain in the source `media/` directory. **This is rolling feed retention, not automatic deletion of story history.**

## One-time configuration

1. GitHub repository → **Settings → Secrets and variables → Actions → Secrets** → add repository secret `GEMINI_API_KEY`. This is an API key from [Google AI Studio](https://aistudio.google.com/apikey). It is never committed to the repository. An existing mobile/web BYOK key cannot be used by server-side GitHub Actions unless you explicitly add it as this secret.
2. Run **Actions → Crew Shorts AI daily generate → Run workflow** with `mode: plan`. This requires no key, spends no tokens, and creates an Artifact with `manifest.json` showing which stories would be generated. Plan mode always shows the history and planned five friends; it makes no AI calls even when the current day has approved posts. Production `publish` returns `already-approved` if all five posts already exist.
3. You can run `mode: preview` **today**, even when today already has five seed posts: it creates five NEW private preview stories and photos without changing the originals or publishing anything. It will use only earlier dates as character history (future seed stories are ignored). Gemini API and image output incur charges and the generated five images, captions and per-image QA decisions are packaged in the run's **Artifacts → crew-shorts-daily-<run_id>**. This run DOES NOT publish or change any approved data.
4. After inspecting real preview photos, run `mode: publish` (same day; it safely skips an already-approved seeded date), or wait until October 19 for the first new live batch; or turn on the daily schedule by setting Actions **Variables** `CREW_SHORTS_AUTO_GENERATE_ENABLED=true`. The scheduled run uses your key and creates due content when the original seed no longer covers the day. Until this variable is set, the scheduled generation job is intentionally skipped; the existing daily Pages publisher continues working.

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
## Character Identity v1 integration (P0)

The daily photo generator now reads `content/character-identities/manifest.json` plus each selected character's `v1/friends/<id>.json` **before making any Gemini requests**. The generator checks the exact official avatar's Git blob SHA, includes the immutable facial description and style lock, and sends the **actual official avatar bytes as its only image identity reference**.

Previously published Shorts photos are **never sent back as visual references**: older wrong-faced photos (such as seeded Bella) must not teach the model a new identity. Only text captions/story context continue the character's narrative.

The vision reviewer checks nine explicit items: same face, eyes, hair, skin tone, visible face, one person, intended scene, photographic realism, and no text/logo. Any missing/uncertain check rejects the batch; QA is still fallible and **human approval is required before accepting an identity test photo**.

### Bella single-photo acceptance test

1. Free, no image calls: `node scripts/generate-shorts-daily.mjs --mode plan --friend bella --date 2026-10-17`.
2. GitHub Actions → **Crew Shorts AI daily generate** → **Run workflow**:
   - `mode: preview`
   - `date: 2026-10-17`
   - `friend: bella`
   - `use_approved_story: true`
3. This selects the **existing 10/17 indoor-picnic caption and imageAlt**, skips text-story generation, creates **one photo of Bella** with her official master attached, runs a strict identity QA, and outputs only that photo plus a manifest in the artifact. It does not commit or publish anything. **Preview makes paid Gemini image and QA calls**; run only when ready to spend that quota.
4. Compare the result **visually** with `assets/friends/crew_friend_bella.webp`; verify eyes, nose, face proportions, blonde hair and hairline, skin tone, expression, true 3:4 framing, natural candid single-person picnic scene. Reject any look-alike despite a model QA pass.
5. After Bella passes, test other scenes. Keep the 32 official master images locked; only add new-angle references following explicit approval. Do not use the generated previews as trusted identity references automatically.

The equivalent private local CLI (with an explicitly configured `GEMINI_API_KEY`) is:

```sh
node scripts/generate-shorts-daily.mjs --mode preview --date 2026-10-17 --friend bella --use-approved-story
```

Safety: `--friend` is supported in `plan` and `preview` only and **cannot publish**, even if accidentally paired with `--mode publish`. Future-dated previews are allowed either with `--use-approved-story` for a seeded/approved post, or with `--preview-story-json` for a human-authored single-Friend draft **up to 30 days ahead**. The latter cannot be used in `publish` or combined with `--use-approved-story`. Production batch publishing remains all-or-nothing for the five Shorts Friends.

### Day 5 Zoe: future private preview from a written story (no text story-generation call)

Use this when the desired storyline does **not** exist in `content/crew-shorts/approved/posts.json` yet. In GitHub **Actions → Crew Shorts AI generate (manual) → Run workflow**, select `master` after this change is merged:

- `mode`: `preview`
- `date`: `2026-10-20` (Day 5; Day 1 is October 16)
- `friend`: `zoe`
- `use_approved_story`: `false`
- `preview_story_json`: paste the JSON below **on a single line** in the field:

```json
{"friendId":"zoe","caption":"I rescued that vintage lamp. It works, but only if I compliment it first.","translationZh":"我把那盞復古檯燈帶回家了。它會亮，但好像得先稱讚它。","scene":"Zoe in her cozy London apartment checking a newly purchased vintage brass desk lamp on a wooden side table, looking slightly amused in warm afternoon light. Natural candid 3:4 single-person photo, clearly visible face, no logos or text.","imageAlt":"Zoe adjusting a vintage brass desk lamp on a side table in her London apartment.","storyContext":"Yesterday Zoe found the brass desk lamp in a second-hand shop."}
```

**Important:** The current approved repository stores Zoe's coffee stories only through Day 3. The Day 4 second-hand-shop lamp story above is supplied as *unapproved draft continuity* in `storyContext`, not represented as an already-approved post. If the planned Day 4 changes, edit the Day 5 story before previewing.

This generates only **one** candidate photo for Zoe with her SHA-verified official master attached, then runs identity/scene QA and exports one WebP plus `manifest.json` to the run's Artifact. It does **not** call Gemini for captions, alter the approved feed, add photos to the live site, publish posts, or update the main branch. The image-generation and QA calls require `GEMINI_API_KEY` and may incur costs. Human visual acceptance remains required, and a successful Artifact is **not** automatically promoted to approved content.

Equivalent CLI (with `GEMINI_API_KEY` configured):

```sh
node scripts/generate-shorts-daily.mjs --mode preview --date 2026-10-20 --friend zoe \
  --preview-story-json '{"friendId":"zoe","caption":"I rescued that vintage lamp. It works, but only if I compliment it first.","translationZh":"我把那盞復古檯燈帶回家了。它會亮，但好像得先稱讚它。","scene":"Zoe in her cozy London apartment checking a newly purchased vintage brass desk lamp on a wooden side table, looking slightly amused in warm afternoon light.","imageAlt":"Zoe adjusting a vintage brass desk lamp on a side table in her London apartment.","storyContext":"Yesterday Zoe found the brass desk lamp in a second-hand shop."}'
```


Teacher Identity v1 records are also validated by `node scripts/verify-character-identities.mjs`, but this specific daily Shorts job does not generate Teacher photos.
