# Crew SEO CTR 實驗｜2026-11-10

## 目的與範圍

目標是提升「已在 Google 搜尋結果曝光」的有效點擊，而不是用更多索引或標題堆砌關鍵字。此 PR 僅先針對正式公開首頁與 Teacher 的 zh-Hant/en 標題與摘要做文案候選，不以未取得的搜尋數據聲稱效果，不新增索引頁，也不更改 canonical、hreflang、robots、功能路由或 GA4 追蹤。

- 首頁：AI 朋友聊天／英文口說／互動遊戲；符合實際提供的文字對話、語言與遊戲體驗。
- Teacher：AI 英文口說練習／老師與朋友對話；不同學習語言仍能選擇，英文只是本輪繁中搜尋意圖的切角。
- 暫不動 Story、Fortune、Research、Games 與 Guides 的標題；等 Search Console 實際查詢與頁面數據再排序，不憑猜測宣稱高機會頁面。
- 變更源頭：`scripts/generate-seo.mjs`。產出的四份 HTML 與 SPA `common.json` SEO title 同步；Cloudflare SSG 採靜態 SEO head、React SSR 主體。

## Search Console 基線（尚待取得，禁止填假數據）

資料來源須為已授權的 Search Console（網址屬性或網域屬性須能對應 www.3sssi.com），搜尋類型選 **Web**。使用最後一個完整的連續 28 天做 baseline，保留資料匯出日期與完整時間窗。資料表以「頁面 × 查詢 × 裝置 × 國家」為最細分析單位；若 GSC 隱私保護導致部分查詢隱藏，註明缺漏，不用列表加總冒充整站總量。

必要欄位：`start_date,end_date,property,search_type,page,query,country,device,clicks,impressions,ctr,average_position,exported_at,cohort,notes`。來源 CSV 儘量保留 GSC 原欄位；單一比率可由同一組 clicks / impressions 計算，不與 GA4 sessions 混用。

### 選題與優先順序

1. 先確認 URL 已建立索引、canonical 正確，排除意外 noindex、robots 封鎖或沒有合適內容的查詢。
2. 優先檢視最近 28 天有穩定曝光、平均排名相對靠前，但 CTR 在同類查詢／排名／裝置下偏低的查詢與頁面組合；有 100 次以上曝光可列作初步篩選，但不是絕對門檻。
3. 把品牌查詢（Crew、3sssi）與非品牌查詢分開；英文／中文、台灣／海外、手機／桌面不要混成一個 CTR。
4. 每次最多挑 3–5 組候選；保持標題自然精確、只承諾頁面真能提供的功能。Google 可能重寫 title/snippet，因此必須記錄實際 SERP 呈現。

## 觀測設計

- **變更前**：保存上一個完整 28 天 baseline；如不能取得，標示「未有基線」，不宣稱本輪能證明 CTR 成長。
- **上線日**：記錄 master merge SHA、部署時間、GSC URL Inspection 結果、Google 搜尋實際標題（含裝置/地區），並觀察 Google 重新抓取日期。未完成重新檢索前的數據不視為實驗開始。
- **變更後**：用重新檢索後的可比 28 天觀測窗，按查詢、頁面、國家、裝置、相近排名區間看 clicks、impressions、CTR、average position；另比對上一時段的趨勢和季節性。
- **守門指標**：GA4 相同 organic search 來源的入口 sessions 和有效產品使用事件（如 `teacher_conversation`、`friend_conversation`、`game_started`），不能與 GSC clicks 相除當轉換率。事件定義見 `docs/growth-measurement.md`。
- **決策**：同條件下 CTR／有效點擊改善、無相關體驗指標下降才保留候選；若無改善，先檢查 SERP 是否採用文案、查詢組成與排名是否變化。這是前後觀察，不能稱為嚴格 A/B 因果實驗。

## 驗證

```sh
node scripts/generate-seo.mjs --check
node --test tests/seo-ctr.test.js tests/seo-pages.test.js tests/guest-trial.test.js
npm run check:web
npm run check:i18n
npm run build:cloudflare
npm run test:cloudflare
```

正式站另核實 `/`、`/en/`、`/teacher/`、`/en/teacher/` 的 HTTP 200、可索引 metadata、對應 SSR 主體與 canonical/hreflang。不要把 PR 或 build 成功視為 Google 已更新搜尋結果。
