# UI localization quality gate

Run `npm run check:i18n` locally. It validates every English namespace against all declared UI locales, checks every JSON value, key and `{{interpolation}}` token, and reports coverage per locale. **Published** and **Beta** locales require 100% catalog parity; Preview locales may remain incomplete. "Same as English" is a review metric, not automatically a defect (brand names and international terms can be unchanged).

Crew SPA runs this offline gate on push and PR. PR checks additionally compare new TSX lines with the base commit and report potential hard-coded visible JSX or accessibility/placeholder strings via `--changed-ui`. This heuristic reports warnings by default; false positives can carry an explanatory `i18n-audit-ignore` comment. New English keys must be added to Traditional Chinese and every Beta locale.

Keep Beta catalogs lazy-loaded via `import.meta.glob`. User text, session transcripts, learning data, character names and learning-language configuration are not UI localization data.

Functional QA matrix: open /, /games, /teacher, /friends, /story, /fortune, /timeline, /settings in each Beta locale; check direct deep links, refresh, back/forward, Android WebView, mobile overflow and hydration. Compare Teacher target language, native language, chat and voice settings before/after switching. Static checks cannot replace browser/device and native-speaker QA.
