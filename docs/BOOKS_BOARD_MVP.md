# 媽媽友小圈圈 /circle — 私密交流板 MVP

## 定位與範圍
專給媽媽友交換資訊、分享好物、詢問生活大小事的私密交流板，不是 Crew 的 AI 功能，也不是公開電商。**主站沒有新增選單入口、沒有 sitemap、沒有 SEO 索引**。

- 中文手機優先、無需 Gemini Key。
- 看貼文、搜尋及雙層篩選：交流主題（書籍／玩具／學用品／衣物制服／活動情報／育兒生活／其他）、貼文目的（分享／詢問／交換／出售／贈送／徵求）。
- 發文者可寫標題、描述、暱稱與主題；只有出售類型需要價格（不含聯絡方式）。
- 可留言，分享者能將貼文改為開放中、已保留、已完成。
- 原刊登者可在原本瀏覽器檢視「我的貼文」、編輯或刪除。正式模式支援每篇最多 3 張圖片；上傳時前端壓縮至 1280px / 750 KiB 以內並移除 EXIF。
- 群組成員可以檢舉貼文；持有獨立管理密碼的管理員可檢視檢舉並刪除貼文。
- 進站預設可玩本地示範模式。**本地示範資料只在同一瀏覽器的 localStorage，不是跨裝置的資料庫。**
- 真正共用資料需要 Cloudflare Pages + D1 + 群組邀請碼。正式貼文與留言不公開，群組成員持邀請碼才可讀寫。

## Cloudflare 後台啟用正式共用模式（站主操作）

1. Cloudflare Dashboard → Workers & Pages → D1 SQL database → Create database，名稱可用 `crew-family-circle`（既有 `crew-book-board` 可直接沿用）。
2. 新資料庫：在 D1 Console **依序**執行 `migrations/books/0001_init.sql`、`0002_circle_topics.sql`、`0003_circle_media_moderation.sql`。**已經執行 0001/0002 的舊資料庫，只執行尚未執行的 migration；不可重跑 0002 ALTER 或清空資料。**
3. Pages 專案 → Settings → Bindings → Add → D1 database。**Variable name 必須是 `BOOKS_DB`**，選剛建立的資料庫。Production 與 Preview 都要使用時，分別設定綁定（建議不同 D1 庫以避免測試污染）。
4. Cloudflare → R2 → Create bucket：`crew-circle-images`，儲存類型選 **Standard**，**不需設定 public bucket / r2.dev / 自訂網域**。Pages → Settings → Bindings → Add → R2 bucket，Variable name **`CIRCLE_IMAGES`**，指向此 bucket。
5. Pages 專案 → Settings → Variables and Secrets → Add：建立 **Encrypted secrets**：`BOOKS_INVITE_CODE`（至少 12 個隨機字元，分享給媽媽友）、`CIRCLE_ADMIN_CODE`（至少 16 個隨機字元，**僅管理員持有、不可分享給會員**）。不要放進前端程式、GitHub 或網址 query。
6. **重新部署 Pages**（綁定、Secrets 變更後需要新部署）。打開 `https://www.3sssi.com/circle/`，使用邀請碼加入，兩台手機分別刊登、留言、查看圖片；用原刊登手機編輯／刪除貼文，另一台重整驗證同步。
7. 如果想驗證 Preview，請分開設定 Preview 環境的 D1 / R2 / Secrets，建議用另外的測試庫與 bucket，避免誤刪 Production 資料。未設定時只能玩本機示範模式。

> Pages Functions：貼文 API 為 `functions/api/books.js`（`/api/books`）；私人照片 API 為 `functions/api/circle/photo.js`（`/api/circle/photo`）。`_routes.json` 只允許上述 API 與既有 Analytics API。Cloudflare 建置使用 `npm run build:cloudflare`。

## 安全與已知限制

- 這是小群組 MVP，使用**共用邀請碼**而非個人帳號；有邀請碼的人皆能以任意暱稱發文／留言，因此不能保證真實身分。不要把邀請碼公開貼在網站或社群。
- 原刊登者的修改憑證保留在刊登當時瀏覽器的 localStorage；清除資料或換裝置會失去修改能力。管理員只能依檢舉刪文，不提供帳號復原、逐人登入或專業內容審核；不適合大型公開社群。
- 不處理交易付款、運費、面交地址、私人電話或站內聊天。照片上傳最多 3 張，僅正式模式可用；採用有邀請碼才能讀取的私人 R2 API，**不可開啟 R2 公開存取**。
- 所有正式讀寫都由 D1 保存，沒有把邀請碼寫入資料庫，原刊登者憑證在 D1 只存 SHA-256。
- 這不是完整 abuse protection：真要對外擴大公開，先加 Cloudflare Turnstile / rate limiting、逐人帳號登入、管理檢舉與圖片審核。
- 介面阻止已完成貼文留言，API 也驗證狀態；MVP 不提供私訊或個資欄位，但自由文字仍可能被張貼個資，應提醒使用者避免。
- D1 schema **不會自動遷移**；須先依序執行 `0002_circle_topics.sql` 和 `0003_circle_media_moderation.sql`（已執行的不要重跑）。未啟用 R2 時，文字貼文仍能使用，但照片會提示未設定。

## 驗收
- `npm run check:web`、`npm test`、`npm run build:cloudflare`、`npm run test:cloudflare`
- 在無 D1 / Secret 時，示範模式可以刊登、留言、搜尋、切換狀態，刷新本機仍保留；正式模式會顯示尚未設定，不會誤用本機資料。
- 正式模式：錯誤邀請碼 → 401；未設定 → 503；非同源的 POST → 403；正確邀請碼 → D1 跨裝置同步。
- `/circle/` 回傳 noindex 專屬入口；不再產生 `/books/` 靜態頁面或路由。`/api/usage/*` 既有分析路由不受影響。

## 後續（非 MVP）
完整個人帳號與復原、Cloudflare Turnstile / rate limiting、防大量檢舉濫用、逐人權限、群組隔離、留言通知、照片內容審核。

## 舊資料與技術名稱相容性

- 之前的前端 localStorage (`crew_books_*`) 會沿用，維持本機刊登憑證、暱稱、邀請碼的可用性。舊示範範例會更新成多主題示範，使用者自己新增的示範貼文不會刪除。
- `functions/api/books.js`、`/api/books`、`BOOKS_DB`、`BOOKS_INVITE_CODE` 和 `book_posts` 暫時保留原名，以避免破壞既有部署與資料；它們是**內部相容層**，不是對外產品名稱。
- 舊的 `kind` 欄位有 SQLite CHECK 限制，新的 `post_type` 欄位用來保存 `share` / `ask` 等擴充類型；既有紀錄用 `COALESCE(post_type, kind)` 回復原本類型。

## 管理員測試

1. 在正式群組頁面點「管理員入口」，只在本次頁面輸入 `CIRCLE_ADMIN_CODE`。
2. 以另一個會員身分在貼文上「檢舉」，輸入至少 5 字原因。
3. 管理員點「查看檢舉」後可以選擇「移除貼文」，相關留言及圖片會一併刪除；此操作無法復原。
4. `CIRCLE_ADMIN_CODE` 不得與邀請碼相同，且應另外保管。現階段無每人身分驗證與濫用控制，不建議公開分享群組邀請碼。
