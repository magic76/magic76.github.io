# Crew Magic /magic — experimental live world

## What it is

A standalone, unmerged experiment where the user can reshape an enchanted island while talking to Lumi through the existing Crew Gemini Live runtime.

This is **not** arbitrary generated HTML. The model uses structured Function Calling. The UI renders a small allowlisted set of interactive components. This prevents the model from injecting scripts, markup, URLs or CSS into the page.

The experiment is independent of Crew Teacher's canonical Android/Web contracts and does not change the Town engine. Keep it an opt-in destination under Explore.

## Code

- web-spa/src/magic/MagicPage.tsx — page, voice lifecycle, controls and interactive renderer
- web-spa/src/magic/world.ts — pure state reducer, per-command validation, memory limits, offline demo
- web-spa/src/magic/liveTools.ts — Live tool declarations and guide persona
- web-spa/src/magic/magic.css — lightweight illustrated island, effects and generated cards
- tests/magic-world.test.js — reducer regression coverage

World actions: change theme/time/weather, summon one of six safe objects, cast one of four effects, create/answer a three-choice riddle, create/select a spellbook/treasure/quest panel, and narrate short story beats.

The user can click creatures and cards, use quick spells without Gemini, type a request while Live is connected, or talk with the guide. Each successful action immediately patches local world state without replacing the full scene.

## QA checklist

- [ ] npm ci && npm run check:web
- [ ] node --test tests/magic-world.test.js
- [ ] npm run build:web
- [ ] /magic deep link and navigation from /explore
- [ ] 360px / 390px portrait, landscape, tablet, desktop
- [ ] Reduced motion: no constant movements/particles; controls still work
- [ ] Offline/demo spells and reset without a Gemini key
- [ ] Live start, mute/unmute, volume, text send, error and stop
- [ ] Start Live, say "Summon a dragon" -> visible dragon
- [ ] Say "Make it snow at night" -> existing dragon stays on the island
- [ ] Say "Create a treasure chest with choices" -> generated panel; click to reveal one item
- [ ] Say "Give me a riddle" -> generated challenge; selecting answer updates chapter only if correct
- [ ] Disconnect/reconnect; no stale session calls update the current scene
- [ ] Confirm other Crew routes and Android Teacher contract are unaffected

## Design limits and next ideas

Current island artwork is CSS-based to reduce WebGL context problems on mobile; it does not create new meshes or imagery on the fly. Model generations are limited to existing state actions and three panel layouts.

Next iterations may add safely typed scene components, more puzzles and storytelling arcs, and richer character motion. Reuse a schema renderer rather than evaluating generated HTML or JavaScript.

The world and transcripts are not explicitly persisted by this feature; existing Gemini processing rules for voice sessions still apply. A user-owned save/continue feature should require a separate privacy/product decision.

Keep this a draft PR and do not merge without hands-on mobile/Live QA.
