# Ethan and Hana portrait candidates — 2026-10-19

The existing Android #173 and Web #222 draft PRs now contain 24 fullbody candidates and 24 avatars cropped from those same encoded fullbody photographs. All 24 stages and both age-25 identity anchors remain `pending-human-review`; human-approved stages: **0**. The application must continue to show placeholders for Ethan and Hana. No merge or production release is part of this integration. Mira's canon, photographs and memory keys remain unchanged.

## Inventory and provenance

- Shared canonical manifest: `contracts/crew-timeline/person-portraits-v1.json`.
- Manifest SHA-256: `e7f35f687d1421aab63512b7571a46bdbd0db325fa6c273ec4be1e25edc6e569`.
- Logical media paths are `timeline/fullbody/{character}-{age}.webp` and `timeline/avatars/{character}-{age}.webp`, prefixed with Web `assets/` or Android `app/src/main/assets/`. The corresponding files have identical SHA-256 across repositories.
- Fullbody images are 900 × 1200, exactly 3:4, under 350,000 bytes. Avatars are 320 × 320 and under 80,000 bytes.
- `crew-timeline-portrait-files.csv` lists all 48 delivered files, sizes and hashes. `crew-timeline-generation-briefs.json` records story excerpts, scene/outfit briefs and generation-time reference-image hashes; these briefs are not a verbatim transcript of generator calls.
- Every avatar records its square source crop and canonical fullbody SHA. Original generated PNG hashes and normalized age-25 anchor hashes are recorded separately. Original sources and processing tools are retained in the separate review ZIP, rather than committed as large PNGs.

## Production inspection and limitations

The four contact sheets were inspected during production for recognizable identity continuity, fullbody framing and avatar composition. All 24 ages have explicit crop coordinates; Ethan's age-50 crop was moved right to preserve the hair silhouette. Geometry, byte limits, hashes and crop lineage pass automated checks. Production inspection is not human approval, biometric verification or proof of age accuracy.

Review adult-age differentiation carefully, especially Ethan 35/40/50/55/70 and Hana 35/40/50/55. Ethan 35 may read closer to his age-25 anchor, and several adult or older candidates may appear younger than their labels. Hana 35 was regenerated with a distinct urban office exterior; Hana 50 was regenerated with a more mature appearance. These replacements still require human review. Earlier Ethan 7/70 candidates are excluded. Earlier Hana 35/50 candidates appear only in the ZIP's reference history because their bytes were used as references for later generations; they are excluded from formal application assets.

Inspect each individual photograph against its canonical age story for clothing, setting, mood, age appearance, single-person composition, complete head/shoes and absence of unwanted text. Inspect all avatars, especially ages 7/10/13/16, for complete hair/head and a clear face. Face continuity across childhood and old age remains subjective.

## Approval gate

Neither generation nor automated QA grants approval. Activation requires explicit human review of the age-25 identity anchor and each fullbody/avatar pair. Record the reviewer, UTC review timestamp, approved anchor SHA and both reviewed image hashes in the manifest. Runtime validation also requires the expected character/age path, file byte size, dimensions and SHA-256; the avatar must reference its canonical fullbody and a valid crop. Missing, altered or unreviewed assets must remain placeholders, without substituting another character's face.

## Verification evidence

- Both repository asset verifiers pass with **48 validated files, 24 pending stages, 0 approved stages**; canonical manifests and all corresponding binaries are byte-identical.
- Web local TypeScript checks, production build and all 24 Timeline regression tests pass. Earlier pre-media head `7fd68cba` passed the complete CI suite (394 tests, 382 passed, 12 skipped, no failures) and Cloudflare Chromium smoke, including 36 chapter selections, future locks, pending-asset request blocking, phone portrait/landscape layouts and correct conversation identity. The image integration head must rerun those workflows; consult current PR checks for the latest results.
- Android debug compilation, JVM tests and asset validation are exercised by the existing PR verification workflow. Consult current PR checks for the integration head's result.
- Android emulator/device visual QA and real microphone/voice-provider end-to-end testing were not performed in this environment. Automated browser checks do not establish Android visual parity or validate the generated photographs' subjective identity/age quality.
