# Koolo Aura-2 TTS quality lab

An isolated Cloudflare Worker for generating **English and Spanish MP3** with Deepgram Aura-2 via Workers AI. POST `/tts` with `{"text":"Hello!","lang":"en","speaker":"luna"}`; the response is `audio/mpeg`. No app dependencies, and GET `/health` **does not** test live AI inference.

## Models and speaker names

| lang | Workers AI model | Speakers | Default |
| --- | --- | --- | --- |
| `en` | `@cf/deepgram/aura-2-en` | `luna`, `apollo`, `asteria` | `luna` |
| `es` | `@cf/deepgram/aura-2-es` | `aquila`, `javier`, `selena` | `aquila` |

All other languages return HTTP 400 `INVALID_LANG`; unknown/mismatched speakers return 400 `INVALID_SPEAKER`. The `speaker` request field may be omitted to use the per-language default.

## Deploy independently

From this directory, run `npx wrangler deploy --config wrangler.toml`. Enable Workers AI on the same Cloudflare account. The config includes `AI` and `TTS_RATE_LIMITER`. Namespace `100348` is dedicated to this Worker (the existing guest-trial uses another namespace). No secrets or additional dependencies.

**Deployed:** `https://koolo-tts.shanliyoung.workers.dev` — API `POST /tts` and check `GET /health`.

Smoke test, inspecting HTTP headers and output bytes:

```bash
curl -fsS -D en.headers 'https://koolo-tts.shanliyoung.workers.dev/tts' \
  -H 'Content-Type: application/json' -H 'Origin: https://koolo.app' \
  --data '{"text":"Hi, I am Zoe!","lang":"en","speaker":"luna"}' --output en.mp3
curl -fsS -D es.headers 'https://koolo-tts.shanliyoung.workers.dev/tts' \
  -H 'Content-Type: application/json' -H 'Origin: https://koolo.app' \
  --data '{"text":"¡Hola!","lang":"es","speaker":"aquila"}' --output es.mp3
file en.mp3 es.mp3
wc -c en.mp3 es.mp3
```

The standalone preview page is `web-spa/public/tts-lab/index.html`, published as `/tts-lab/` after the PR is merged and Pages is redeployed. A successful `/health` response alone is **not** proof that speech generation works.

## Security and budgeting

- Strict allowlist of `en`, `es`; 300 Unicode code points per input; 4 KiB JSON body limit.
- CORS: `https://koolo.app`, `https://www.3sssi.com`, and localhost/loopback development origins. CORS is **not** authentication and does not prevent scripted calls.
- Native Cloudflare rate-limit binding: approximately **20 calls/IP/60 seconds per Cloudflare location**, not an exact worldwide limit. Fail closed when the limiter is unavailable. Cache hits are also rate limited.
- Cloudflare Cache API: SHA-256 of **(lang, speaker, text)** for 24 hours at the edge, best-effort. New speaker = different cache entry. Invalid/error output is not cached.
- Worker requests `encoding: "mp3"` and validates the returned bytes begin with an MP3 ID3 tag or MPEG frame. Invalid audio is a 502 `INVALID_AUDIO`, and inference failures become 503 `TTS_UNAVAILABLE`.
- Cloudflare lists **Aura-2 at US$0.03 / 1,000 input characters** (approximately 2,727.27 Neurons per 1,000 characters), and Workers AI has **10,000 free Neurons/day** shared account-wide, reset 00:00 UTC. Thus **around 3,667 input characters/day** (roughly **73 distinct 50-character sentences**) before other Workers AI usage, assuming the published prices apply; plans and billing may differ. Paid usage beyond the free quota can incur charges.

## Sources

- [Aura-2 English model](https://developers.cloudflare.com/workers-ai/models/aura-2-en/)
- [Aura-2 Spanish model](https://developers.cloudflare.com/workers-ai/models/aura-2-es/)
- [Workers AI pricing/free allowance](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Cloudflare rate limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
