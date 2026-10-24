# Crew Play — Instinct audit implementation & acceptance (2026-10-24)

Source: [Instinct Slack review](https://liyangteam.slack.com/archives/D0C5GCJEH16/p1792837919683369).

## In scope

- 1A2B: move input before optional voice; compact first screen; deterministic UTC daily challenge in 3/4/5 digits; browser-local first-result lock, streak and best; reuse existing downloadable PNG share card, retry regular round.
- Taboo: distinguish offline description practice (keyword clarity only, manual self-scoring) from genuine Gemini AI guessing, including copy and result feedback. No fake offline AI success.
- Werewolf: contextual offline NPC lines reflecting the player's accusation, named player, voting context and known public state. Never fabricate hidden-role knowledge. Explicitly mark offline replies as scripted.
- 20 Questions/Mystery: sample rounds before the Gemini setup callout. No examples should expose the actual current secret.
- Hub: correct per-game Gemini key and voice requirement labels.
- Voice selection: keep optional Live settings in existing accessible GamePanel rather than taking game space.
- Friend personality: lightweight local reaction events in Number, Taboo and board games. These are not Gemini output and never change engine rules.

## Automatic checks (run before merging)

```sh
npm test
npm run check:web
npm run build:web
```

Additional regression source: `tests/crew-play-instinct-upgrade.test.js`.
Keep existing `tests/crew-taboo-layout.test.js`, `tests/werewolf-game.test.js` and `tests/crew-play-shell-layout.test.js` passing.

## Manual test checklist

- [ ] Mobile widths 360 / 390 / 430: 1A2B input, keypad, latest guess visible before voice dock. Keyboard never hides input, settings opens/closes without resetting game.
- [ ] 1A2B random 3/4/5 digits and reverse mode: scoring unchanged, correct answer and finished states unchanged.
- [ ] UTC daily 3/4/5 digit: two clients on same UTC date/difficulty have same secret; dates roll over at UTC midnight; first local result cannot be overwritten by subsequent retries; stale/broken localStorage does not crash.
- [ ] 1A2B PNG share includes URL, daily label, personal best where available; standalone retry works.
- [ ] Taboo no Key: user text never receives a bogus AI guess and keyword detection never silently marks answer correct; self-assessment, skip and forbidden word still work. AI model with Key: semantic guessing, scoring and round guards still work. Key/voice are not required for manual practice.
- [ ] Werewolf without Key: specific question/accusation/voting prompts result in relevant varied *scripted* text; role secrecy remains enforced; NPCs never access other players' private roles.
- [ ] With Key: model NPC answers question context, voice connects/interrupts, tool calls are validated by engine and advance phases, no duplicated speech; reconnect and network loss recover. **Not verified in Instinct audit.**
- [ ] 20Q and mystery intro examples display even with no Key, with correct localization, but cannot accidentally be treated as actual round answers.
- [ ] Cross-game friend selection persists; event copy changes based on friend while rules/results remain authoritative.
- [ ] Android WebView real device: mic permission, input focus/keyboard, safe area, audio output, reconnect. **Not verified in Instinct audit.**

## Boundaries

Daily records are **per browser only**, not account-wide or server-verified. The deterministic daily puzzle is not tamper-resistant, so don't promote global competitive rankings based on it. Reactions are event-driven scripted copy, not context-aware Gemini conversations. Voice and Android results require separate real-key/device QA and must not be marked passed based solely on the PR tests.
