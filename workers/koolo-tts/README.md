# Koolo MeloTTS quality lab

A **standalone** Cloudflare Worker for POST /tts: JSON body { "text": "Hello!", "lang": "en" }, returning audio/mpeg MP3. Supported lang: en, zh, ja, ko, es, fr. GET /health only checks the Worker handler and does **not** validate the AI model.

## Deploy

From this directory: npx wrangler deploy --config wrangler.toml. Enable Workers AI for the account; bindings AI and TTS_RATE_LIMITER are declared in the config. The rate limiting namespace 100348 must not be reused by another Worker. No secrets or extra dependencies are needed. Deploy independently of Pages/guest-trial.

Example: curl -fS 'https://koolo-tts.shanliyoung.workers.dev/tts' -H 'Content-Type: application/json' -H 'Origin: https://koolo.app' --data '{"text":"Hi, I am Zoe!","lang":"en"}' --output zoe.mp3

## Guardrails and limitations

- Up to 300 Unicode code points per request, strict language allowlist, 4 KiB JSON request body ceiling.
- CORS allowlist: https://koolo.app, https://www.3sssi.com, http(s)://localhost[:port], http(s)://127.0.0.1[:port], http(s)://[::1][:port]. CORS is browser isolation **not** authentication; non-browser clients can spoof Origin.
- Cloudflare rate limit binding: **approximately** 20 requests/IP/60 seconds **per edge location**, not a global hard quota. NAT users may share the IP quota. Limiter failure returns 503 (fail closed).
- Edge Cache API: SHA-256 of (lang,text) as a synthetic GET key, 24-hour TTL, best-effort per edge location. Cache hits still count toward rate limits. The original text is not embedded in the cache URL.
- Model errors return 503 TTS_UNAVAILABLE, never fabricated audio. The free Workers AI quota is **10,000 Neurons per day** (resets 00:00 UTC); MeloTTS is listed at **18.63 Neurons per generated audio minute**. At 10 seconds per clip this is *theoretically* ~3,220 distinct clips per day, before any other Workers AI usage; actual duration varies. Paid plans may incur charges beyond the free daily quota. Free Workers plan cannot exceed the quota.
- **Critical 2026-11-23 warning:** Cloudflare lists MeloTTS as **planned for deprecation on 2026-11-20**. Model availability is unconfirmed; the Worker may return TTS_UNAVAILABLE. Do not build a production dependency until real audio tests pass.

Docs: [Model](https://developers.cloudflare.com/workers-ai/models/melotts/), [Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/), [Rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
