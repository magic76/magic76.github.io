# Crew Town P0 — visual-first acceptance gate

Status: prototype, not production AI Town. The P0 art scene is custom inline SVG/CSS so reviewers can inspect it without external Spline credentials or loading a 3D engine. It is **not** a Spline scene and is not the approved final 3D art direction.

## Scope
- /town lazy route under AppChrome and Explore navigation.
- One visual artboard: original 960 × 600 isometric village with four identifiable locations.
- Six existing Crew Friend IDs only; map figures are consistently illustrated while the interaction panel uses approved existing portraits.
- Accessible, keyboard-focusable interactive markers; horizontally scrollable stage on mobile.
- Scripted rotating ambient conversations, pause/resume, daytime/nighttime toggle, reduced-motion preference.
- Character interaction opens an information card within the artboard and links to the existing one-to-one /friend/live?id=... flow.
- No new dependencies, Gemini sessions, AI cost, backend changes, memory sharing, or autonomous model claims.

## Required visual review before merge

Use Android WebView / Galaxy S series, narrow mobile browser (360 × 800), tablet (768 × 1024) and desktop (1440 × 900).

1. Screenshot the default map in day and night modes on all four viewports.
2. Screenshot and compare café, studio, garden and play-house markers; confirm they do not cover faces or make labels unreadable.
3. Tap every character. The information panel must appear immediately without scrolling below the map; closing restores the scene.
4. Pan the map left and right. It must not drag the page sideways or trap vertical scrolling while outside the map region.
5. Check readable text at 200% browser zoom and safe bottom spacing with native Android navigation bars.
6. Navigate into the real friend voice page and back. Confirm character ID survives and the page does not start audio without user input.
7. Test keyboard tab focus and Enter/Space on each marker, in addition to touch.
8. Turn on reduced motion and verify character sway/transitions stop. Pause ambient dialogue and verify it does not change.
9. Run npm run check:web, npm run build:web, npm test and npm run check:i18n. Verify there are no unexpected bundle or route regressions.

### Visual acceptance threshold
Score 1–5 in each category, weighted to 100 points:

| Criteria | Weight |
| --- | ---: |
| Coherent art direction, scale and proportions | 30 |
| Legible visual hierarchy | 20 |
| Touch/keyboard interaction | 20 |
| Mobile composition, including Android WebView | 20 |
| Motion and perceived performance | 10 |

Require at least 85/100, no category below 3/5, and no blocking functional/accessibility issues. A code-only review is NOT evidence of visual acceptance.

## Spline / React Three Fiber transition
Only after visual sign-off:
1. Choose a single low-poly asset family and scene color palette; prototype equivalent composition in Spline. Verify model/texture licenses.
2. Export GLB or verified assets; do not assume Spline interaction logic migrates into React Three Fiber.
3. Measure first-frame time, JS bundle, FPS and memory on Android WebView. Use an image/SVG fallback if WebGL is unavailable.
4. Keep React DOM overlay for text, roles, buttons, close affordance and voice handoff. AI dialogue orchestration stays separate from rendering.
5. Do not enable simulated multi-character Gemini Live claims until a real conversation coordinator exists.

## Non-goals
No multiplayer, pathfinding, autonomous AI behavior, 3D physics or persistent world state in this PR. Ambient bubbles are explicitly labeled scripted examples, not live speech or generated memories.
