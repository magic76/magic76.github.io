# Crew World Portal — implementation handoff

Base: master e9315ea10f3ed4bf9c854b05c215f30dc9ebc4a7.

Implemented: four-mode React KV (Chat/Play/Learn/Story), central translated text and real CTA routes, Canvas particle morph/interaction/launch, SVG fallback, reduced motion/Save-Data/manual pause, offscreen/background suspension and full effect cleanup. The real Shorts feed remains intact with scoped photo-card styling. Fortune and a multi-character Timeline entrance follow Shorts; Mira is no longer the sole homepage focus.

Main files: HomePortal.tsx, PortalParticleField.tsx, portalField.mjs (+ declaration), homePortal.css, homeWorld.css, HomePage.tsx, two home locale files. No animation dependencies or new photo assets.

Validation completed: npm run check:web; 18 homepage/Shorts/controller tests. Prototype browser QA covered four modes, CTA, keyboard, mobile 393×852 layout and offscreen animation suspension.

Remaining before merge:
- Full production Vite build / CI (local source snapshot does not include existing imported portrait binaries; typecheck passes).
- Browser QA of the integrated React page: 360/393/desktop, zh/en, scroll and CTA navigation, Shorts detail/chat links, route-away cleanup in StrictMode.
- Android Chrome/WebView performance, touch and visibility lifecycle on a real device.
- Fine-tune header/portal/Shorts spacing and dark-to-light transition against the full current shell.

Use existing routes and feed, do not regenerate portraits or replace the feed. Do not trigger an Android AAB. No merge has been requested in this conversation.
