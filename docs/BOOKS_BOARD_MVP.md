# 書友交換板 /books — 小圈圈 MVP

## 定位與範圍
專給媽媽友的小型二手書資訊交換板，不是 Crew 的 AI 功能，也不是公開電商。**主站沒有新增選單入口、沒有 sitemap、沒有 SEO 索引**。

- 中文手機優先、無需 Gemini Key。
- 看貼文、搜尋、篩選：交換／出售／贈送／徵求。
- 分享者可刊登書名、描述、暱稱、出售價格（不含聯絡方式）。
- 可留言，分享者能將貼文改為開放中、已保留、已完成。
- 進站預設可玩本地示範模式。**本地示範資料只在同一瀏覽器的 localStorage，不是跨裝置的資料庫。**
- 真正共用資料需要 Cloudflare Pages + D1 + 群組邀請碼。正式貼文與留言不公開，群組成員持邀請碼才可讀寫。

## Cloudflare 後台啟用正式共用模式（站主操作）

1. Cloudflare Dashboard → Workers & Pages → D1 SQL database → Create database，名稱可用 `crew-book-board`。
2. 在 D1 Console 執行 `migrations/books/0001_init.sql` 的內容，建立 `book_posts`、`book_comments` 兩張表。
3. Pages 專案 → Settings → Bindings → Add → D1 database。**Variable name 必須是 `BOOKS_DB`**，選剛建立的資料庫。Production 與 Preview 都要使用時，分別設定綁定（建議不同 D1 庫以避免測試污染）。
4. Pages 專案 → Settings → Variables and Secrets → Add Secret：`BOOKS_INVITE_CODE`，設定至少 12 字元、不容易猜測的隨機邀請碼。不要放進前端程式、GitHub、群組截圖或網址 query。
5. 重新部署 Pages。部署後打開 `https://www.3sssi.com/books/`，點「輸入邀請碼」，測試兩台裝置輸入同一碼，第一台刊登，第二台重整後看得到並可留言。
6. 如需 Preview 測試，確認 Cloudflare Pages Preview 的 Functions / Bindings 已設定；未設定時仍可玩示範模式。

> Pages Functions 路由設在 `functions/api/books.js`，靜態 Functions 路由白名單在 `_routes.json` 的 `/api/books`。本專案 Cloudflare 建置依然使用 `npm run build:cloudflare`。

## 安全與已知限制

- 這是小群組 MVP，使用**共用邀請碼**而非個人帳號；有邀請碼的人皆能以任意暱稱發文／留言，因此不能保證真實身分。不要把邀請碼公開貼在網站或社群。
- 原刊登者的修改憑證保留在刊登當時瀏覽器的 localStorage；清除資料或換裝置會失去修改能力。沒有管理員刪文後台，不適合在大型公開社群直接上線。
- 不處理交易付款、運費、面交地址、私人電話、站內聊天，也**尚未支援照片上傳**；第一版用簡單封面視覺降低維護與資料安全成本。
- 所有正式讀寫都由 D1 保存，沒有把邀請碼寫入資料庫，原刊登者憑證在 D1 只存 SHA-256。
- 這不是完整 abuse protection：真要對外擴大公開，先加 Cloudflare Turnstile / rate limiting、逐人帳號登入、管理檢舉與圖片審核。
- 介面阻止已完成貼文留言，API 也驗證狀態；MVP 不提供私訊或個資欄位，但自由文字仍可能被張貼個資，應提醒使用者避免。
- D1 schema 目前不做自動遷移；增加欄位要另寫 migration。

## 驗收
- `npm run check:web`、`npm test`、`npm run build:cloudflare`、`npm run test:cloudflare`
- 在無 D1 / Secret 時，示範模式可以刊登、留言、搜尋、切換狀態，刷新本機仍保留；正式模式會顯示尚未設定，不會誤用本機資料。
- 正式模式：錯誤邀請碼 → 401；未設定 → 503；非同源的 POST → 403；正確邀請碼 → D1 跨裝置同步。
- `/books/` 回傳 noindex 專屬入口，不渲染錯誤的 Crew 首頁；`/api/usage/*` 既有分析路由不受影響。

## 後續（非 MVP）
單張書封照片上傳（R2）、管理員審核與刪文、個人身分驗證與密碼重置、群組隔離、留言通知。
