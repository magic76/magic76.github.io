# Koolo Articles｜第一版編輯與 SEO 操作規則

## 定位
`/articles/` 與 `/en/articles/` 是熱門話題、實用教學、產品可操作情境的靜態文章中心，不取代每日研究 `/research/` 或既有的搜尋意圖指南 `/guides/`。首批六篇中英文章為可審核樣本，包含 AI 工具、英文學習與趣味探索。不要僅為搶關鍵字複製新聞、套模板量產頁面。

## 唯一內容來源
- `content/editorial/articles.json` 的 `articles[]` 是已完成內容的唯一來源；`candidates[]` 是備選題材，不會輸出或建立索引。
- 只有 `status: "published"` 會產生公開頁面及 sitemap；`draft/review/scheduled/archived` 一律不輸出。
- 必須雙語內容實際完整才設 published。新增主題要有獨特搜尋意圖，不能和既有 /guides/ 重複堆字。
- 現有網站是 `koolo.app` canonical，`en` 和 `zh-Hant` 都各有實際頁面和 reciprocal hreflang。

## 編輯流程
1. 依 Google Trends、Google Search Console 的查詢詞、社群貼文互動與官方發布收集題材，在 candidates 加上來源與待確認事實；沒有資料時不可聲稱「正在爆紅」。
2. 先查現有 `/guides/`、`/fortune/`、`/research/`，相同搜尋意圖優先更新既有內容，避免自相競爭。
3. 寫實用回答與範例，保留可核對的原始來源，清楚分辨官方規定、自己測試及推論，敏感/價格/配額資訊寫明需以官方現況為準。
4. 每篇必須有實際 Koolo 相關體驗入口，不能虛構未上線功能。人工查閱行動版、原始來源、外鏈、文字、標點與 CTA 後，才能把該筆 status 設為 published。
5. 在 PR 驗收，再合併。**不得自動 merge、排程發布或修改社群發布 Queue 的授權欄位。** 合併後的 Pages 部署仍需確認實際 HTTP 200、canonical、sitemap 與 Search Console 索引情況。

## 技術規格
- `scripts/editorial-articles.mjs` 在 Cloudflare 建置時輸出 14 個靜態頁（兩個中心及六篇雙語內容）。不建 API、不向前端暴露未審核草稿。
- `scripts/prepare-cloudflare.mjs` 在 dist sitemap 補上 14 個 URL，保留既有根 sitemap 產生器與 noindex 政策；既有 `scripts/generate-seo.mjs --check` 不改。
- 各文章要有唯一 canonical、HTML 可見的正文與 h1、description、Article JSON-LD、語系 alternates、來源與相關延伸閱讀。第一版暫用 Koolo 已審核的類別 OG 圖，後續可改成各篇專屬圖。
- 非 React 靜態文章使用 `data-editorial-ssg-path`，和 React SSG 的 `data-crew-ssg-path` 區分；公開 SEO HTTP audit 兩種各自驗證。
- CTA 點擊在 GA4 存在並符合原本追蹤同意流程時，才送 `editorial_cta_click` 與 `article_slug`；不能將其誤稱為已完成聊天或付費轉換。

## 建議驗收
```sh
node --test tests/editorial-articles.test.js tests/seo-live.test.js
node scripts/generate-seo.mjs --check
npm run check:web
npm run build:cloudflare
npm test
```

## 成效觀察
觀測網站上線後 14、30 天的 Search Console impressions/clicks、每篇 landing page sessions、CTA clicks 和後續有效互動事件；同一系統、同一 session 才能組成轉換漏斗。沒有 Search Console/GA4 的實際資料，不要填造搜尋流量或轉換率。每週淘汰缺乏獨特價值的候選題，並更新有時效性的文章。
