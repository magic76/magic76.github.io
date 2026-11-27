# Crew Teacher maintenance rules (Web portion of magic76.github.io)

These rules apply only to Crew Teacher code and related files under `web-spa/src/teacher/`, `web-spa/src/friends/`, `web-spa/src/live/`, `crew-live.js`, `features/teacher/`, and `contracts/crew-teacher/`. They do not change the release behavior for Crew Story, Crew Fortune, or the shared site.

## Repository-wide PR verification and follow-up

This section applies to all changes in this repository, independent of the Crew Teacher-specific rules below.

- After opening a PR or pushing a corrective commit, create a one-time follow-up automation for 10 minutes later when scheduling is available. Include the repository, PR number and intended head SHA; check the latest head at execution. Avoid duplicate scheduled checks for the same PR/head.
- Inspect GitHub Actions and check runs, mergeability and relevant regression results. Distinguish pending, failed, skipped and passed checks; never describe unexecuted local tests or browser/device acceptance as passed.
- Investigate failures against the base branch. Correct clearly attributable regressions on the original PR branch, then schedule another verification. Do not silently ignore unrelated or unexplained failures.
- Proactively report readiness to merge, remaining blockers and evidence. If checks are still pending, arrange another one-time follow-up where supported; do not create indefinite recurring jobs. If scheduling is unavailable or fails, disclose that limitation.
- Do not merge without explicit user authorization. A follow-up check does not itself authorize a merge.

## Crew Teacher-specific maintenance

- Android `magic76/crew-teacher` is the behavioral contract owner: `contracts/crew-teacher/v1.json` on Android `main`.
- Web keeps the same JSON file as a snapshot. Run `node scripts/verify-teacher-contract.cjs --upstream` to check code anchors and agreement with Android `main`. A copy of the contract without matching implementation is not enough.
- If you modify role behavior, natural chat, language selection, memory consent, reconnection, curricula, or Gemini Live control flow, check the Android implementation and update the cross-platform contract plus regression tests as needed.
- Preserve Friend vs Teacher boundaries, language-lock across reconnect, memory opt-out, evidence-based memories, and scenario/roleplay immersion. Do not change these to satisfy snapshot tests.
- Merge the Android canonical contract PR first, then the Web parity PR; the Web CI intentionally verifies against Android `main`.
- There is no cross-repo write token or silent mirroring. The scheduled workflow only detects drift. Never trigger Android Play AAB from a Web change.
- Web release still goes through existing Crew SPA / Cloudflare Pages workflows.

Full matrix and coordination process: https://github.com/magic76/crew-teacher/blob/main/docs/TEACHER_MAINTENANCE.md
Local Web parity background: `docs/APP_PARITY.md`.

## Shared payload and event contracts (P1)

- Read `contracts/crew-teacher/interfaces/v1.json` and `docs/SHARED_CONTRACTS.md` for role IDs, Shorts feed, friend-topic scope and logical Live/game events. Android `main` owns the canonical copy; Web mirrors it.
- Run `node scripts/verify-teacher-interfaces.cjs` alongside the existing behavior verifier. Shared changes need a canonical Android PR then a synchronized Web PR; update the contract and regression tests rather than improvising incompatible payloads.
- The event envelopes are **design-level fixtures**, not a claim that current Gemini Live/WebSocket code emits them. The role and real Shorts-feed checks are enforced today.
- For private cross-repository comparisons, configure the optional read-only `CREW_CONTRACT_READ_TOKEN` secret in the Web repository. An unauthenticated SKIP is not a parity pass.

## Crew Shorts editorial and photo production

For Crew Shorts images, captions, post imports, generator, review and publishing flows, read `.agents/skills/crew-shorts/SKILL.md` before working. It defines the canonical 16-Friend roster, identity verification, human review, and safe Pages publication. Do not infer that editing approved content authorizes paid image generation or automatic publishing.
