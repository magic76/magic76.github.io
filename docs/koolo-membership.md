# Koolo membership foundation (no payment activation)

This first PR is a **read-only** membership foundation. It does not enable paid access, charge users, or grant a plan based on client claims.

## Deployment
1. Apply `migrations/crew-auth/0003_membership.sql` and then `migrations/crew-auth/0004_subscription_lifecycle.sql` to the existing `CREW_AUTH_DB` D1 database.
2. Deploy Pages; `GET /api/membership` reads the existing secure session cookie.
3. Logged-out requests return 401, unavailable D1/schema returns 503. New users without a membership row are Free.
4. Plus/Pro is active only with a server-recorded eligible status and unexpired period. No public mutation endpoint exists.

## Data model\n- `koolo_subscriptions` preserves each provider subscription lifecycle; `koolo_memberships` is the current effective entitlement projection.\n- `koolo_voice_sessions` stores reserved/active/settled sessions for future server-authoritative voice accounting. No reservation API is enabled yet.\n- `koolo_account_link_challenges` is only a schema placeholder for an explicit two-account verification flow; never merge identities on email equality.\n- Run `node --test tests/koolo-membership.test.mjs` for read-only entitlement regression tests.\n\n## Follow-up gates before enabling payments
- Google Play Billing native bridge and purchase token validation using Android Publisher API on the server.
- Bind a purchase to an authenticated Koolo account, acknowledge after verification, and handle refunds, renewals, revocations and RTDN idempotently.
- Implement authoritative, server-controlled voice metering and concurrency limits; **do not** interpret the existing 5-minute trial issuance count as actual voice duration.
- Implement account linking explicitly: Google and GitHub identities are separate even with the same email.
- Do not enable any Plus/Pro voice allowance until Gemini cost ceilings and purchase lifecycle tests pass.
- Protect all entitlement mutations with provider verification or audited administrator actions. Never accept client-supplied plan/status.
