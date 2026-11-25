# Crew Growth｜SEO × 社群 × 產品使用成效（2026-11-09 起）

本文件定義可驗證的流量增長工作流，不更動既有追蹤、發布授權或索引政策。不得把瀏覽量、事件總數、追蹤 UUID 或曝光數說成真實使用者、完成對話或轉換率。

## 基礎現況（已在 Repo 確認）

- SEO 與多語系規格：[seo.md](seo.md)、[global-i18n-rollout.md](global-i18n-rollout.md)；由 `scripts/generate-seo.mjs` 產生靜態頁，切勿直接編輯產出 HTML。
- `robots.txt` 在儲存庫為 `Allow: /`，有 sitemap 宣告。**這不能取代對正式站 HTTP 回應及 Search Console 的查證。**
- 中文／英文正式入口和部分 Games 頁已列在 `sitemap.xml`；語系預覽頁的 `noindex,follow` 是有意設計，不能全面移除。
- GA4 與匿名事件定義見 [CREW_USAGE.md](CREW_USAGE.md)。GA4 僅於符合隱私設定的 production session 啟用，測試／拒絕追蹤流量可能不被計入。
- Crew Lab SI 的 2026-11-05～18 內容實驗與手動 `metrics.csv` 位於 `magic76/crew-social-agent/content/experiments/2026-11-05-to-18/`。不要另建一份衝突的社群發布紀錄。

## 第一優先：Search Console 索引診斷

先匯出「網頁索引」中 **遭 robots.txt 封鎖**、**遭 noindex 排除**、**已檢索／已發現但未建立索引** 的實際 URL 清單；依下列三類分流：

| URL 類別 | 期望 | 處置 |
| --- | --- | --- |
| 正式公開入口：`/`、`/teacher/`、`/story/`、`/fortune/`、`/games/` 與已審核指南 | 可爬取、可索引、回應 200、canonical 正確 | 逐 URL 用 Search Console URL Inspection 與實際 HTTP header/HTML 查驗；有問題才修 |
| 尚未完成語系的 `/ja/*`、`/es/*` 等預覽殼、舊互動 SPA | 依既有政策保持 `noindex,follow` | 記錄為預期排除，不為增加索引量而撤除 |
| 登入、設定、使用者資料、低資訊量研究摘要及非公開/功能路由 | 視原設計而定，不強迫索引 | 查明用途；不做大量無價值 SEO 頁面 |

驗收：保存至少「URL、來源報告日期、實際 HTTP status、robots header/meta、canonical、robots.txt 命中規則、期望狀態、處置/原因、重新驗證日期」。索引增加需以後續 Search Console 實際回報為準，不把 sitemap 列入當作索引成功。

## 第二優先：流量歸因

只在貼文自然、確實介紹對應產品時附連結；**不得為了帶流量而破壞 Crew Lab SI 的真實故事編輯準則**。

已支援且可用的 GA4 UTM 鍵：`utm_source`、`utm_medium`、`utm_campaign`、`utm_id`、`utm_content`、`utm_source_platform`。值使用英數、`.`、`_`、`~`、`-`，最多 64 字元；不放姓名、查詢字詞、私密內容或 API Key。

建議統一命名：
- `utm_source=threads` 或 `facebook`
- `utm_medium=social`
- `utm_campaign=teacher_speaking_202611`（主題與月份）或 `fortune_share_202611`
- `utm_content=devstory`、`demo`、`sharecard` 等創意版本，不使用任意個資

例：`https://www.3sssi.com/teacher/?utm_source=threads&utm_medium=social&utm_campaign=teacher_speaking_202611&utm_content=devstory`

站內可見網址與社群純文案仍可使用精簡的 `3sssi.com`；上述完整連結僅用於真正需要可點擊歸因的入口。不要手工改造既有發布隊列，也不要往分享網址塞個人命理資料。

## 第三優先：區分點擊與有效使用

每週按同一時間範圍檢視：
1. **搜尋端**：Search Console 的有效點擊、曝光、CTR、主要查詢、有效索引 URL；曝光不是網站工作階段。
2. **社群端**：FB／Threads 每篇真實發佈時刻、非粉絲觸及、回覆／留言、分享、新追蹤、連結點擊；有資料才記，沿用社群 14 天實驗 CSV。
3. **網站端**：GA4 依 source/medium/campaign 的 sessions、`page_view`、進入頁；與 Cloudflare 統計分開標示，不把不同系統相加。
4. **產品端**：`teacher_conversation_start`（開始連線）與 `teacher_conversation`（已完成雙向互動）、`friend_conversation`、`game_started`／`game_completed`、`fortune_calculated`。事件意義以 [CREW_USAGE.md](CREW_USAGE.md) 為準。

只有在 **同一分析系統、同一日期範圍、同一已定義的 session/user cohort** 可正確串接分子分母時，才計算「來源 → 完成互動轉換率」。**不能拿 Cloudflare 事件數除以 GA4 sessions、FB 觸及或 Threads 點擊**；也不能拿獨立事件總次數當作使用者漏斗。

### 每週簡報的固定格式（沒有數據就填「待取得」）

- 本週時間範圍與資料擷取時間／來源。
- 內容產出／實際發布篇數（FB、Threads 分開）、有數據篇數與缺漏比例。
- SEO：主要索引問題是否修復，Organic Search session 與 Search Console clicks 的各自趨勢（不得強行等同）。
- 社群：相同平台、相近題材／時段／格式下值得重複的 2 個案例、失敗的 2 個案例。
- 產品：前 3 個入口的實際使用事件趨勢；有可用 cohort 才做來源轉換分析。
- 下週最多 3 項實驗，每項具備：假設、目標、受眾、採樣方式、觀測窗、成功指標、停止條件、負責人。
- 無法取得的 GA4、Search Console、Meta Insights 和 Cloudflare 私有資料一律標示 **待授權／待匯出**，不能補猜測數字。

## 30 天優先順序

1. **11/09–11/15**：以 Search Console 實際 URL 清單辨識「意外排除」；完成 GA4 初始 UTM 驗證及目前網站互動事件清單；保留實測證據。
2. **11/16–11/22**：從 Search Console 真實查詢挑 3–5 個高意圖主題，避免重複現有指南；只發布能解決具體需求、有審核過的內容。11/19 先回顧社群 14 天實驗。
3. **11/23–11/29**：挑一個具可分享成果的產品入口（如 Fortune 卡片），用匿名、安全的分享連結做 A/B 探索；先確認現有分享行為與深連結，不預設完成。
4. **11/30–12/08**：比較相同渠道的兩週趨勢與完成使用事件，保留有效方案；沒有實際數據就不宣稱成長。

## 原則與驗收

- 不擅改 `noindex`、schema、語系階段、publisher live 授權、Queue、GDPR/隱私選項。
- 不為 SEO 生成薄內容，不對使用者捏造使用成效或貼文觸及。
- 涉及 GA4/使用事件變更，先遵守現有 `tests/ga4-usage.test.js`、`tests/crew-usage.test.js` 與既有 CI。
- 此文件是可執行核對規格；**不是已完成 Search Console 真實數據分析或部署驗收的證明**。


## AI 搜尋成效（AIEO / GEO）
- 既有 GA4 Web stream 依 referrer origin 與 UTM 歸因，新增固定 enum `crew_ai_source`（chatgpt / perplexity / gemini / copilot / claude / grok），僅於原本允許分析的 session 送出。ChatGPT 官方會附 `utm_source=chatgpt.com`；未帶 referrer 或可辨識 UTM 的流量一律未知。這是來源標籤，不證明每次點擊都是 AI 搜尋引用。Google 一般與 AI 搜尋流量不可用 referrer 強行分開。
- GA4 管理員建立 event-scoped custom dimension `crew_ai_source`，使用 Web stream、同一日期和 session cohort 分析 landing sessions、開始聊天和有效完成對話。缺資料標示待取得，不能跨分析系統相除；不新增 D1 或直接付費 API。
- 每週固定問句：有沒有可以用中文聊天的 AI 朋友？有沒有不用 API Key 的英文口說網站？有沒有可以直接跟 AI 講話的網站？What AI conversation partner can I use in a browser? How can I practice English speaking without an API key?
- 對 ChatGPT Search、Gemini、Perplexity、Google AI 搜尋（可用時）各自記錄日期、介面/地區、完整問句、是否實際搜尋、是否提及 Koolo、是否引用 canonical URL、功能及額度描述是否正確。記錄未執行或無法驗證的項目；提及率/引用率分母為已實際執行且可判讀的問句次數。固定相同測試條件，不用品牌詞誘導，不捏造排名。引用與導流分開計算。
- 在每週成效報告加入 Bing AI Performance / Search Console 生成式 AI 報告（帳戶可用且已授權時），未取得數據不得填 0。
- 官方歸因說明：https://help.openai.com/en/articles/12627856-publishers-and-developers-faq
