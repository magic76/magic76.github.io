# Koolo SEO 長尾成長計畫 — 2026-11-26 基線

## Search Console 基線
來源：2026-11-26 匯出的兩份網域 Performance on Search，網頁搜尋、前 3 個月。僅列彙總資料，不提交原始匯出檔。

| 網域／頁面 | 日期範圍 | 曝光 | 點擊 | 平均排名 |
| --- | --- | ---: | ---: | ---: |
| 3sssi.com 全站 | 10/12–11/24 | 925 | 8 | 約 15.3 |
| koolo.app 全站 | 11/16–11/24 | 132 | 3 | 約 12.9 |
| 舊站英文口說指南 | 同舊站 | 528 | 0 | 15.27 |
| 新站英文口說指南 | 同新站 | 8 | 0 | 6 |
| 舊站英文 Gemini Key 指南 | 同舊站 | 38 | 1 | 18.71 |
| 新站英文 Gemini Key 指南 | 同新站 | 4 | 1 | 22.5 |

查詢與頁面是兩份獨立報表，不代表指定查詢已由指定頁面取得排名；匿名查詢也可能未出現在匯出資料。不同日期範圍不可直接比較；少量曝光的排名只是機會訊號。

## P0 網域移轉
- 使用 `node scripts/check-seo-migration.mjs` 檢查三個歷史/www host 的永久轉址、路徑與 query 保留、最終 200。
- 使用既有 `node scripts/check-live-seo.mjs` 檢查 sitemap、robots、canonical、hreflang、公開 SSG 與私有頁 noindex。
- 正式站 HTTP 探測在本次執行環境無法解析或取得網站，因此不能宣稱上述項目已通過；請在可連線的環境重跑。
- Search Console 人工確認新站 sitemap 提交、舊站 Change of Address 及 URL Inspection。不得宣稱已完成未驗證的設定。
- 不改 Cloudflare redirect rules、OAuth、Worker 或帳號資料。

## P1 英文口說指南實驗
保留 /en/guides/ai-english-speaking/；以 catalog.ts 為 React/SSG 共用來源。英文版改成對話練習意圖，增加可實際朗讀、回答、跟讀及請求回饋的範例；避免宣稱不限量免費或有認證發音評分。中文版及其他 URL 本輪不變，以便隔離實驗。已有 intent-seo 頁面，先盤點其查詢意圖，不另建同義頁。

## 每週迭代流程
1. 匯出兩網域近 7/28 天與前期的頁面、查詢資料；針對目標頁使用頁面篩選後另匯出查詢資料，記錄索引及部署日期。
2. 分開品牌／非品牌、語系及裝置。觀察曝光、點擊、CTR、排名；少量曝光不當作穩定結果。優先選有連續曝光且排名 4–20 的頁面。
3. 一次只改善一個主題或實驗，開 PR 不自動合併；保留 URL、內容準確性、免費用量限制與公開/私有索引界線。
4. 部署後觀察至少 28 天（低樣本可延長），記錄 GSC 及 GA4 自然搜尋入口至核心功能的使用/轉換，不把平均排名當唯一 KPI。
5. 下一批：Gemini Key、旅遊英文、英文發音指南；再評估 ed 結尾、面試與餐廳點餐等獨立需求。已有課程/intent 頁面者優先補強，避免關鍵字互相競爭。

驗證：`node --test tests/seo-speaking-migration.test.mjs`，`npm run check:web`，`npm run build:cloudflare`，`npm run test:cloudflare`。確認英文 SSG HTML 的 title、description、h1、canonical、hreflang、sitemap、老師 CTA；正式站部署後重跑 live audits。
