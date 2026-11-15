# Crew Web anonymous usage analytics

> Cloudflare 金鑰與 Binding 維運手冊：[CLOUDFLARE_KEYS.md](CLOUDFLARE_KEYS.md)。此文件僅記錄變數用途，不存任何 Secret 值。


Production: https://www.3sssi.com
Implementation: web-spa/src/analytics/ and functions/api/usage/
Private dashboard: https://www.3sssi.com/usage (after setup)

## Events and privacy

The first-party tracker sends event names with anonymous random browser UUID and random tab-session ID, and for Fortune an enum (bazi/tarot/vedic). It never sends transcripts, recordings, user utterances, story titles, birth details, Gemini keys, emails, or IPs. Server rejects all unknown event fields as stored data (only allowlisted event, ID and enum are persisted).

- app_opened: once per browser tab session
- visitor_first_seen: new random browser UUID
- user_returned: the same browser UUID returned on a later UTC date
- teacher_conversation / friend_conversation / timeline_conversation: a completed exchange has BOTH nonempty user and model speech text
- teacher_conversation_start / friend_conversation_start / timeline_conversation_start: connected session, may not yet have exchanged speech
- teacher_user_spoke / friend_user_spoke / timeline_user_spoke: first transcript after Live connects (once per conversation, no transcript data)
- teacher_ai_replied / friend_ai_replied / timeline_ai_replied: first AI transcript after learner speech; proactive AI greetings do not count
- timeline_view: enter a life timeline (fixed fictional-character enum mira/ethan/hana)
- game_open / game_started / game_completed: enter game page, begin actual gameplay, and finish round (fixed allowlisted game kinds)
- teacher_session_end / friend_session_end: duration bucket (under_1m / from_1_to_3m / from_3_to_10m / over_10m); deliberately no raw speech or audio duration beyond bucket
- vocabulary_practice: a vocabulary answer was submitted, not merely the page opened
- textbook_open: textbook page opened; textbook_study: Live voice session actually reached connected/listening or speaking state
- story_reading: dwell 15 seconds on a loaded book or advance to another page
- story_narration: Live story has model text output
- story_created: generated story saved
- fortune_calculated: deterministic reading calculation succeeded
- fortune_ai_interpreted: Gemini interpretation succeeded
- gemini_key_missing: attempted Live without a key
- gemini_key_verified: verified key saved

Data retention: up to 3 months in Cloudflare Analytics Engine.
A random browser UUID is pseudonymous, not a distinct real human. Browsers can clear it, use different devices, or block storage. Backend analytics can also be spoofed by automated clients. Neither browser tracking nor a page visit proves a real person chatted with Crew.

Browser respects Global Privacy Control and Do Not Track. Settings includes opt-out and deletes usage identifiers. URL /settings?crewDev=1 reveals a persistent Developer Test Mode checkbox. Enable it BEFORE testing to exclude subsequent analytics. It is intentionally not shown to ordinary users. Preview sites, GitHub Pages, localhost, and known automated tools do not send events.

Cloudflare Web Analytics stays installed and continues handling visits/referrals. The Usage Dashboard displays first-party effective interactions, cross-period deduplicated chat browser counts, segmented trends, Timeline, Shorts and game engagement, and separate entry/session metrics. Android Firebase Analytics is NOT combined with this Web dashboard, because Android and Web do not share identity or collection backends.

## Google Analytics 4 (GA4) Web stream

- Property's **Web** stream Measurement ID: `G-563JSM2X68`. Android retains its separate **Android** Firebase Analytics data stream in the GA4 property. Data streams share the GA4 reports, but no cross-device user identity is inferred.
- `web-spa/src/analytics/ga4.ts` loads `gtag.js` only on production `www.3sssi.com` or `3sssi.com` when anonymous usage analytics is enabled and GPC/DNT or Developer Test Mode are not active. It does **not** load on local/preview/GitHub Pages sites. Existing Cloudflare Analytics Engine collection remains independent.
- Analytics setting in `/settings` controls both first-party Cloudflare **custom usage events** and GA4. Turning it off sets the Google `ga-disable-G-563JSM2X68` flag and denies `analytics_storage`; existing Google Analytics cookies may remain until browser site data is cleared. Google's tag is not added for visitors already opted out. **Separate Cloudflare Web Analytics/RUM site-performance beacons may remain active**; they are not controlled by this app-level opt-out setting.
- GA4 may use browser analytics cookies and pseudonymous usage/device data. No app-generated visitorId/sessionId is forwarded to Google; GA4 custom events use only the fixed `crew_<event>` name, `crew_platform=web`, optional allowlisted `crew_detail`, and safe page paths. No speech, user-supplied text, API keys, raw dynamic IDs, arbitrary query strings, or fragments are sent by our custom events.
- Google advertising data collection features are disabled (`allow_google_signals=false`, `allow_ad_personalization_signals=false`, advertising consent denied).
- React Router manually sends `page_view` on route changes with a sanitized path. Only safe, short ASCII campaign labels from `utm_source`, `utm_medium`, `utm_campaign`, `utm_id`, `utm_content`, and `utm_source_platform` are retained on the initial landing URL (including any product event emitted before the first pageview). Never forward arbitrary query parameters, `utm_term`, click IDs, fragments, or raw dynamic route IDs. Repeated parameter keys and nonconforming labels are rejected. Label values must not encode personal data.
- GA4 receives only an external referrer's public site origin (scheme and hostname, no user info, path, query, fragment, or port); internal referrers are ignored. Subsequent SPA `page_view` events use the previous sanitized route as the referrer. `send_page_view=false` suppresses the Google tag's initial pageview; **GA4 Enhanced Measurement must also have automatic 'Page changes based on browser history events' turned OFF** in the Web stream settings, otherwise GA4 independently sends duplicate pageviews and could transmit unsanitized URLs.
- Source/medium reporting in GA4 should use Traffic acquisition with the Web data stream; existing historical events cannot be reattributed by this code change.
- This adds a third-party analytics destination; review the site's privacy/cookie notice and any jurisdiction-specific consent requirements before broad promotion. Google's Consent Mode flags alone do not create a visitor consent banner.

### GA4 validation

1. Google Analytics → Admin → Data streams → **Crew Web** (`G-563JSM2X68`) → Enhanced Measurement gear: turn **Page changes based on browser history events** OFF; leave manual `page_view` active via Crew Router.
2. Open `https://www.3sssi.com/teacher/` in an ordinary non-DNT browser, with **Settings → Anonymous product usage** enabled and Developer Test Mode disabled.
3. Chrome DevTools → Network: verify request for `googletagmanager.com/gtag/js?id=G-563JSM2X68`, and `google-analytics.com/g/collect` with `tid=G-563JSM2X68`. Blocking extensions may suppress these requests.
   To verify attribution, open `https://www.3sssi.com/teacher/?utm_source=threads&utm_medium=social&utm_campaign=crew_launch` in a new test session, and inspect the first GA4 request: `page_location` must contain only these campaign labels, not unrelated/private query fields. A real external referrer must be reduced to its origin. Test Mode must remain **OFF** for this check, then enable it for ordinary development testing.
4. GA4 → **Reports → Realtime**, look for Web stream `page_view`. Navigate to `/teacher/vocabulary`, answer a question and verify custom event `crew_vocabulary_practice` appears in Realtime / DebugView (debugging support may need Debugger enabled).
5. Disable anonymous usage in Settings and confirm new GA4 traffic stops. With DNT/GPC or Developer Test Mode, GA4 should not load at all on a new browser session.
6. Past Web usage cannot be backfilled; GA4 Web events begin after this code reaches the production deployment. Custom parameters may require GA4 custom dimensions for reporting.

## Cloudflare production configuration

1. Workers & Pages → magic76-github-io → Settings → Bindings → Add → Analytics Engine:
   - Variable name: ANALYTICS_ENGINE
   - Dataset: crew_usage
   - Environment: Production
   - Dataset is created on first successful write.
2. Production Pages Git integration must deploy the root functions directory with dist output. dist/_routes.json invokes Functions ONLY on /api/usage/*, not static or SPA URLs.
3. Create a Cloudflare account-scoped API Token with Account → Account Analytics → Read.
4. Set these Production environment values and secrets:
   - CREW_USAGE_ACCOUNT_ID: your 32-hex-character Cloudflare account ID
   - CREW_USAGE_SQL_TOKEN: the READ-ONLY API Token (secret, never public or VITE_)
   - CREW_USAGE_ACCESS_ISS: your Zero Trust team domain, e.g. https://myteam.cloudflareaccess.com
   - CREW_USAGE_ACCESS_AUD: the Application Audience AUD tag of the app protecting /api/usage/report
   - CREW_USAGE_ADMIN_EMAIL: exact owner login email (case-insensitive)
5. Zero Trust → Access → Applications → Add a self-hosted app with allowed email only. Protect BOTH:
   - www.3sssi.com/usage* (private dashboard)
   - www.3sssi.com/api/usage/report (private report API)
   Prefer one Access application with both paths and one AUD. If using separate Access apps, use the API app's AUD in CREW_USAGE_ACCESS_AUD.
   DO NOT protect /api/usage/event or the entire site. The report function independently verifies the Access JWT signature against rotating JWKS, issuer, audience, expiration, and exact admin email.
6. Redeploy Production after adding Bindings and secrets.

Review site privacy policy and consent requirements for the intended audience before promoting.

## Smoke checks

- On production normal browser, Network should show POST /api/usage/event → 204 after opening Web. If Binding missing it returns 503; product still works.
- Open Live without a key: emits gemini_key_missing. Connected Live sends teacher_conversation_start/friend_conversation_start; only a TWO-SIDED exchange emits teacher_conversation/friend_conversation. Ending a session sends a duration bucket.
- Answer a vocabulary question: vocabulary_practice; open textbook: textbook_open; begin connected textbook voice: textbook_study. Load a Story book and stay 15 seconds or turn a page: story_reading. Successful Fortune calculation: fortune_calculated.
- With /settings?crewDev=1 enable Developer Test Mode, then reload: no further usage requests. With analytics opt-out (Settings) also no requests.
- Unauthenticated requests to /api/usage/report must return 403, including forged Cf-Access-Jwt-Assertion values. Only signed-in owner should see /usage data. Query returns aggregate counts, not individual UUIDs.
- Test 7/30 day filters and mobile layout. Preview /pages.dev should never emit events.
- Queries start from deployment and first writes; the past Cloudflare visit count CANNOT be backfilled.

## Crew Souls Explore launch (November 4, 2026)

Crew Souls now appears in the public Explore grid at `/souls` with a local 3:2 WebP illustration matching the other Explore destinations and a click event. It does not send photo content, fictional character names, personal portraits, memories, voice transcripts or Gemini keys to analytics.

The existing opt-out / Global Privacy Control / Do Not Track / Developer Test Mode gates remain in force. The production-only client and ingestion allowlists accept both `www.3sssi.com` and `3sssi.com`; all other hosts and cross-origin posts are rejected. No extra database, third-party tracking library or analytics credential is required.

- `explore_entry_click` with detail `souls`: visitor taps the Explore tile (also contributes to generic Explore entry counts).
- `souls_open`: browser opens the Souls interface, including returning to an existing collection.
- `souls_photo_ready`: selected camera/gallery image was processed successfully on-device; **not** merely clicking a picker.
- `souls_created` with fixed detail `object` or `person`: a Soul was successfully saved locally; no identifier or label goes to analytics.
- `souls_live_attempt`: microphone setup or transport connection was attempted.
- `souls_live_connected`: Gemini Live reached listening/speaking state. **Connecting alone is not a verified conversation**.
- `souls_live_failed`: Live enters an error state (without error text, technical failure details or any user content).
- `souls_user_input`: the user spoke or an accepted text message entered Live. Only this boolean event is sent; no words.
- `souls_ai_replied`: a confirmed transcript turn contains both meaningful user input and AI output; proactive AI-only greetings are excluded.
- `souls_conversation`: one verified same-turn user + AI exchange, at most once per mounted Soul view. Guest mode still updates the confirmed `live.turns` even if callbacks are disabled, so both guest and BYOK count without sending text. This is counted in effective chat-browser totals.
- `souls_mask_repaired`: a manual cutout repair was applied; no mask pixels sent.

The private `/usage` dashboard has a Souls category and a dedicated Explore → photo → save → Live attempt/connection → user input → AI reply → two-sided exchange stage panel, plus connection failure and repair counts. `souls_ai_replied` and `souls_conversation` are intentionally triggered by the same first verified exchange and can therefore have equal totals. These are **independent event totals**, not a user-level cohort conversion funnel. Category breakdown only applies to `souls_created`; no photo type, biometric data or private attributes are inferred. GA4 uses names `crew_souls_open`, `crew_souls_photo_ready`, `crew_souls_created`, `crew_souls_live_connected`, and `crew_souls_mask_repaired` with safe, static `/souls` page path. Older traffic cannot be backfilled.

## Product interaction refresh (October 25, 2026)

- The TypeScript `UsageEvent` / `Detail` vocabularies in `web-spa/src/analytics/usage.ts` are kept in parity with the Cloudflare ingestion allowlists by `tests/crew-usage.test.js`. A new event/detail is not deployable unless **both** sides accept it.
- `game_*` now accepts the established `nonsense` and `crazy-court` details (plus `werewolf`), which were previously dropped at ingestion. The private dashboard includes these game kinds.
- `home_entry_click` and `explore_entry_click` record fixed navigation category enums, never destination URLs, tracking parameters or dynamic slugs.
- Town 3D tracks entry, person/place interaction, chat handoff click, and 3D fallback (coarse `unsupported`, `manual`, or `render_error`).
- Magic tracks entry, successful world actions, challenge/panel selections, Live connection success/failure, 3D fallback, and confirmed reset. It never records user wishes, utterances, model output, or command args.
- Mate tracks entry, successfully organized briefing, Live handoff connection, completed handoff, and connection error; not task contents, private restrictions, external participants, or transcripts.
- Briefing tracks article open after the article loads, explicit save/mark-read and source click; no article IDs, titles or URLs. Circle tracks thread open and successful post/comment with only `demo` / `live` enum.
- The `/usage` dashboard displays separate feature usage and diagnostic events. Entrance/click steps are **event totals, not same-user conversion**; reporting also compares deduplicated browsers for the active-event definition. Demo Circle events are not proof of public posting.
- GA4 manual page paths allow only fixed route segments (including `/town`, `/magic`, `/mate`, and the published games); unknown dynamic content remains `item`. Verify automatic Enhanced Measurement history-page tracking remains disabled to avoid duplicate pageviews.
- These metrics begin after deployment; historical missing interactions cannot be recovered. The existing opt-out, GPC/DNT and production-only collection behavior are unchanged.

## Limits and operations

Anonymous action events remain falsifiable; Origin check, user-agent filter, optional Cloudflare bot score, and browser dedup are defense-in-depth, not authentication. Add Cloudflare WAF rate limiting for /api/usage/event if abused. At high volume the analytics engine may sample events; distinct browser counts are estimates and summing per-event or per-day distinct counts does not produce the global distinct count.

Official docs:
- https://developers.cloudflare.com/pages/functions/bindings/
- https://developers.cloudflare.com/pages/functions/routing/
- https://developers.cloudflare.com/analytics/analytics-engine/sql-api/
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/

## Usage dashboard P0/P1 (October 2026)

`/usage` remains owner-only via Cloudflare Access, with no new storage provider. Report SQL now queries period-wide `COUNT(DISTINCT blob2)` for active and chatting browsers, plus per-event distinct browsers. **Do not sum daily or per-role unique counts**: a browser can chat with both teacher and friend. Prior-period comparisons are previous 7 days versus latest 7, or previous 30 versus latest 30; both must use the same definition and are approximate if Analytics Engine samples.

The four chat funnel stages are **event counts, not a joined cohort**: connected, first learner speech, first AI reply after the learner, and completed two-sided exchange. They are not an accurate conversion rate between identical individual sessions. Old data cannot be backfilled and browsing without a real interaction is not "effective use".

A game `game_open` indicates a loaded route, `game_started` a valid actual play action or start button, and `game_completed` a finished round. Values in `detail` are fixed game kind enums only; no secret words, move positions, answer texts, player names or IDs are sent. Timeline detail is limited to the three public fictional-character codes, never age or personal notes.

Web usage is strictly separate from Firebase Android GA4; never add their unique-user counts or infer cross-device identity. The GA4 web stream mirrors permitted first-party event names but its User counts may differ due to browser consent, blockers and sampling.


## Guest Trial usage (Phase 2)

Crew's existing private `/usage` dashboard shows the five-minute Teacher/Friend trial funnel, including entry, start, successful short-lived token, actual Live connection and conversation end. It also shows basic failure categories and duration buckets. The chart supports the existing 7/30-day selection. A verified two-sided guest trial turn also emits the existing `teacher_conversation` or `friend_conversation` event once per trial session. These events contribute to period-wide distinct chat-browser counts and effective conversation event totals; `guest_trial_connected` alone does not prove a conversation. Guest mode still suppresses page callbacks and does not save personal chat history, speech text, or memory.

All guest trial events go through the existing consent-aware first-party `trackUsageEvent` pipeline, the same `ANALYTICS_ENGINE` binding and the existing Cloudflare Access-protected read endpoint; **no new environment variables or D1 database are needed**.

These metrics are browser-side and may omit users who opt out or leave before sending the event. They are not accurate account-specific limits, authenticated user counts or billing totals. Phase 3 will implement login and server-enforced counting separately. No historic counts can be recovered.

## Guest trial Phase 2 usability update (October 28, 2026)

The existing /usage dashboard now includes a prominent link to the Guest Trial section, four headline metrics (eligible entry, click start, browser-reported token issuance, Live connected), and approximate stage-to-stage **event-total ratios**. These ratios must never be represented as distinct-person conversion rates or as audited issuance totals.

The new `guest_trial_unavailable` event counts failed/disabled discovery in the ordinary production Web experience. It does not capture private configuration reasons or record availability on Android where discovery is intentionally disabled. Analytics keeps the same consent/opt-out protections. Cloudflare Pages needs redeploying for the new event to be accepted by /api/usage/event; the separate guest Worker does not need redeployment.

Operational checks: verify `POST /api/usage/event` returns 204 for permitted browsers, log in through Cloudflare Access to `/usage`, and select the 7/30-day view. The read-only report needs `CREW_USAGE_ACCOUNT_ID`, `CREW_USAGE_SQL_TOKEN`, `CREW_USAGE_ACCESS_ISS`, `CREW_USAGE_ACCESS_AUD`, and `CREW_USAGE_ADMIN_EMAIL` in Pages Production. Without these, the private dashboard cannot query totals.

## Anonymous usage journey (October 31, 2026)

The owner-only `/usage` screen now displays a five-stage **non-cohort** journey for 7/30 days: site opened, clicked a recorded entry, started an activity, recorded actual engagement, and returned on a later UTC day. Stage metrics are counted independently across distinct random browser IDs for the entire selected period, using Analytics Engine SQL with `COUNT(DISTINCT blob2)`. The new entry and start union queries aggregate **inside** Cloudflare; they return only numeric counts. No per-visitor data, speech, full URLs, account records, or additional D1 tables are sent to the dashboard.

- Open: `app_opened` (unique browsers with an opening event).
- Click: union of `home_entry_click`, `explore_entry_click`, `shorts_chat_click`, `guest_trial_start_click` (now also tracks HomePortal CTA).
- Start: union of `teacher_conversation_start`, `friend_conversation_start`, `timeline_conversation_start`, `game_started`, `textbook_study`, `mate_handoff_started`, `magic_voice_connected`, and `story_narration`.
- Engage: existing `activeUsers` definition, including accepted story, fortune, vocabulary, game, research, world and chat activity (not strictly "completion").
- Return: `user_returned` (the same anonymous browser identifier has opened Crew on a different UTC date; it is **not** D1 retention).

**Interpretation:** These are not sequential events for the *same* visitors; do not calculate stage-to-stage conversion or next-day retention from them. Visitors can arrive directly at deep links, start an activity without clicking an instrumented CTA, or use Crew before the reporting window. Stage counts can increase between steps. Privacy opt-out / DNT / GPC remain in effect. Missing historical events cannot be backfilled. The existing Cloudflare Access JWT verification and 7/30-day bounds remain unchanged; no extra setup is required.

See `tests/crew-safe-update-journey.test.js` and `tests/crew-usage.test.js`.

## Platform-specific Web events (November 15, 2026)

- Every consent-eligible first-party event includes the fixed enum `platform: web | pwa | android_shell`, independently of the semantic `detail`. Neither raw UA nor private content, IP, or a device identifier is sent. Analytics Engine stores it as `blob5`. Old clients can omit `platform` and are stored as `legacy`.
- Classification priority: known `CrewAndroidShell/1` WebView marker, then standalone PWA display-mode or iOS `navigator.standalone`, then ordinary browser. This is client-observed context, not authenticated App identity or proof of installation.
- `/usage` queries period-wide distinct anonymous browsers by platform for opens, effective use, completed two-sided chats, game completion and cross-day return. Existing 7/30-day headline totals remain intact; platform counts cannot be added to infer distinct humans or a real retention cohort.
- **Old events have no platform label; they are not backfilled or assumed to be ordinary Web.** The panel only reflects events after rollout.
- The Android App column reports **only first-party WebView events reaching the Web endpoint**. Android Firebase native analytics remain a separate data source, not joined or added to `/usage`. A zero does not mean nobody used the Android App. GA4 `crew_platform=web` continues to indicate the Web stream, not this launch surface.
- JSON export and copied summary include the strict platform aggregate allowlist. CSV retains its event-row schema and excludes platform rows; use JSON for the breakdown.
- Opt-out, GPC/DNT, Developer Test Mode, production restrictions and Cloudflare Access checks remain unchanged.
