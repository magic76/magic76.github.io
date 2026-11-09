# Crew Teacher / Friend — keyless text practice

## Behavior

- Teacher and Friend use the existing `TextChatPanel` UI and their current persona, chosen language, and teaching-mode instructions.
- Users with their own Gemini API key keep the existing BYOK text path (including the optional Google Search grounding feature).
- Users without a key see a compact Cloudflare Turnstile gate and can start **text-only** practice without microphone permission. This includes the Android WebView shell; text discovery must not be gated by `guestTrialDiscoveryEnabled()`.
- A free session lasts 30 minutes and is stored only as an opaque ephemeral token in same-tab `sessionStorage`. Conversation content is kept in React state, not in a database. Switching modes still starts a new transcript.
- Free text uses the Gemini **generateContent** API (`gemini-3.5-flash-lite`), not the audio-only Live guest token. The voice chat continues using `gemini-3.8-live` and its existing five-minute guest flow.
- The free text allowance is **12 user messages per Taipei calendar day**, shared across Teacher and Friend for one anonymized network/browser fingerprint. Text allowance does not debit the existing three five-minute member voice grants. Free text does not include Google Search grounding; BYOK mode does.

## Security / limits

- The existing isolated `crew-guest-trial` Worker owns `/api/guest/text`. Only the official production hostname is permitted by the Worker; CORS allows only `https://www.3sssi.com`.
- Worker Secrets `GEMINI_GUEST_API_KEYS` (or legacy `GEMINI_GUEST_API_KEY`) and `GUEST_TURNSTILE_SECRET` never leave the Worker.
- Free text requires the same Cloudflare Turnstile action as the five-minute voice trial, once per 30-minute session.
- The Worker uses the already-bound `CREW_AUTH_DB` D1, lazily creating three isolated text-only tables on the first session start. It stores token hashes, salted anonymous fingerprints, expiry, and per-day integer counters — **no plaintext tokens, prompts, responses, IP addresses, or user-agent strings**.
- Hard caps: 12 generated turns per fingerprint per Taipei day, 1,500 generated turns across all free guests per Taipei day, at least 2.5 seconds between requests from one fingerprint; ten recent turns and at most 1,200 input characters per message; up to 520 output tokens.
- Upstream failures are returned as temporary service errors without revealing any credential or internal diagnostics. Failed generation attempts are refunded from the two D1 counters on a best-effort basis.
- Server-only access is required for free generation. There is no client fallback to a shared API key.

## Reply display\n\nThe free Worker REST route returns an entire generated message, not token/chunk streaming. The browser progressively reveals the returned text with the same typewriter UI used for BYOK Live; unlike BYOK Live, its first visible character starts only after REST generation completes. This is a UI presentation choice, **not a claim of real Live streaming or shared voice quota**.\n\n## Deployment and smoke checks

1. Deploy the `crew-guest-trial` Worker from `workers/guest-trial/wrangler.toml`. Confirm its current `CREW_AUTH_DB`, guest API key Secret, and Turnstile Secret binding exist. Do not introduce any `VITE_` secrets or add key values to source control.
2. Deploy Pages / the Web SPA. The web UI must show the service as temporarily unavailable until the Worker endpoint is live — no silent fallback to a hardcoded key.
3. In a browser without a local Gemini key, open `/teacher/live?chat=text` or `/friend/live?chat=text`. Verify Turnstile, start, send a message, and receive a text response without a microphone prompt.
4. Repeat inside the Android WebView. Verify the browser does not need native Android API key storage.
5. Verify an existing BYOK text user still receives replies, and that voice chat retains the original Live flow, including its guest trial and timers.
6. Confirm the text quota returns `DAILY_LIMIT` after 12 replies for the same visitor/day and does not alter `crew_guest_usage` voice counters. Check no key, transcript, IP, or user-agent content is persisted.
7. Smoke GET (cross-origin browser or curl with `Origin: https://www.3sssi.com`) at `https://crew-guest-trial.shanliyoung.workers.dev/api/guest/text` — expect `enabled:true` when all bindings are configured.
8. Run `node --test tests/guest-text-chat.test.js tests/guest-trial.test.js tests/short-chat-memory.test.js`, `npm run check:web`, `npm run build:cloudflare` before merge.

**Rollout caveat:** Initial D1 table creation takes place on first verified free-text session; a deployed Worker with a missing D1 binding intentionally returns `enabled:false`. The exact quota is a product policy, not a global financial ceiling or a guaranteed capacity promise. Monitor Gemini project charges and reduce the global cap or set `GUEST_TRIAL_ENABLED=0` if needed.
