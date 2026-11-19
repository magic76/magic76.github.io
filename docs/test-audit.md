# Koolo test infrastructure audit

Status: **in progress** (2026-11-19). This document records verified findings only; a full inventory, measured baseline, CI workflow dependency graph, and complete test run are **not yet available**.

## Verified sources
- `package.json`: `npm test` invokes `node --test tests/*.test.js tests/*.test.mjs`; separate commands exist for `check:web`, `check:i18n`, `build:cloudflare`, `test:cloudflare`, and `check:bundle`.
- `tests/crew-usage.test.js`: the Souls anonymous-funnel test executes the actual Pages Functions handler using a mocked Analytics Engine, asserts permitted event/detail combinations, checks rejection of private event data, and also greps the frontend production-host allowlist.
- `functions/api/usage/event.ts`: allows `www.3sssi.com`, `3sssi.com`, `koolo.app`; rejects unknown hostnames and cross-origin requests.
- `web-spa/src/analytics/usage.ts`: its production gate includes the same three hostnames.

## Confirmed failure mechanism

The Souls test previously asserted that the frontend source contained the exact two-element hostname array `["www.3sssi.com","3sssi.com"]`. After adding `koolo.app`, that source-grep assertion no longer matched, despite both the frontend and server now supporting the new production hostname. This is a stale implementation-specific assertion, not evidence that Souls event ingestion broke.

**First repair:** retain the functional allowlist and privacy checks, accept the current production hostnames, and explicitly reject unapproved hostnames. No production code or UI is changed. The security contract remains blocking; this test should not be skipped solely because a PR touches another area.

## Provisional risk classification

| Check | Proposed tier | Reason |
| --- | --- | --- |
| TypeScript typecheck, production build | P0 | Shipping correctness |
| Cloudflare API authentication, origin, privacy, event contracts | P0 | Security and data-integrity invariants |
| Chat and Live connection lifecycle | P0 | Core user journeys |
| Feature-local deterministic tests | P1 | Changed-area gating, with dependency expansion |
| Expensive cross-feature and browser regression | P2 | Scheduled and manually runnable |
| Exact JSX/component-name/source-fragment assertions | P3 review | Replace with behavior, integration, or stable structural checks before removal |

## Required follow-up before adopting selective PR testing

1. Enumerate every `.github/workflows/` file and every test file, read the assertions, and count cases and source-grep/AST/behavior classifications.
2. Collect baseline timings from actual CI jobs and local executions, including master versus PR results.
3. Implement conservative changed-file impact mapping, covering renames, deletions, shared modules, dependency lockfiles, test infrastructure and workflow edits; unknown changes run the full suite.
4. Keep a stable always-required aggregate status and ensure branch protection references that check before replacing the existing required checks.
5. Parallelize independent build, typecheck and test jobs; collect results even when one fails.
6. Re-run the entire suite and document measured before/after timings and the exact count of replaced brittle assertions.

**Evidence limitations:** no full suite execution or timing measurements have been performed in this audit phase. Do not interpret this document as a completed repository-wide review.
