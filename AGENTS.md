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
