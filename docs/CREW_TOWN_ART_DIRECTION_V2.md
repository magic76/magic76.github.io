# Crew Town — art direction v2

Goal: turn the concept-map from a low-detail placeholder into a consistent illustrated miniature village while preserving the existing /town interactions and one-to-one Live handoff.

## Changes
- Distinct architectural silhouettes: café, studio, play house, lakeside pavilion. Facade details include roof layers, tiles, glass, wood trim, café umbrella, signs, and doors.
- Layered terrain with beveled island edge, scattered stepping stones, winding paths, a lakeside boardwalk, a cart, benches, foliage, blossoms, streetlights and softly shaded water.
- Six custom SVG character sprites with individual hairstyle, coat, skin tone and accessories. They do not mix photo cutouts into the illustration.
- In-world floating messages and place markers use quieter styling, preserving the map as the hero.
- Slow, individually staggered NPC strolls and subtle water movement (no nonstop bouncing), respecting OS reduced motion.
- Night toggle now darkens the landscape while bringing forward warm lantern light; day mode remains natural and bright.
- SVG definition IDs are instance-specific so the scene can coexist on /explore and /town.
- No binary dependencies, external font fetches, API charges, or new permissions.

## Visual review to perform before merge
1. Capture /town at 360×800, 412×915, 768×1024, and 1440×900 in both day and night mode. Compare architecture detail, path readability and visible character faces.
2. Check six walking characters and four locations at browser zoom 100%, 150%, 200%. Ensure controls and speech bubbles never obscure the selected avatar or action.
3. Test dragging/scrolling horizontally on mobile and vertically out of the map region. Check focus and Enter/Space operation in a keyboard-only session.
4. Confirm day/night and pause controls work without starting microphone/camera or multiple Live sessions; entering the character's chat should use existing /friend/live.
5. Verify Android WebView behavior and CPU/power on entry/exit, especially nighttime shadows and the scene in Explore's smaller card. Reduced motion must disable ambient animations.
6. Do not claim fidelity or production-ready art without actual screenshots. If art fidelity still feels flat, the next step is a unified commercial-safe low-poly asset pack and optimized R3F/GLB scene, not more unrelated CSS effects.

## Invariants
- /town stays opt-in; /explore and existing cards stay intact.
- Speech bubbles are scripted previews, clearly labeled as such, not generated NPC Live conversations.
- No changes to teacher contracts, Gemini integration, audio, memories, or role boundaries.
