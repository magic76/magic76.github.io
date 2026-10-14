# Firebase AI Logic Web guest voice pilot

Owner: Crew Web (`magic76/magic76.github.io`); existing Teacher/Friend behavior remains owned by Android `magic76/crew-teacher`. This is an **isolated experimental demo**, not a replacement for the existing Live runtime and not a product-parity change.

## What this PR actually adds

- Optional `/teacher/guest-live` React route with Crew Teacher / Zoe sample prompts, browser-managed bidirectional Gemini Live audio, manual stop, three-minute timeout and a local three-sessions-per-day **soft** counter.
- When configured and enabled, `/settings` offers this demo to people who have no personal Gemini API key.
- Existing full Teacher/Friend, memory, reports, roleplay, camera, other apps and BYOK transport are unchanged.
- Disabled by default. Nothing calls Firebase until the user visits the pilot and presses **Start**. Browser permissions are requested by the SDK when audio begins.
- Uses Google's pinned Firebase Web CDN modules on the **optional** page rather than changing the npm dependency lockfile. Firebase Live Web is **Public Preview** and may change incompatibly.

The demo does **not** yet support recording transcripts, lesson reports, long-term memories, exact role voice parity or the existing strict button-only interruption mode. Do not advertise those capabilities on this route.

## Local-only smoke test without reCAPTCHA on the deployed site

This PR supports Firebase App Check **debug mode only under Vite's `localhost` or `127.0.0.1` development server**. It cannot be enabled on production or Cloudflare Preview. To test before setting up a production reCAPTCHA Enterprise site key:

1. Under the Firebase Console's **Security > App Check > Apps**, ensure your Firebase **Web app is registered** with App Check. If it is not registered, the Console may require you to complete Web-provider registration first; just enabling Firebase AI Logic is not enough.
2. Create `web-spa/.env.local` (or run Vite with equivalent environment variables) with your public `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_PROJECT_ID=crew-e13f9` and `VITE_CREW_GUEST_TRIAL_ENABLED=1`. Do **not** add a `VITE_FIREBASE_APP_CHECK_SITE_KEY` just for local debug. Ensure the env file is gitignored and **never** store your private Gemini API key here.
3. From the repository root run `npm ci && npm run dev:web`. Open the localhost URL printed by Vite, then navigate to `/teacher/guest-live`, open DevTools Console, and click **準備連線**. Firebase should log a debug token during the initialization.
4. Look for `AppCheck debug token: ...`. In Firebase Console > Security > App Check > Apps, use the Web app's **⋮ > Manage debug tokens** to register that **private** token. Do not put it in GitHub, this repo, Cloudflare, or a public chat.
5. Retry in the same browser: click **準備連線**, wait for **啟動麥克風**, then click that second button. Two clicks are intentional so microphone activation happens directly within a user gesture. Verify capture, Gemini voice response, stop/cleanup, and local trial limit. Confirm Firebase AI Logic's App Check API status is **Enforced**.

Debug-mode tokens are a trusted-testing escape hatch, **not** a substitute for real-site App Check. On www.3sssi.com the pilot remains **disabled** while the reCAPTCHA site key is missing, regardless of `VITE_CREW_GUEST_TRIAL_ENABLED`. Do not disable enforcement or publish a debug token to work around it.

## Configuration (manual; NOT completed by this PR)

1. Create a **separate Firebase project on Spark (no billing account)** for the pilot. Firebase Console → Build → AI Logic → Get started → **Gemini Developer API** backend. Firebase AI Logic handles the Gemini provider integration behind its gateway. Do **not** paste your private Gemini Developer API key into Vite env, GitHub, HTML, `localStorage` or a public Firebase document.
2. Register a **Web app** in that project. Add public Web config to Cloudflare Pages build variables (Production and optionally Preview). These values are intentionally browser-visible and **are not the same as a private Gemini API key**:
   - `VITE_FIREBASE_API_KEY`: Firebase Web app apiKey
   - `VITE_FIREBASE_APP_ID`: Firebase appId
   - `VITE_FIREBASE_PROJECT_ID`: Firebase projectId
3. In Google Cloud, create **reCAPTCHA Enterprise score-based Web site key** for `www.3sssi.com` (and only explicitly needed trusted preview hosts); register the Web app in Firebase Security → App Check with that key. Set `VITE_FIREBASE_APP_CHECK_SITE_KEY` to the **public reCAPTCHA site key**. Do not add unrestricted localhost to a production reCAPTCHA key; use a separate Firebase debug application / debug token if local development requires it.
4. Check legitimate App Check requests and **ENFORCE App Check on Firebase AI Logic before exposing a public trial**. Unenforced App Check does not protect against unauthorized API calls.
5. Set the Firebase AI Logic per-user RPM quota **much lower than the default 100**, and set conservative provider project limits. Monitor provider quota/errors in Google Cloud. The per-user Firebase AI Logic limit covers requests/minute, **not a 3-per-day quota and not guaranteed Live session minutes**.
6. Only after steps 1–5 and small-scale manual checks, set `VITE_CREW_GUEST_TRIAL_ENABLED=1` in Cloudflare Pages and redeploy. With the flag unset, the new entry is hidden; direct pilot URL displays an unavailable message.
7. Test Safari/Chrome on desktop and Android Chrome: App Check verification, microphone prompt, teacher and Zoe speaking, stop + microphone release, 3-minute timeout, a 4th local session blocked, no-key vs BYOK settings, Android/Web teacher contract tests, preview host behavior and error handling. Verify AI costs remain on the trial Firebase project and existing BYOK remains untouched.

## Security & budget limitations

Firebase Web config keys are *public identifiers*, NOT developer Gemini secrets. Firebase AI Logic is a provider proxy: the developer's provider credential must never be shipped to the browser.

The local demo counter can be bypassed by clearing storage, using private windows/other devices, or calling the Firebase AI Logic gateway directly from a verified application. **It does not enforce billing limits.** App Check is an app attestation control, not authentication, an account quota, or a guaranteed anti-bot mechanism. **Cloud Billing budget alerts are not hard spending caps.** Use an unbilled Spark project for the first public pilot. If a paid Gemini plan is later required, design a trusted server-side admission/quota system that actually controls Gemini credential use (and accounts for already-issued Live sessions), plus an independent project-wide kill switch, before enabling paid traffic.

Firebase AI Logic Live Web's browser-managed audio currently does not offer all controls required by Crew's custom Live runtime. In particular, don't promise strict manual-only interruption or shared memory. A future cross-platform parity implementation must first update Android's canonical contract when shared role behavior changes.

## References

- https://firebase.google.com/docs/ai-logic/live-api
- https://firebase.google.com/docs/ai-logic/app-check
- https://firebase.google.com/docs/ai-logic/quotas
- https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider
- https://firebase.google.com/docs/web/alt-setup
- Android draft: https://github.com/magic76/crew-teacher/pull/107
