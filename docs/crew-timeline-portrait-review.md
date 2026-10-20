# Ethan and Hana — hairstyle/head-angle revision v2

Current approved inventory: 24 fullbody photographs and 24 same-source avatars. The user explicitly instructed `merge` at 2026-10-20T03:16:28Z after all generated photographs were displayed. This approval authorizes normalization and avatar cropping for both platforms.

- Canonical manifest SHA-256: `5ec9f03cea0fb7051b4dbbf6cfd12265ab1b65d97ea4409d5c76a2e18a7b09e2`.
- Each character has ages 7, 10, 13, 16, 19, 22, 25, 35, 40, 50, 55, 70.
- The two age-25 fullbody files are the new approved identity anchors. All dependent anchor hashes are updated.
- Existing age-matched photographs were the edit targets; clothing, props and settings were preserved as closely as generation allowed. Hair length/style, head rotation and gaze vary by age.
- Fullbody: 900×1200 and <350,000 bytes. Avatar: 320×320 and <80,000 bytes, cropped from the encoded canonical fullbody. Exact crops and source hashes are recorded.
- Both fullbody/avatar contact sheets were inspected during production. Hair/head and both shoes remain in frame; avatars retain clear faces. Age realism and identity continuity are subjective. Some generations retain slight head tilt or show subtler hairstyle changes than requested.
- The file/hash/dimension and runtime approval-policy tests are run for this revision; PR checks provide build evidence. No Android device/emulator visual QA or real microphone/provider test is claimed for this image-only revision.
- Mira assets, stories, memory, voices and product behavior are unchanged. Android canonical manifest merges before Web.
- `crew-timeline-generation-briefs.json` retains initial generation history and adds `replacementGenerations` for the current revision. The old pending statuses inside historical briefs are not the current image approval authority.

## Historical initial release (superseded image inventory)

The following notes describe the previous photographs and approval hashes, retained for traceability only. Current assets and hashes are those above and in the canonical manifest.

# Ethan and Hana portraits — user approval recorded 2026-10-20

The existing Android #173 and Web #222 draft PRs now contain 24 fullbody candidates and 24 avatars cropped from those same encoded fullbody photographs. All 24 stages and both age-25 identity anchors are now `approved`. User approval was recorded for reviewer `magic76` at `2026-10-20T01:04:14Z`, following the explicit merge reply to the photo-approval/enable confirmation. Human-approved stages: **24**. The application may display only the corresponding verified bytes; missing, altered or newly unreviewed files still require placeholders. Android is merged before Web. Mira's canon, photographs and memory keys remain unchanged.

## Inventory and provenance

- Shared canonical manifest: `contracts/crew-timeline/person-portraits-v1.json`.
- Manifest SHA-256: `c9d9ac543ab0bc604ea3cd6fa17e8a734ec4b8b9f8e0e60fbde061d1ecc6952c`.
- Logical media paths are `timeline/fullbody/{character}-{age}.webp` and `timeline/avatars/{character}-{age}.webp`, prefixed with Web `assets/` or Android `app/src/main/assets/`. The corresponding files have identical SHA-256 across repositories.
- Fullbody images are 900 × 1200, exactly 3:4, under 350,000 bytes. Avatars are 320 × 320 and under 80,000 bytes.
- `crew-timeline-portrait-files.csv` lists all 48 delivered files, sizes and hashes. `crew-timeline-generation-briefs.json` records story excerpts, scene/outfit briefs and generation-time reference-image hashes; these briefs are not a verbatim transcript of generator calls.
- Every avatar records its square source crop and canonical fullbody SHA. Original generated PNG hashes and normalized age-25 anchor hashes are recorded separately. Original sources and processing tools are retained in the separate review ZIP, rather than committed as large PNGs.

## Production inspection and limitations

The four contact sheets were inspected during production for recognizable identity continuity, fullbody framing and avatar composition. All 24 ages have explicit crop coordinates; Ethan's age-50 crop was moved right to preserve the hair silhouette. Geometry, byte limits, hashes and crop lineage pass automated checks. Production inspection is not human approval, biometric verification or proof of age accuracy.

Review adult-age differentiation carefully, especially Ethan 35/40/50/55/70 and Hana 35/40/50/55. Ethan 35 may read closer to his age-25 anchor, and several adult or older candidates may appear younger than their labels. Hana 35 was regenerated with a distinct urban office exterior; Hana 50 was regenerated with a more mature appearance. These replacements are included in the recorded user approval; the production observations remain documented for traceability. Earlier Ethan 7/70 candidates are excluded. Earlier Hana 35/50 candidates appear only in the ZIP's reference history because their bytes were used as references for later generations; they are excluded from formal application assets.

Inspect each individual photograph against its canonical age story for clothing, setting, mood, age appearance, single-person composition, complete head/shoes and absence of unwanted text. Inspect all avatars, especially ages 7/10/13/16, for complete hair/head and a clear face. Face continuity across childhood and old age remains subjective. The user has now approved this exact inventory; these production observations remain relevant to future revisions.

## Approval gate

Generation and automated QA did not grant approval. The explicit user instruction now supplies the approval for the age-25 identity anchors and all 24 fullbody/avatar pairs. The manifest records the reviewer, UTC timestamp, approved anchor SHA and both reviewed image hashes. Any future replacement requires a new explicit approval tied to its new bytes. Runtime validation also requires the expected character/age path, file byte size, dimensions and SHA-256; the avatar must reference its canonical fullbody and a valid crop. Missing, altered or unreviewed assets must remain placeholders, without substituting another character's face.

## Verification evidence

- Both repository asset verifiers pass with **48 validated files, 0 pending stages, 24 approved stages**; canonical manifests and all corresponding binaries are byte-identical.
- Web local TypeScript checks, production build and Timeline regression tests pass. Synchronized media head `8bb227c` passed the complete suite (400 tests, 388 passed, 12 skipped, no failures) and Cloudflare Chromium smoke. The activation commit reruns CI with real approved fullbody/avatar Blob hash checks for all 24 ages, alongside pending-state and tampered/missing-file fallback regression checks; consult current PR checks for those latest-head results.
- Android debug compilation, JVM tests and asset validation are exercised by the existing PR verification workflow. Consult current PR checks for the integration head's result.
- Android emulator/device visual QA and real microphone/voice-provider end-to-end testing were not performed in this environment. Automated browser checks do not establish Android visual parity or validate the generated photographs' subjective identity/age quality.

The `portraitStatus` fields in the older character story catalog remain unchanged; `person-portraits-v1.json` is the sole image-approval authority. No life stories or Mira assets were rewritten to enable photographs.

