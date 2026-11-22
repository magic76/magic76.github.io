# Koolo fortune two-tier offer and premium sample (preview only)

## User-facing scope

At the end of a completed **BaZi** reading, show two independent offerings:

- NT$79 — fast, focused deep reading (personality, career, two chosen topics, three-year themes and actionable reflection).
- NT$379 — AI fortune guide / personal destiny book, a later-delivered editorial report with illustrations, charts, questions and a closing letter.

The 379 sample at `/fortune/report-sample` is deliberately **fictional and fixed**. It contains a cover, an illustrative five-element page, a question-response excerpt and the six planned chapters. It does **not** compute a birth chart, generate a paid report or export a PDF.

The original NT$79 interest key remains intact. The premium tier uses `koolo_fortune_bazi_premium_interest_v1`. Both are local, opt-in interest markers. Existing `fortune_price_interest` analytics currently shares the `bazi` detail for both prices, so server-side interest events **cannot yet distinguish tiers**; do not use these events as a per-price conversion metric. This can be addressed in a separate analytics-contract PR before a real sales experiment.

## Safety and unchanged behavior

- Both plans explicitly state **not for sale**. No payment, checkout, order, entitlement or report-generation API has been added.
- Existing owner-only ECPay stage harness remains unchanged and isolated.
- Free BaZi, tarot, Vedic, reading history and previously paid report shelves are unchanged.
- No birth data or personal questions are recorded by the sample page.
- The report is labeled AI-generated, for personal reflection and entertainment. No human practitioner is impersonated.
- Cross-device preservation and PDF export are **planned**, not implemented in this PR.

## Manual acceptance before merging

1. Finish a BaZi chart on `/fortune/reading?mode=bazi`. Verify both price cards, NT$79/379, independent interest buttons and explicit coming-soon disclaimers.
2. Tap **翻閱精美命書樣本**. Confirm `/fortune/report-sample` shows the cover, five-element illustration, fictional sample passage, chapter list, and a back link; reload the route directly.
3. Inspect at **360×640**, **390×844**, **1280×800**: no horizontal overflow, all text legible, important buttons at least 44px high, no bottom-nav overlap.
4. Leave and return; verify each interest state is independent, and existing NT$79 storage remains recognized.
5. Verify non-BaZi flows do not show pricing, the admin-only stage test link still works when explicitly enabled, and public purchase is impossible.
6. Run `node --test tests/fortune-price-interest.test.js tests/fortune-paid-reports.test.mjs tests/koolo-ecpay-stage.test.mjs`, `npm run check:web`, `npm run build:web`, and `npm run check:i18n`.

## Next, separate PR

Agree on the final 379 content quality and delivery SLA, then add product catalog, D1 migrations and real report generation. Existing `koolo_fortune_orders` explicitly restricts `product_id='bazi-deep-v1'` and `amount_twd=79`; do **not** activate NT$379 by changing front-end labels alone. ECPay production activation requires approved credentials, server-verified notifications, refunds, idempotency and order ownership controls.
