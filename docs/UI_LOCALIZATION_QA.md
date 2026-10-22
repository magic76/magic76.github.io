# UI localization quality gate

Run `npm run check:i18n` locally. It validates every English namespace against all declared UI locales, checks every JSON value, key and `{{interpolation}}` token, and reports coverage per locale. **Published** and **Beta** locales require 100% catalog parity; Preview locales may remain incomplete. "Same as English" is a review metric, not automatically a defect (brand names and international terms can be unchanged).

Crew SPA runs this offline gate on push and PR. PR checks additionally compare new TSX lines with the base commit and report potential hard-coded visible JSX or accessibility/placeholder strings via `--changed-ui`. This heuristic reports warnings by default; false positives can carry an explanatory `i18n-audit-ignore` comment. New English keys must be added to Traditional Chinese and every Beta locale.

Keep Beta catalogs lazy-loaded via `import.meta.glob`. User text, session transcripts, learning data, character names and learning-language configuration are not UI localization data.

Functional QA matrix: open /, /games, /teacher, /friends, /story, /fortune, /timeline, /settings in each Beta locale; check direct deep links, refresh, back/forward, Android WebView, mobile overflow and hydration. Compare Teacher target language, native language, chat and voice settings before/after switching. Static checks cannot replace browser/device and native-speaker QA.

## QA results and known limitations

- English baseline has 736 translation keys across 7 namespaces before this PR. The nine Beta catalogs and Traditional Chinese matched these keys and their interpolation tokens in the first GitHub Actions audit. All new Play, Settings, Homepage and Timeline UI keys are required to match as well.
- Main Play hub and game header, device/privacy Settings, homepage discovery, Timeline main controls, compare screen and live conversation controls now use translated catalog keys, rather than Chinese/English ternaries.
- Playwright Chromium smoke now checks all nine Beta locales on mobile viewport (390 px), direct/deep links and refresh, game and Settings headings, and the rest of the primary routes, including no document-wide horizontal overflow or corruption of Teacher target/native language, pace or conversation-mode storage.
- Previously authored Timeline character narratives, authored Life Book questions and user-saved memories are not translated in this pass. The original English versions are used for non-Chinese UI locales. They are content, not UI translation keys.
- Remaining feature-level hardcoded copy outside these entry screens (especially individual games, some Teacher exercises, in-depth Story/Fortune pages, and older Timeline secondary panels) requires continued audit before declaring **every page** fully translated. The CI diff scanner flags *new* inline JSX but is not a guarantee that every legacy literal is removed.
- Natural phrasing, script shaping, Android WebView (native wrapper), screen-reader announcements, and production network failure/retry behavior still need human/device validation. Chromium desktop emulating a mobile viewport is not a physical Android WebView test.
- Never promote Beta languages to published/SEO without native-speaker and device review. Existing Preview locales remain intentionally untranslated in the complete JSON catalogs.

## Functional inventory (remaining follow-up)

| Surface | This PR localized | Remaining human/code review |
| --- | --- | --- |
| Home & navigation | Portal discovery text, date locale, recent game titles | Any newly added product-specific components beyond the existing seven namespaces |
| Crew Chat / Friends | Existing translated friend catalog preserved | Friend Live / per-session error and role UI, plus user-written/AI text must stay untouched |
| Crew Teacher | Practice action cards and Settings teacher controls | Deep practice steps and target-language labels; do not change target/native/session state |
| Crew Play | Main hub, game page headings, voice badges | Number Game, Taboo and game-internal hints still contain legacy Chinese UI literals |
| Crew Story | Existing Story namespace/resources preserved | Story Live and story authoring subflows may still have legacy UI literals |
| Crew Fortune | Landing, reading/history buttons, voice entry and empty states | Individual Reading / Live details, calculated cultural descriptions and content |
| Crew Timeline | Main navigation, life-stage labels, Compare and Live shell | Secondary explanatory/echo panels and authored Life Book content; language fallback to English for non-Chinese authored stories |
| Crew Shorts | Feed status, action buttons, pagination, episodes, follow-up cards and conversation hooks | Published caption/translation content is intentionally not machine-translated |
| Settings | Learning, voice, memory, device, privacy and permission copy | Target/native language option names remain legacy data labels; stored values unchanged |

This inventory is not a claim that every UI literal in the repository has been eliminated. A broad follow-up i18n conversion should cover remaining legacy areas. Coverage percentage measures declared namespace key completeness, not full source-code UI coverage or native-speaker linguistic quality.
