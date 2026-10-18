# Crew Teacher maintenance rules (Web portion of magic76.github.io)

These rules apply only to Crew Teacher code and related files under `web-spa/src/teacher/`, `web-spa/src/friends/`, `web-spa/src/live/`, `crew-live.js`, `features/teacher/`, and `contracts/crew-teacher/`. They do not change the release behavior for Crew Story, Crew Fortune, or the shared site.

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
