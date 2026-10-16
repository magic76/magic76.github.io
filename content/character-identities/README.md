# Crew Character Identity Lock v1

This reference-only catalog is the identity source for **16 Friends + 16 Teachers**. The goal is to prevent everyday Shorts photos from silently turning into unrelated people.

## Important distinction

These JSON records **are not pretrained Character Models**. They lock each character to an exact existing approved master portrait, provide stable descriptive guidance, and reject prompt-only generation. A model/service must accept the **actual master image bytes** as an image reference. Merely including a file path, link, character name or image hash in a text prompt DOES NOT anchor identity.

## Approved identity source

- Friends: `assets/friends/crew_friend_<id>.webp`
- Teachers: `assets/teacher/teacher-<id>.jpg|webp`
- The same canonical Git blobs also exist in Android `crew-teacher/app/src/main/res/drawable-nodpi/`.
- Each character JSON includes the exact immutable Git blob SHA and a commit-pinned source URL. Replacing a master portrait requires **new identity version**, human review, and re-approval. Do not quietly point v1 to a different face.
- Current Crew Shorts lifestyle photos are **story continuity only**, NOT trusted identity anchors. The seeded Bella photos have different facial features/hair from the official Bella portrait and MUST NOT be used as her character identity references.

## Image generation procedure

1. Read the person's `identity.json`, fetch its `source.pinnedRawUrl`, verify it matches `source.gitBlobSha`, and **provide its actual pixels to the image-generation service as the reference image**. If the image input cannot be provided, STOP and ask the owner to upload it. Do not invent a face.
2. Build one prompt with `visualIdentity.block` **verbatim**, `generation.styleLock`, the day's unique scene, composition and behavior. Keep face/hairline/eye shape/skin tone invariant; clothes, pose, expressions, weather, and setting may change.
3. Generate **one independent 3:4 image at a time**, with exactly one character in frame. No collages, branding or text.
4. Review against the original master: facial structure, eye shape, nose, smile, hairline, hairstyle/color, skin appearance, apparent age. Reject if uncertain. Automated face similarity is supplementary, not a guarantee.
5. Submit accepted new-angle reference shots for explicit human approval before adding them to `referenceSet`. Never auto-promote generated Shorts as trusted identity examples.
6. Publishing and any cost-incurring model/API jobs are separate, opt-in operations. This identity catalog alone does not generate images, modify Shorts feed, or train characters.

## Reference quality and lifecycle

`referenceSet.master` is bound to the current official portrait. Four additional perspectives are intentionally `needs_human_review` — no fake references or claims of completed model training. Small circle-cropped teacher icons (Alex, Emma, James, Mia) have limited facial detail, so treat those as `limited` for high-fidelity multi-angle generation. Request better reference photos before trusting any 3/4 or profile view.

Both the natural language identity block and the image reference are important; image anchoring takes priority over any visual descriptors. Character names and personality should come from the existing product profiles rather than generative guesswork.

Validation: `node scripts/verify-character-identities.mjs` (once added as part of this change).
