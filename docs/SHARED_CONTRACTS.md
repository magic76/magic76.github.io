# Crew Teacher — Shared payload and domain-event contracts (P1)

This **extends**, not replaces, the existing Android-owned behavior contract at `contracts/crew-teacher/v1.json`.

## Source of truth

- **Canonical**: `magic76/crew-teacher` on `main`, `contracts/crew-teacher/interfaces/v1.json`.
- **Mirror**: `magic76/magic76.github.io`, same relative path, byte-for-byte identical after synchronization.
- **Verifier**: `node scripts/verify-teacher-interfaces.cjs` in both repos.
- **Web authenticated parity**: `node scripts/verify-teacher-interfaces.cjs --upstream` with `CREW_CONTRACT_READ_TOKEN` (a fine-grained **read-only Contents permission** credential for the private Android repo). Without it, the verifier reports **SKIP**, never a false match. Never log the credential or expose it in browser assets.
- **Merge order**: Android canonical PR first; Web mirror PR after Android's main is updated. The Web PR local tests work before the mirror can pass authenticated upstream parity.
- **Deployment**: No runtime contract downloads or new servers. Data remains locally stored where already implemented; no cross-device sync is implied.

## Guaranteed by the current automated verifier

1. Both platforms contain **the same 16 friend + 16 teacher IDs**; the Web identity manifest matches them.
2. Real **published Web Shorts JSON** has the prescribed fields, valid references, unique post IDs, relative WebP paths and explicit timezones.
3. Sample role, friend-topic memory-scope and domain-event payloads are validated, including **negative** cases (wrong role, forbidden topic owner, assistant game move before required speech).
4. CI fails when those fixtures or platform roster / Shorts format drift. Changing Java vs TypeScript syntax is allowed; changing referenced data semantics is not.

## Still requiring app-level integration / manual verification

- The domain event envelope is **a proposed normalized app-level event**, **not Gemini Live's native WebSocket protocol**. The fixture test does **not yet** intercept all runtime events.
- Local friend-topic memory is currently implemented separately in Java and TypeScript. Sample scope tests protect the contract design, **not all actual reads**. Do not claim this alone proves isolation. Continue the existing behavior verifier and regression tests.
- Full image consistency, Live reconnect speech ordering, real-device silence handling and role-by-role memories still require end-to-end checks.
- The verifier implements a limited, documented validation vocabulary instead of a full JSON Schema compiler. Do not add unsupported schema keywords without expanding the verifier or adopting a standard library.

## Agent workflow

1. Read `AGENTS.md`, behavior `v1.json` and `interfaces/v1.json` before editing shared features.
2. Identify whether a change is **platform-only** or **shared behavior/payload**.
3. For shared changes, update the **canonical Android contract**, Android code and tests. Advance `revision` for semantic changes. Keep old versions stable; breaking payload changes require `v2` and an explicit migration.
4. Port the relevant change to Web; mirror the JSON exactly; run both contract verifiers and native/Web tests.
5. Create the two PRs with each other's URL. Merge **Android first**, then **Web**. Avoid auto-merging contract-only changes if Play Internal publishing would be triggered.
6. Note what is protected by CI and what still needs device/browser verification.

## P1 compatibility expectations

- Stable lower-case IDs, with explicit `friend` and `teacher` namespaces.
- Shorts `schema: 1`, `kind: "crew-shorts"`. Unknown new Shorts fields are ignored; missing optional fields default safely. Changing the meaning of existing fields requires a new version.
- Personal learner facts and `friend-topic` notes are not interchangeable. Friend-topic notes belong to one friend + learning language. An explicit memory opt-out wins over defaults.
- `live` and `game` domain events are logical design contracts, not transport promises. When a game turn explicitly requires speech-first, the move must not be applied before the assistant speech is complete.
