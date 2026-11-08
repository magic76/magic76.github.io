# Crew Web user feedback
Visitors reach `/feedback` through the global footer or hamburger menu. It supports problem reports, feature ideas and other comments. Only the submitted message, optional contact email, category, and **pathname** (not query strings, fragments, keys, chat data, recordings, or analytics IDs) are sent to the private GitHub issue tracker.

## Required Cloudflare Pages variables / secrets
Set all three under Cloudflare Pages project > Variables and Secrets:
- `FEEDBACK_GITHUB_TOKEN`: encrypted fine-grained GitHub PAT, **Issues: Read and write** only on `magic76/magic76.github.io`. No Contents permission.
- `FEEDBACK_TURNSTILE_SITE_KEY`: public Cloudflare Turnstile site key configured for each allowed site hostname.
- `FEEDBACK_TURNSTILE_SECRET`: encrypted matching Turnstile secret.

The form fails closed until configured: GET returns `enabled:false` and the UI offers a clearly marked `mailto:crew@3sssi.com` fallback. The user must send that email themselves. On success, the form displays a private reference `FB-<issue-number>`, never a public link into the private repository.

POST verifies the same-origin request, field sizes, challenge result and hostname before creating an issue. Add a Cloudflare WAF rate-limit rule on `POST /api/feedback` for defense in depth. Issues start with `[user-feedback]` and are intentionally **not** auto-labelled `ux-auto`; manually review and confirm reports before routing them into scheduled fixes.

## Checks
`node --test tests/crew-feedback.test.js`, `npm run check:web`, `npm run check:i18n`, `npm run build:cloudflare`. Live Turnstile and GitHub submission require the secret configuration; test normal flow, expiration, failure retry, 390px mobile, Android WebView, source-path privacy, and mail fallback.
