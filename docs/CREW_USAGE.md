# Crew Web anonymous usage analytics

Production: https://www.3sssi.com
Implementation: web-spa/src/analytics/ and functions/api/usage/
Private dashboard: https://www.3sssi.com/usage (after setup)

## Events and privacy

The first-party tracker sends event names with anonymous random browser UUID and random tab-session ID, and for Fortune an enum (bazi/tarot/vedic). It never sends transcripts, recordings, user utterances, story titles, birth details, Gemini keys, emails, or IPs. Server rejects all unknown event fields as stored data (only allowlisted event, ID and enum are persisted).

- app_opened: once per browser tab session
- visitor_first_seen: new random browser UUID
- user_returned: the same browser UUID returned on a later UTC date
- teacher_conversation / friend_conversation: a completed exchange has BOTH nonempty user and model speech text
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

Cloudflare Web Analytics stays installed and continues handling visits/referrals. The Usage Dashboard ONLY displays first-party successful interaction events.

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
- Open Live without a key: emits gemini_key_missing. Complete one TWO-SIDED exchange with Teacher/Friend: emits corresponding conversation event, not on merely opening page.
- Load a book and stay 15 seconds or turn a page: story_reading. Successful Fortune calculation: fortune_calculated.
- With /settings?crewDev=1 enable Developer Test Mode, then reload: no further usage requests. With analytics opt-out (Settings) also no requests.
- Unauthenticated requests to /api/usage/report must return 403, including forged Cf-Access-Jwt-Assertion values. Only signed-in owner should see /usage data. Query returns aggregate counts, not individual UUIDs.
- Test 7/30 day filters and mobile layout. Preview /pages.dev should never emit events.
- Queries start from deployment and first writes; the past Cloudflare visit count CANNOT be backfilled.

## Limits and operations

Anonymous action events remain falsifiable; Origin check, user-agent filter, optional Cloudflare bot score, and browser dedup are defense-in-depth, not authentication. Add Cloudflare WAF rate limiting for /api/usage/event if abused. At high volume the analytics engine may sample events; distinct browser counts are estimates and summing per-event or per-day distinct counts does not produce the global distinct count.

Official docs:
- https://developers.cloudflare.com/pages/functions/bindings/
- https://developers.cloudflare.com/pages/functions/routing/
- https://developers.cloudflare.com/analytics/analytics-engine/sql-api/
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
