# Crew Town 3D P1 – implementation and visual gate

## Scope and behavior
- Independent opt-in /town route loads a separate R3F/Three.js chunk after WebGL capability detection. The old 2.5D route and manual fallback were retired; browsers without usable WebGL show an accessible 3D unavailable message with retry and a link back to Explore.
- Six real Crew Friends: Zoe, Yuna, Theo, Hugo, Bella and Noah. Deterministic, bounded waypoint movement using Idle → Walking → Arriving → Interacting → Talking stages. No NavMesh, speech generation, shared agent sessions, collision physics or autonomous conversation claims.
- Four grounded model destinations (Café, Studio, Play House, Lakeside Garden). Scene picking, DOM place shortcuts, accessible friend picker, smooth orbit camera with bounded inclination and zoom, day/night lighting and one-to-one Gemini Live links.
- DOM-owned buttons/cards independent of WebGL. Browser-level reduced motion pauses walking and camera animation; document.hidden skips NPC/camera frame updates.

## Art asset and licensing
- `assets/town/crew-town-art-kit.glb` is **original geometrically authored content for this Crew project**, generated from basic low-poly geometric constructions, not downloaded KayKit art. 8 reusable model groups: café, studio, play house, gazebo, tree, bench, lantern and flower planter. Four landmarks have modeled door/window frames, volumetric gabled roofs, material trims, awnings and details; no external texture requests.
- No third-party model licenses needed for the GLB; original project asset. R3F/Three.js/Drei package licenses are MIT.
- The GLB is a first bespoke art pass, not claimed to match animation-film quality. Do not pass visual acceptance without screenshots and device review.
- KayKit and Kenney CC0 packs were evaluated but cannot currently be copied through the connected GitHub binary-read interface; no third-party assets were included.

## Device and deployment QA still required
1. Browser screenshots of day/night and selected person/place on 360×800, 412×915, 768×1024 and 1440×900.
2. Android WebView touch: one-finger orbit, two-finger zoom, no pointer capture regression. Hardware measurements target stable >=30 FPS in midrange devices, record frame time, WebGL memory, and page load.
3. Check six NPC route footprints vs three building bounds and garden lake; use screenshot/film capture to inspect clipping and perceived foot sliding.
4. Ensure focus never puts a character behind a roof, phone selected-card never hides the selected subject, and landscape remains intact from all allowed camera angles.
5. Verify every card's existing /friend/live?id=..., /games target, Back navigation and Expo/Explore unaffected.
6. Test lack of WebGL, WebGL context loss and model load failure; verify the 3D unavailable/retry flow rather than rendering a 2.5D fallback.
7. Check TypeScript, npm build, existing and added tests, i18n, and gzip initial bundle.
8. Do not approve visual quality without actual hardware screenshots and tests.

## Known limitations
- Six characters are geometrically authored stylized avatars, not rigged facial/hand models. Movement uses fixed approved lanes and stops, not collision detection.
- Static lake surface and inexpensive non-shadow-casting lights are deliberate battery/performance tradeoffs.
- The scripted Town state is unrelated to Gemini voice sessions. Real-time multi-agent conversations not implemented.
