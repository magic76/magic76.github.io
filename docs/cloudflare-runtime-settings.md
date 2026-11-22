# Koolo Cloudflare Pages 環境變數／Bindings 用途清單

> 這是**程式碼設定契約**，不代表已核對你 Cloudflare 後台每個變數的實際值。不要把金鑰、Session、使用者完整 ID 或其他私密值提交到 GitHub。
>
> Cloudflare Pages 後台主要提供 Variable name、Value、Text/Secret 等設定；官方文件未列出可直接填寫用途註解的欄位，所以用途集中維護在這份文件。

## 綠界付款沙盒（目前已實作，必須手動開啟）

| Cloudflare 設定名稱 | 類型 / 範圍 | 用途 | 範例 / 建議 | 使用位置 |
| --- | --- | --- | --- | --- |
| `KOOLO_ECPAY_STAGE_ENABLED` | **Text**；Pages **Production runtime** | 是否開啟只供允許帳號使用的綠界測試環境；只有字串 `1` 啟用 | `1` = 開啟測試；`0` 或未設定 = 關閉 | `server/koolo-ecpay-stage.mjs` |
| `KOOLO_ECPAY_TEST_USER_IDS` | **Text**；Pages **Production runtime** | 控制可建立及查看測試訂單的 Koolo 帳號；接受 `crew_auth_users.id` / `/api/auth/session` 的 `user.id` | 只填本人完整 UUID；多帳號以逗號分隔，**不要填 `*`** | `server/koolo-ecpay-stage.mjs` |
| `CREW_AUTH_DB` | **D1 Database Binding**；Pages Production | 指向既有會員登入 D1。測試訂單 `0009`、正式命理報告 `0006`、語音錢包 `0008` 都必須建在**同一個** DB | 綁定現有 Koolo auth D1，**不要新建 DB** | `server/crew-auth.mjs`, `server/koolo-ecpay-stage.mjs`, `server/koolo-fortune-reports.mjs`, `server/koolo-voice-credits.mjs` |

**目前沒有真正收款**：沙盒使用綠界公開測試商家代號和測試金鑰，只有 `payment-stage.ecpay.com.tw` 的測試付款。沙盒訂單存在 `koolo_fortune_stage_orders`，無權限開通真正的 `koolo_fortune_orders` 或語音額度。

**部署步驟**：到 **Cloudflare → Workers & Pages → Koolo Pages 專案 → Settings → Variables and Secrets → Production** 設定前兩個 Text；`CREW_AUTH_DB` 在 **Settings → Bindings → D1 database**。設定完成需確認新部署已套用，測試入口為 `koolo.app/fortune/ecpay/test`。

## NT$379 私人命書驗收台（僅限管理員）

| Cloudflare 設定名稱 | 類型 / 範圍 | 用途 | 設定方式 |
| --- | --- | --- | --- |
| `KOOLO_ADMIN_EMAILS`（沿用後台） | **Text**／Production runtime，已設定者無須重設 | 與 `/usage` 後台同一套 Google 已驗證管理員權限（也支援原本 Cloudflare Access 的驗證） | **不新增命理專用 UUID 名單**。報告仍需 Koolo 登入以綁定使用者帳號 |
| `KOOLO_FORTUNE_LAB_GEMINI_KEY` | **Secret**／Production runtime | 伺服器端生成私有命書使用的 Gemini Key | 必須填有效 Key，**不要用 `VITE_*`，不要提交至 GitHub** |
| `KOOLO_FORTUNE_LAB_MODEL` | **Text**／Production runtime，可省略 | 命書使用的 Gemini 文字模型 | 預設 `gemini-2.5-flash`；必要時改成該 Key 可用的文字模型 |

**不需要再設定 `KOOLO_FORTUNE_LAB_ENABLED`**，驗收台直接沿用後台管理權限（仍需 Koolo 登入）。

**必要前置**：在既有 `CREW_AUTH_DB` 執行 `migrations/crew-auth/0010_fortune_lab.sql`，再部署 Pages。獨立管理員驗收網址為 `koolo.app/fortune/report-lab`，前端報告生成 API 為 `/api/fortune/report-lab`；權限由現有 `/api/usage/admin` 的 `verifyAccess` 判斷，只有已登入 Koolo 且能通過後台權限的管理員能使用。一般使用者沒有導覽入口也無法取得畫面或報告。正式金流與其他報告資料表不受影響。

詳細說明：`docs/koolo-fortune-private-report-lab.md`。

## 會員 OAuth（既有正式登入）

程式接受以下兩組命名規則的 **任一完整配對**；不要把 Client Secret 設為可公開的 Build variable。

| 用途 | 支援的設定名稱 | 類型 |
| --- | --- | --- |
| Google 登入 | `CREW_AUTH_GOOGLE_CLIENT_ID` + `CREW_AUTH_GOOGLE_CLIENT_SECRET`，或 `GOOGLE_OAUTH_CLIENT_ID` + `GOOGLE_OAUTH_CLIENT_SECRET` | Client ID：Text；Client Secret：**Secret** |
| GitHub 登入 | `CREW_AUTH_GITHUB_CLIENT_ID` + `CREW_AUTH_GITHUB_CLIENT_SECRET`，或 `GITHUB_OAUTH_CLIENT_ID` + `GITHUB_OAUTH_CLIENT_SECRET` | Client ID：Text；Client Secret：**Secret** |

來源：`server/crew-auth.mjs` 的 `creds()`。現有登入如正常運作，**不需因這份文件重設或改名**。

## 尚未啟用：未來正式金流

正式綠界 MerchantID、HashKey、HashIV 的 **Cloudflare Secret 名稱尚未確定／尚未實作**，不要因這份清單自行新增猜測的設定名稱。待正式收款 PR 明確定義環境變數、伺服器驗章及金流安全閘門，再將其補入這份表，並與測試設定明確區隔。**絕不在此文件填入正式金鑰值。**

## 自己驗證

1. 登入 Koolo，在 `koolo.app/api/auth/session` 檢查 `user.id` 是否符合測試白名單設定；勿把完整 ID 貼到公開區域。
2. `GET koolo.app/api/fortune/ecpay/test-config`：允許帳號／測試已啟用／0009 存在 → **200**；未登入 → **401**；白名單不符 → **403**；功能關閉或資料表不存在 → **503**。
3. 在 `koolo.app/fortune/ecpay/test` 確認只顯示 **沙盒** 結帳及示範報告，沒有正式收款按鈕。
4. 完成測試後，可把 `KOOLO_ECPAY_STAGE_ENABLED` 改成 `0` 並確認部署生效；測試資料不會因此被清空。

詳細驗收：`docs/koolo-ecpay-stage-acceptance.md`。
官方 Cloudflare Pages Bindings 說明：https://developers.cloudflare.com/pages/functions/bindings/
