# Membership database diagnostics

Read-only endpoint: `GET /api/membership/diagnostics`.

It requires the **same cryptographically verified Cloudflare Access JWT**, issuer, audience and administrator email as the existing `/api/usage/report` endpoint. Configure Cloudflare Access to protect this route (or a parent path), and keep `CREW_USAGE_ACCESS_ISS`, `CREW_USAGE_ACCESS_AUD` and `CREW_USAGE_ADMIN_EMAIL` set in Pages. Do not rely on a hidden UI route as authorization.

The endpoint checks three core authentication tables and seven membership tables in the bound `CREW_AUTH_DB`. It does not read account rows, return customer information, mutate schema or run migrations.

- 403: missing or invalid administrator Access token.
- 503: missing D1 binding or incomplete schema.
- 200: all ten expected tables can be queried.

To inspect, open the endpoint after Cloudflare Access login. The JSON is suitable for a later admin UI. It is not a payment validation test.
