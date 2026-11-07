# Crew Web｜Cloudflare 金鑰、環境變數與 Binding 維運手冊

> 最後對照程式碼：2026-10-29。範圍：`magic76/magic76.github.io` 的 Cloudflare Pages、`crew-guest-trial` Worker、D1、Turnstile、Analytics、Cloudflare Access，以及有關的 GitHub Actions／未啟用 R2。
>
> **安全原則：只記「名稱、用途、設定位置、權限、驗證方式」，絕不記錄任何 Secret／API Token／OAuth Client Secret 的實際值。**
>
> **狀態說明：這是依 GitHub 程式碼與部署設定建立的「應有設定清單」，不是 Cloudflare Dashboard 現存 Secrets 的讀取結果。** Cloudflare Secret 內容不應被查閱或複製到文件；是否真正已設定、選到 Production、部署成功，須到 Dashboard 確認。變數在程式中存在不代表功能已在正式環境啟用。

## 0. 先認識三個不同設定位置

| 位置 | 操作入口 | 主要功能 | 不要搞混 |
| --- | --- | --- | --- |
| **Cloudflare Pages Production**：`magic76-github-io` | Cloudflare Dashboard → Workers & Pages → Pages 專案 → Settings → Variables and Secrets／Bindings | 網站、Google／GitHub 登入、D1 Session、會員票券簽章、使用統計、Books API | Pages 的 Secret 不會自動同步到 Worker；Preview 與 Production 也可能不同 |
| **Cloudflare Worker Production**：`crew-guest-trial` | Cloudflare Dashboard → Workers & Pages → Worker → Settings → Variables and Secrets／Bindings | 無 Key 五分鐘試用：Turnstile、Gemini 臨時 Token、速率限制、會員配額 | Worker 有獨立 Secrets；程式設定在 `workers/guest-trial/wrangler.toml` |
| **GitHub Repository Actions Secrets／Variables** | GitHub repo → Settings → Secrets and variables → Actions | 自動產生 Briefing、Shorts（手動 AI 產生）、跨 Repo 契約驗證 | 這不是 Cloudflare Pages／Worker 的環境變數，不會自動注入 Cloudflare 執行環境 |

Cloudflare 專案的正式網址是 `https://www.3sssi.com`；試用 Worker 是 `https://crew-guest-trial.shanliyoung.workers.dev`。請選擇 **Production**，不要誤填 Preview。

## 1. Pages Production：登入與會員試用（優先保留）

| 名稱 | 類型／所在位置 | 用途與是否必要 |
| --- | --- | --- |
| `CREW_AUTH_DB` | **D1 Binding**，指向現有 `crew-auth` | Google／GitHub 身分、會員 Session、會員試用用量。登入必要。Worker 也要另外綁定同一個 D1 |
| `CREW_AUTH_GOOGLE_CLIENT_ID` | **Text** | Google OAuth Web App 的公開 Client ID；啟用 Google 登入時需要 |
| `CREW_AUTH_GOOGLE_CLIENT_SECRET` | **Secret** | Google OAuth 換取 Token 時的私密憑證；啟用 Google 登入時需要 |
| `CREW_AUTH_GITHUB_CLIENT_ID` | **Text** | GitHub OAuth App Client ID；啟用 GitHub 登入時需要 |
| `CREW_AUTH_GITHUB_CLIENT_SECRET` | **Secret** | GitHub OAuth 換取 Token 的私密憑證；啟用 GitHub 登入時需要 |
| `CREW_GUEST_TICKET_SECRET` | **Secret** | Pages 用它簽發 90 秒內有效、一次性的會員證明；**必須與 Worker 同名 Secret 完全相同**，才可啟用會員計次 |
| `GOOGLE_OAUTH_CLIENT_ID` ＋ `GOOGLE_OAUTH_CLIENT_SECRET` | 前者 Text、後者 Secret；**相容舊名稱** | 只有 `CREW_AUTH_GOOGLE_*` 這一組不完整時才會嘗試舊組；若新組完整，新組優先。勿在未確認實際使用組別前刪除 |
| `GITHUB_OAUTH_CLIENT_ID` ＋ `GITHUB_OAUTH_CLIENT_SECRET` | 前者 Text、後者 Secret；**相容舊名稱** | 同上，供 GitHub 登入相容；避免分別填新 ID 與舊 Secret，以免配錯 |

**OAuth Callback：** Google：`https://www.3sssi.com/api/auth/google/callback`；GitHub：`https://www.3sssi.com/api/auth/github/callback`。必須和供應商後台設定吻合。OAuth 的測試使用者／Consent Screen 限制也在 Google 後台，不在 Cloudflare。

**不需要 `AUTH_SESSION_SECRET`。** 舊教學可能要求，但目前 Session 是每次登入新產生不透明隨機 Token，D1 只保存 SHA-256 雜湊。無須因 Phase 3 另外設這個變數。

D1 建表程式：`migrations/crew-auth/0001.sql`（登入三表）、`migrations/crew-auth/0002_guest_trials.sql`（會員用量與防重放）。**變數綁定不會自動執行 SQL migration**。用量是持久資料，改試用次數不應清空資料表。

**程式來源：** `server/crew-auth.mjs`、`functions/api/auth/**`、`server/crew-guest-ticket.mjs`；完整 OAuth 與部署流程見 [crew-auth.md](crew-auth.md)。

## 2. Worker Production：五分鐘 Gemini 試用

| 名稱 | 類型／所在位置 | 用途與是否必要 |
| --- | --- | --- |
| `GEMINI_GUEST_API_KEYS` | **Secret**（建議） | 你的服務端 Gemini Key 清單，**逗號分隔**即可，最多 20 把；每次抽一把只呼叫一次 Gemini 建 Token。Key 不會回傳給用戶 |
| `GEMINI_GUEST_API_KEY` | **Secret**（舊單把相容） | 未配置 `GEMINI_GUEST_API_KEYS` 時才用。若多 Key 變數存在但格式錯誤，**不會偷偷回退**單把 |
| `TURNSTILE_SECRET_KEY` | **Secret** | Cloudflare Turnstile Server-side 驗證憑證，Worker 必要；也支援別名 `GUEST_TURNSTILE_SECRET`，後者優先 |
| `GUEST_TURNSTILE_SECRET` | **Secret**（可選替代名） | Worker 程式接受的 Turnstile Secret 名稱。與 `TURNSTILE_SECRET_KEY` 二選一即可，避免設成不同值 |
| `GUEST_TURNSTILE_SITE_KEY` | **Text／公開站台 Key** | 瀏覽器顯示 Turnstile 挑戰；此值可公開，**不是** Server Secret。現已在 `wrangler.toml` 的 `[vars]` 宣告 |
| `GUEST_TRIAL_RATE_LIMITER` | **Rate Limiting Binding**（不是 Text） | Worker 每節點約 60 秒 1 次的發 Token 速率限制；保護服務但**不是全球／每帳號硬成本上限**；設定見 `wrangler.toml` |
| `GUEST_TRIAL_ENABLED` | **Text**：`1`／`0` | `1` 開放試用；`0` 緊急關閉免費試用。已在 `wrangler.toml` 設 `1`；不影響使用者自己的 Gemini Key |
| `CREW_AUTH_DB` | **D1 Binding** → 同一個 `crew-auth` | 會員試用扣次數、一次性票券 nonce；會員計次模式必要。不能誤綁匿名配額的 `GUEST_DB` |
| `CREW_GUEST_TICKET_SECRET` | **Secret** | 驗證 Pages 簽發的會員 HMAC 票券；必須跟 Pages Production **完全同值**，長度至少 32 字元 |
| `GUEST_ACCOUNT_METER_ENABLED` | **Text**：`1`／`0`／不設定 | `1` 登入會員每天最多 3 次（台灣時間 00:00 重置）、每次 300 秒；**匿名訪客保留原本流程**（前提是 `GUEST_REQUIRE_SIGNIN=0`） |
| `GUEST_REQUIRE_SIGNIN` | **Text**：`1`／`0`／不設定 | `1` 所有人試用都要登入，並且隱含啟用會員計次；**與上一項不同**，未準備好不要開 |
| `GUEST_ALLOW_PREVIEW` | **Text**（可選，預設不設定） | 僅讓符合規則的 Pages Preview host 進入後端的主機名稱檢查；正式環境不要隨意設 `1`，並非安全驗證替代品 |

**五分鐘與三次不是同一個設定：** `seconds=300`（前端硬停止）、Gemini Token 約 310 秒到期、新連線窗口 30 秒；會員**每天最多 3 次**（台灣時間 00:00 重置）由 Worker 的 D1 原子條件更新限制，Pages `/api/auth/session` 同步顯示 `trial.used / trial.limit`。**成功發出一個 Gemini Token 就計一次，即使語音 10 秒便結束也一樣**。Token 發放失敗會嘗試退回額度，而已使用過的簽章票券不可重放。

**重要：** 配額 3 次目前寫在程式（`functions/api/guest/token.js` 的 `MEMBER_TRIAL_LIMIT` 與 `server/crew-auth.mjs` 的 `MEMBER_TRIAL_LIMIT`），**不是 Cloudflare 上可填的數字環境變數**。往後要改成 5 次，須同步修改兩處與測試、部署 Pages 和 Worker。D1 已使用次數會保留，依 `updated_at` 判斷是否屬於台灣當日；隔日讀取會顯示 `used:0`，當日首次發放時原子性重設計數。不需另做資料庫 migration。

### 匿名 D1 限制（選配，請勿跟會員 D1 混用）

| 名稱 | 類型 | 用途 |
| --- | --- | --- |
| `GUEST_DB` | **另一個 D1 Binding** | 選配匿名試用資料庫（示例名稱 `crew-guest-trials`）；**不是 `crew-auth`** |
| `GUEST_HASH_SALT` | **Secret** | 只有啟用匿名 D1 指紋／去重時才需要；長隨機私密 Salt |
| `GUEST_DAILY_SESSION_LIMIT` | **Text**，正整數 | 只有啟用匿名 `GUEST_DB` 時需要，每日配額上限；不是會員 3 次 |
 
目前 `wrangler.toml` 的 `GUEST_DB` 仍是**註解範例**。沒有該 Binding 時走既有 Turnstile + Rate Limiter 的匿名流程。**不要為了會員三次配額另外建立 `GUEST_DB`**。匿名 D1 腳本參見 `migrations/guest-trial.sql`，只有決定啟用才做。

**程式來源：** `workers/guest-trial/worker.mjs`（`TURNSTILE_SECRET_KEY` 別名與跨網域 Origin 保護）、`functions/api/guest/token.js`（驗證／發 Token／D1 配額）、`workers/guest-trial/wrangler.toml`、[crew-guest-trial-v2.md](crew-guest-trial-v2.md)。

### Video Lab TTS（沿用 Crew Web 現有 Gemini Key）

Crew Video Lab 使用同一個 `crew-guest-trial` Worker 的 `GEMINI_GUEST_API_KEYS` / `GEMINI_GUEST_API_KEY`；沒有新增 Gemini Secret。正常不需另設新變數或執行 D1 migration：只有在 `crew-social-agent` 的受保護 main 任務 JSON 明確設定 `enabled:true` 且包含合法新任務時，Worker 才自動建立該專用表並生成語音。需要緊急停用可將 Worker Production 的 `CREW_VIDEO_TTS_ENABLED` 設為文字 `0`。Worker 每 5 分鐘檢查公開 repo `magic76/crew-social-agent` 的受保護 main 分支任務，單一 UTC 日最多 3 次，一次一段最長 300 字。結果存 D1 最多 7 天，讀取路徑為 `/api/video/tts/result?id=...`。公開結果不適合私人配音內容。關閉設為 `0`；此模組不修改 Live 試用次數與介面，也不消耗 GitHub Actions。詳細請參閱 [CREW_VIDEO_TTS.md](CREW_VIDEO_TTS.md)。

## 3. Pages Production：管理員使用統計／Cloudflare Access

| 名稱 | 類型 | 用途 |
| --- | --- | --- |
| `ANALYTICS_ENGINE` | **Analytics Engine Binding**，dataset `crew_usage` | `POST /api/usage/event` 寫入匿名使用事件；缺少時事件 API 返回 503，網站其他功能仍可使用 |
| `CREW_USAGE_ACCOUNT_ID` | **Text**，Cloudflare Account ID | 報表 API 的帳戶路徑識別碼；**不是 Token／Secret** |
| `CREW_USAGE_SQL_TOKEN` | **Secret**，唯讀 Cloudflare API Token | 只供 `/api/usage/report` 查詢 Analytics Engine SQL API。給需要的讀取權限，**不要用 Global API Key 或管理權限 Token** |
| `CREW_USAGE_ACCESS_ISS` | **Text**，例如團隊 `https://<team>.cloudflareaccess.com` | Cloudflare Zero Trust Access JWT 的 Issuer，用來驗簽與驗來源 |
| `CREW_USAGE_ACCESS_AUD` | **Text** | **保護報表 API 的 Access App Audience Tag**；與 App 設定一致，分別建立的兩個 App 要用 API 所屬 App 的 AUD |
| `CREW_USAGE_ADMIN_EMAIL` | **Text**（個人資料） | 管理員 Email 白名單，需與 Access 驗證身分一致；不是 OAuth Client Secret，也不要記入公開文件實際地址 |

**路由分界：** Cloudflare Access 應保護 `/usage*` 及 `/api/usage/report`，**不要保護** `/api/usage/event` 或整站；不要把訪客 Google／GitHub OAuth 登入當成管理員的 Access 驗證。詳細見 [CREW_USAGE.md](CREW_USAGE.md)。

**其他統計識別碼：** GA4 Web Measurement ID `G-563JSM2X68` 是**公開識別碼，不是 Cloudflare Secret**；Cloudflare Web Analytics/RUM 透過 Dashboard 啟用，一般不必手動新增 API Token 或自行插入第二份 Beacon。

## 4. Pages：其他可選功能

| 名稱 | 類型 | 用途 |
| --- | --- | --- |
| `BOOKS_DB` | **D1 Binding**（可選） | `/api/books` 的書籍／留言儲存資料庫，不是會員資料庫 |
| `BOOKS_INVITE_CODE` | **Secret**（可選） | Books API 的邀請碼／受控入口。**兩者都設定**才會開啟 Live Books API；未設定時該 API 回 `BOOKS_NOT_CONFIGURED`，不影響其他產品 |

DB migration 在 `migrations/books/`。不要把 Books 邀請碼用作 Cloudflare Access 密碼、會員登入 Secret 或公開的前端環境變數。

## 5. 和 Cloudflare 有關，但「不應填到 Cloudflare」的 GitHub／R2 設定

| 名稱／組別 | 位置 | 目的與現況 |
| --- | --- | --- |
| `CREW_BRIEFING_GEMINI_KEY` | **GitHub Actions Secret** | 每日 Briefing 的 AI 摘要；配合選用 `CREW_BRIEFING_MODEL`（預設 Gemini 2.5 Flash） |
| `GEMINI_API_KEY` | **GitHub Actions Secret／本機** | 手動生成 Shorts 文案／圖片；`SHORTS_TEXT_MODEL`、`SHORTS_IMAGE_MODEL`、`SHORTS_IMAGE_PROVIDER` 為相關可選變數。**不要當作 Worker 的免費試用 Key** |
| `CREW_CONTRACT_READ_TOKEN` | **GitHub Actions Secret** | 只讀取跨 Repo Android／Web 共同契約，檢查兩端是否漂移；與 Cloudflare OAuth 無關 |
| `GITHUB_TOKEN`／`github.token` | **GitHub Actions 內建 Token** | Actions 在授權範圍內提交產物／處理 GitHub 資源，非手動建立的 Cloudflare Token |
| `CREW_SHORTS_R2_ACCOUNT_ID`、`CREW_SHORTS_R2_BUCKET`、`CREW_SHORTS_MEDIA_ORIGIN` | **未啟用的 R2 發布腳本環境參數** | 未來 `scripts/publish-shorts-r2.mjs` 將媒體轉入 R2 時才需要，依序是 Account ID、Bucket、公開網域 |
| `AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY` | **R2 S3 API 存取憑證** | 只供上述選配的 R2 S3 相容發布；後者是高敏 Secret，不能混用 Cloudflare Global API Key；最小權限、限制 Bucket |

**現行 Shorts：** 16 Friends 的已審核文字和 WebP 是 GitHub Actions 發布到 **Cloudflare Pages**；**不需要建立 R2 Bucket、R2 API Key 或再付費開新的媒體服務**。參見 [CREW_SHORTS.md](CREW_SHORTS.md) 與 `content/crew-shorts/README.md`。

**一般訪客自備 Gemini Key（BYOK）**存放在使用者本機／其裝置流程，與管理員 Worker `GEMINI_GUEST_API_KEYS` 完全不同；不能把用戶的 BYOK 當成 Cloudflare 公用 Key。

## 6. 舊變數／不該再增加的設定

| 名稱 | 判定 | 處理建議 |
| --- | --- | --- |
| `AUTH_SESSION_SECRET` | 目前 OAuth Session **不使用** | 不必新建；若曾設過，先確認沒有其他外部服務依賴再移除 |
| `GUEST_QA_ENABLED`、`GUEST_QA_ALLOW_PRODUCTION`、`GUEST_QA_UNTIL`、`GUEST_QA_ACCESS_TOKEN`、`GUEST_QA_RATE_LIMITER` | 舊 `/api/guest/qa` 測試流程已移除，現行 Worker 不使用 | **可列入清理候選**，但要先確認 Cloudflare 的部署／外部調用是否仍有依賴；別刪正式 Gemini、Turnstile Secrets |
| `GUEST_ACCOUNT_METER_ENABLED`、`GUEST_REQUIRE_SIGNIN` | **不是舊變數**；是有效上線開關 | 不要為了整理而刪掉／設成 `1`；先依正式產品策略和 smoke test 決定 |
| `GUEST_DB`、`GUEST_HASH_SALT`、`GUEST_DAILY_SESSION_LIMIT` | 選配匿名 D1 配額，非已淘汰 | 若沒有啟用匿名 D1，先保持未配置；不要誤認是會員額度的必要設定 |

## 7. 上線順序、快速驗證與排錯

1. **先確認 Pages** 的 OAuth 及 D1：開 `https://www.3sssi.com/api/auth/health` 看 Providers + 三個登入表（只有存在性，**不是登入成功證明**）；到 `https://www.3sssi.com/account` 實際登入 Google／GitHub，然後在**同一瀏覽器**開 `https://www.3sssi.com/api/auth/session`，`user` 應非 `null`，會員試用額度應為 `limit:3`（若已執行 Phase 3 migration）。
2. **再確認 Worker**：Cloudflare Workers Builds 必須真的顯示 **Deploy success**，不能只看 GitHub Actions PR CI。Worker Builds 的 Root directory：`workers/guest-trial`，Build command 留空，Deploy command：`npx wrangler deploy`；`wrangler.toml` 保留 D1 與 Rate Limiter Binding。通常部署順序 **Pages → Worker**。
3. **查 Worker GET 時要帶 Origin**：Worker 會拒絕沒有 `Origin` header 的直接 API 瀏覽。可由終端機執行以下**不含任何 Secret**的測試：

   ```sh
   curl -i -H 'Origin: https://www.3sssi.com' \
     'https://crew-guest-trial.shanliyoung.workers.dev/api/guest/token'
   ```

   正常應回 JSON `enabled:true`、`seconds:300`。若已啟用 `GUEST_ACCOUNT_METER_ENABLED=1`，會有 `memberMetering:true`；`GUEST_REQUIRE_SIGNIN=1` 則多 `signinRequired:true`。這只是 GET 設定，不會消耗試用次數。
4. **再測會員次數**：帳號顯示 `used:0 / limit:3` → 成功領取一個臨時 Gemini Token 後 `used:1`，同一台灣日最多成功三次，第四次應收到 `429 ALREADY_USED`；台灣時間午夜後再次確認剩餘 3 次。同一張票券再次提交永遠無效；若領取失敗，應檢查次數是否退還。受 Worker 每節點 1 次／60 秒限制，**不要把 `429 DAILY_LIMIT` 當成會員已用完**。
5. **分階段切換與回滾**：先 `GUEST_ACCOUNT_METER_ENABLED=1`、`GUEST_REQUIRE_SIGNIN=0`（會員計數、匿名仍可）；強制所有人登入是**另一個上線決策**。若有問題，兩者改回 `0` 並重新部署 Worker。這不會重置 D1 紀錄，也不會關閉 BYOK。

### 常見症狀查哪裡

| 症狀 | 先查什麼 |
| --- | --- |
| 網頁空白／Modules MIME `text/html` | Cloudflare Pages build／assets 版本、部署與快取，不是先重設 OAuth Secrets |
| OAuth 返回 `auth_error=failed&auth_stage=token` | 是否部署了支援 Cloudflare Worker `redirect:"manual"` 的修正版；再看 `auth_reason` 安全代碼與 OAuth callback URI，勿貼原始 code/Secret |
| `/api/auth/session` 的 `user:null` | 未成功登入、Cookie 或 OAuth 回呼；`/api/auth/health` 全綠不代表 Session 已登入 |
| Worker GET `enabled:false` | Worker Logs 搜尋 `crew_guest_trial_configuration` 的 **reason**（例如 Key、Turnstile、limiter、會員 D1/簽章設定缺失），不要把 Secret 值寫到 Logs |
| Worker GET `Origin rejected` | 直接打 API 時沒有 `Origin: https://www.3sssi.com`；不是一定部署失敗 |
| 使用者得到 `ALREADY_USED` | 會員今日 `used >= 3` 或重複送出同一個短效票券；看帳號 Session 的今日配額 |
| 使用者得到 `DAILY_LIMIT` | Worker Rate Limiter／選配匿名每日限制；**跟會員 3 次的拒絕碼不同** |
| 登入後會員票券回 `503`／`401` | 檢查兩邊的 `CREW_GUEST_TICKET_SECRET` 同值、`CREW_AUTH_DB` 指到同一 D1、Pages 部署及 Session Cookie |
| `/usage` 無報表 | Cloudflare Access 登入／AUD／ISS／Admin Email，再確認 `CREW_USAGE_ACCOUNT_ID`、唯讀 `CREW_USAGE_SQL_TOKEN`、Analytics Engine Binding |
| Cloudflare Workers Builds 失敗 | 開失敗 Build 的 **Build Logs**；確認 Root directory、Deploy command、Binding、Secret 和最後一次成功部署。GitHub CI 成功不等於 Worker 部署成功 |

## 8. 變更與定期盤點守則

- **新變數**：確認屬於 Pages、Worker 或 GitHub Actions；文件新增名稱、型別、何時需要、回滾方式，再部署。避免相同概念在不同地方亂取名字。
- **輪替 Secret**：先完成供應商端憑證替換；Pages／Worker 有**同值要求**的 `CREW_GUEST_TICKET_SECRET` 必須協調換新且重新部署兩端，切換期間舊票券可能失效。勿把 Secret 貼到 Issue、PR、聊天、截圖或 CI log。
- **移除變數**：先 grep 目前程式與 workflow、核對 Dashboard 使用環境，再刪除。**不要盲刪舊 OAuth 別名或 Worker Secrets**；保留可回滾版本。
- **檢查權限**：Analytics SQL Token 只讀；OAuth 限定必要範圍；R2 只允許必要 Bucket；GitHub Token 僅最低權限。關鍵憑證定期輪替並監控費用、Gemini 配額。
- **確認實際 Dashboard**：以這份清單逐項檢查 Binding 存在／Secret 已設定（**不要讀值**）、Production/Preview 是否正確、最後部署時間與用量；若未設定，明確註明「未啟用」而非當作部署錯誤。

## 9. 設定來源索引

- 正式部署：`docs/cloudflare-migration.md`、`.github/workflows/crew-spa.yml`
- OAuth 與 D1：`docs/crew-auth.md`、`server/crew-auth.mjs`、`migrations/crew-auth/`
- Worker：`workers/guest-trial/wrangler.toml`、`workers/guest-trial/worker.mjs`、`functions/api/guest/token.js`、`docs/crew-guest-trial-v2.md`
- Analytics／Access：`docs/CREW_USAGE.md`、`functions/api/usage/`
- Books：`functions/api/books.js`、`migrations/books/`
- Shorts（現行 Pages）：`docs/CREW_SHORTS.md`、`content/crew-shorts/README.md`、`.github/workflows/crew-shorts-pages.yml`
- AI 定期任務／可選 R2：`.github/workflows/crew-briefing-daily.yml`、`.github/workflows/crew-shorts-daily-generate.yml`、`scripts/publish-shorts-r2.mjs`
