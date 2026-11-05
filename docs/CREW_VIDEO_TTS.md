# Crew Video TTS — use the existing Crew Web Gemini key pool

**Purpose:** A trusted coding agent can add a short `main`-branch request to the public `magic76/crew-social-agent` repository, and the existing `crew-guest-trial` Worker produces Gemini 3.8 Flash TTS without seeing or copying the API key. No GitHub Actions, no new Gemini key, no webhook, no dedicated server, no new R2 bucket.

## Zero-setup authorization

The existing Worker deployment must include this feature. It already has `CREW_AUTH_DB` and `GEMINI_GUEST_API_KEYS`. **No new Gemini key, GitHub Actions Secret, webhook, Cloudflare migration command, R2 bucket, or local Agent is necessary.** The daily cap is configurable through the non-secret Worker variable `CREW_VIDEO_TTS_MAX_JOBS_PER_DAY` (set to `"20"` in `wrangler.toml`). Every five minutes the Worker checks a small JSON file on the protected `main` branch of `magic76/crew-social-agent`. Only a committed JSON with `"enabled": true` **and** a valid short TTS job authorizes paid model calls. The Worker automatically creates its dedicated D1 table upon the first approved job, not before. The existing Guest Live flow remains unchanged. 

The owner may disable further jobs at any time by setting Worker Production `CREW_VIDEO_TTS_ENABLED=0` (explicit off), or by setting the GitHub queue JSON to `"enabled": false`.

## Agent creates a new task

Update `content/video-tts/requests/index.json` **on main** in `magic76/crew-social-agent`:

```json
{
  "version": 1,
  "enabled": true,
  "jobs": [{
    "id": "crew-tts-permissions-101-20261030",
    "day": "2026-10-30",
    "voice": "Kore",
    "text": "一個帳號，需要多少權限？只給真正需要的權限。"
  }]
}
```

`day` must be today's or yesterday's **UTC** date. Add a new unique ID for each requested audio take. `text` is 10–300 characters; no API key, URLs or external files in it. Only content merged to the repo's `main` becomes eligible; the Worker never accepts arbitrary caller-supplied script text. Keep the queue index under 32 KB / 20 jobs, and prune older entries as necessary.

Every five minutes, the existing Worker checks the list (if enabled), reserves a new request in the existing D1, generates **one continuous** Gemini 3.8 Flash TTS take and saves a WAV (under 1.6 MB). Each cron invocation reserves **at most one new job**. The Worker allows **20 new jobs per UTC day** by default; set `CREW_VIDEO_TTS_MAX_JOBS_PER_DAY` to a whole number from **1 to 50** to adjust it. Missing, non-numeric, non-integer, or out-of-range values fall back to 20 (never unlimited). This is a Worker-wide UTC-day cap, not per user. The Worker never retries uncertain/failed requests automatically. Failed jobs get a terminal status; to retry deliberately, create a new ID and check Gemini billing/quota first. WAVs are deleted after seven days. This is a *small-file proof of concept*; long videos should use R2 or another media store, not D1.

## Retrieve results (read-only, no secrets)

```
https://crew-guest-trial.shanliyoung.workers.dev/api/video/tts/result?id=crew-tts-permissions-101-20261030
```

- HTTP 200: WAV download (and `x-crew-tts-seconds` header). The agent can download it, measure narration duration, synchronize subtitles and HTML scenes, and render the MP4.
- HTTP 202 with JSON `{ "status": "processing" }` or `{ "status": "failed" }`: not ready; no automatic retry.
- HTTP 404: job hasn't been accepted, expired, or the feature is disabled.

Results are **public URLs**; only post scripts that may safely be spoken publicly. No user PII or confidential scripts. The Google API key never leaves the Worker. The public GitHub `main` branch is the authorization boundary for *creating* a task; anyone can access a finished nonsecret WAV if they know its ID. Lock down repo write permissions and protect the default branch.

## Safety / limitations

- Existing Guest Live Token endpoint (`/api/guest/token`) and its quotas, Turnstile, OAuth and browser path remain unchanged.
- Worker is idle with no approved GitHub queue jobs; an explicit `CREW_VIDEO_TTS_ENABLED=0` stops further processing. New jobs auto-create their isolated D1 table; D1 errors fail closed without affecting the Live guest trial.
- Default maximum 20 new jobs per UTC day across the Worker (not per user); configurable to 1–50 with `CREW_VIDEO_TTS_MAX_JOBS_PER_DAY`. Each is at most 300 characters; no API key returned to clients. This limits request count but **is not a spending cap**. Set a budget and **budget alerts in Google Cloud Billing** before enabling production synthesis; alerts notify you but do not automatically stop charges.
- D1 audio storage has a 2 MB row limit, so files above 1.6 MB are rejected and marked failed, not truncated. For long episodes use R2, not this proof of concept.
- Cron itself consumes Cloudflare Worker execution and D1 read requests. It does not consume **GitHub Actions** runner minutes.
- No generated Gemini audio exists until the Worker deploys the new code and an authorized GitHub job actually completes. Do not claim publication or actual Gemini voice QA before validating a real WAV.

Gemini TTS docs: https://ai.google.dev/gemini-api/docs/speech-generation
Cloudflare D1 limits: https://developers.cloudflare.com/d1/platform/limits/
## Failed job diagnosis and controlled recovery

After deploying the corresponding Worker code, HTTP 202 for a failed job returns a **sanitized** `error_code` along with `status: "failed"`. Examples: `upstream_429` (upstream rate/quota), `upstream_5xx` (provider failure), `upstream_timeout` (timeout), `bad_wav_length` (more than 31 seconds), `audio_too_large` (over 1.6 MB), or `internal_error` (unclassified; does not expose raw provider messages). No API keys, raw response bodies or stack traces are returned. Previously failed records can be diagnosed after this Worker code is deployed, while their D1 rows remain within the seven-day retention window.

For the original, more specific cause, an authorized Cloudflare operator may query **only that job** from the existing remote D1 database without printing any keys:

~~~sh
npx wrangler d1 execute crew-auth --config workers/guest-trial/wrangler.toml --remote \
  --command "SELECT id, status, error, created_day, seconds FROM crew_video_tts_jobs WHERE id='crew-tts-agile-deliberation-20261106' LIMIT 1"
~~~

Do not print the full Worker environment, request headers or secrets. One failed job ID is terminal and intentionally not retried automatically. Check the code / D1 cause and Gemini billing/quota, then deliberately authorize a **new** ID only when safe. For `bad_wav_length` / `audio_too_large`, split the narration into separately authorized short segments (ideally well below 31 seconds) and concatenate only after checking every real WAV and its timing. Do not report a video as completed until MP4 and audio/subtitle QA pass.
