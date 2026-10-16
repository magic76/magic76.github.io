# Crew Character Identity Lock v2

This reference-only catalog is the identity source for **16 Friends + 16 Teachers**. The active identity version is **v2**, while every v1 file remains available for auditing. The goal is to prevent everyday Shorts photos from silently turning into unrelated people.

## Important distinction

These JSON records **are not pretrained Character Models**. They lock each character to an exact existing approved master portrait, provide stable descriptive guidance, and reject prompt-only generation. A model/service must accept the **actual master image bytes** as an image reference. Merely including a file path, link, character name or image hash in a text prompt DOES NOT anchor identity.

## Approved identity source

- Friends: `assets/friends/crew_friend_<id>.webp`
- Teachers: `assets/teacher/teacher-<id>.jpg|webp`
- The same canonical Git blobs also exist in Android `crew-teacher/app/src/main/res/drawable-nodpi/`.
- Each character JSON includes the exact immutable Git blob SHA and a commit-pinned source URL. Replacing a master portrait requires **new identity version**, human review, and re-approval. Do not quietly point either version to a different face.
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

## Version 2 — reference-grounded detailed character descriptions

Every active character uses `v2/friends/<id>.json` or `v2/teachers/<id>.json`, with structured `visualIdentity.features` for face, eyes, brows, nose, mouth, hair, skin and distinctive combinations. A dedicated `negativeIdentity` rule lists changes to reject. `scripts/shorts-character-identity.mjs` reads the v2 manifest and injects the full stable appearance and prohibitions into image prompts. Image QA receives the same details as **secondary observations** while comparing the **real reference pixels**. No trained character model is claimed.

The 32 official portraits and Git blob SHA fingerprints stay exactly the same as v1, and v1 is kept as an immutable historical baseline under `v1/`. The v2 validator compares every official portrait SHA with the corresponding v1 record. Official photos remain the identity authority, not facial adjectives or lookalike prompts. In particular, Alex, Emma, James and Mia have small/circular source portraits; the v2 description marks uncertain details as uncertain rather than fabricating fine geometry.

**Limits:** Richer prompts do not guarantee perfect character consistency without an actual reference image. Any approval, publication, or additional reference set requires human verification. No daily image is generated as part of this v2 change.

## Read-only v2 prompt preflight (no Gemini charges)

After Character Identity v2, inspect the **exact** Bella story scene, official portrait hash and image-generation prompt on your own computer with:

```sh
node scripts/inspect-shorts-character.mjs --friend bella --date 2026-10-17
```

The output confirms `crew-friend-bella-v2`, the official reference asset and its Git SHA, complete eight-facet visual identity and negative constraints, 10/17 indoor picnic scene, and a statement that the old Shorts photo is not used as an image reference. It makes **zero Gemini API calls** and writes no feed, photos or files. It does **not** create a new photo and does **not** prove visual similarity. A real photo still requires a model that genuinely accepts the reference image bytes, plus human visual approval before publishing. This avoids mistaking a detailed text-only lookalike for Bella.
