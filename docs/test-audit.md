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

## Follow-up PR: independent full regression

The existing `.github/workflows/crew-spa.yml` has a single `build` job. Typecheck, the always-on usage analytics test, and the Web build are sequential steps: a failure in analytics prevents the build and bundle checks from running. Several feature-specific checks use `contains(github.event.pull_request.head.ref, ...)` and therefore select tests based on branch naming, not changed paths; this must not be treated as reliable impact analysis.

The first incremental CI architecture change introduces `.github/workflows/koolo-full-regression.yml`, scheduled nightly at 19:17 UTC and available via `workflow_dispatch`. It runs the entire existing Node test suite, TypeScript and locale checks, and Cloudflare build/deployment/bundle checks in three independent parallel jobs. This preserves the existing PR-required `build` check without modifying branch protection or silently changing its meaning.

This is **not yet** changed-area PR selection or an optimized PR fast lane. Do not mark those tasks complete until path/dependency analysis and required-check migration are validated. Full regression durations and test counts must be recorded from actual Actions runs after this workflow is enabled.

## Measured PR CI baseline (2026-11-20 review)

Source: GitHub Actions run [44466525561](https://github.com/magic76/magic76.github.io/actions/runs/44466525561), PR #769 at commit `2293455`. This is a **historical snapshot**, not a fresh master run.

- New `Koolo PR impact validation` workflow selected **full** regression because the PR modifies `scripts/`, `tests/`, and `.github/workflows/`. That is expected fail-closed behavior.
- Node runner summary: **1,828 tests**, **1,760 passed**, **50 failed**, **18 skipped**; test process duration **38,892 ms**. The workflow itself failed.
- A separate `Crew SPA build` run [44466525442](https://github.com/magic76/magic76.github.io/actions/runs/44466525442) failed at TypeScript typecheck. This is an independent blocker, not proof that the selector broke production code.
- One full-suite failure was a parse-time `SyntaxError: Invalid regular expression flags` in `tests/phone-lab-route.test.js`. Fixed in PR #790, merged as `d74338e` after its PR CI succeeded.
- Another failure asserted `UsageDashboardPage.tsx` must stay below 26 KB. At the time of this review the **current master source** was approximately 16.7K characters; the historical failure should **not** be assumed to persist without rerunning against current master.

### Failure clusters from the historical run

These are names of failed assertions, not verified root causes. Several appear to be source-shape checks that could have become stale after UI changes.

| Cluster | Examples | Required next action |
| --- | --- | --- |
| Product navigation / UX | Home routes, private routes, settings deep links, PWA install, Shorts text entry, teacher biography | Compare against current routes and user journeys before changing assertions |
| Live / chat | Call settings sheet, text-only microphone bypass, friend/teacher entry | Verify functional contracts and security invariants |
| Fortune / tree / games | Daily card, 11 locales, postcard, art geometry and rendering | Validate current feature specification and deterministic outputs |
| Analytics / architecture | Dashboard file-size threshold, private usage journey aggregates, route-scoped bundle | Keep privacy/security checks blocking; inspect architecture separately |
| Test harness | Phone lab regex syntax | Fixed in #790; rerun to confirm |

### Current gate policy

1. Keep `Crew SPA build` required and unchanged until a replacement has a stable green baseline.
2. Keep PR #769 open until its own selector tests and the full fallback suite can be evaluated against a known-good base. Its fail-closed fallback is correct; changing it to ignore failures would hide regressions.
3. Do **not** mass-update 50 source-grep assertions or raise file-size limits solely to obtain green CI.
4. Rerun full regression on current master (nightly/manual workflow); capture individual failed test names and job durations, compare to this snapshot, then repair small verified groups in separate PRs.
5. Audit whether the workflow's required status and nightly schedule are actually enforced before declaring migration complete.
