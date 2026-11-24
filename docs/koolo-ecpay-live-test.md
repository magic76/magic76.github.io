# 正式綠界金流驗證台（僅管理員）

- 網址 https://koolo.app/admin/payment-test ，沿用 /usage verifyAccess + Koolo 登入。僅 canonical koolo.app。
- 正式 Pages runtime：ECPAY_MERCHANT_ID（Text 或 Secret），ECPAY_HASH_KEY、ECPAY_HASH_IV（Secret），ECPAY_ENV=production（Text），ECPAY_ENABLED=false（Text，只有 true 開啟建立訂單）。不使用 VITE_ 或將值放到 GitHub。
- 在既有 CREW_AUTH_DB 執行 migrations/crew-auth/0011_ecpay_live_test.sql（可重複執行），不要建新 DB。部署後先確認關閉狀態的設定檢查。格式通過不等於綠界接受金鑰。
- 確認綠界特店合約允許驗證交易、測試金額與付款人；不要違反自行刷卡規範。確認適用費用。需要真實扣款時才設定 ECPAY_ENABLED=true 並重新部署。
- 管理員勾選確認、建立固定 NT$10 訂單，再明確點選前往綠界正式付款。核對 payment.ecpay.com.tw 網域及金額；不要在 Koolo 輸入信用卡資訊。重新整理建立頁不會再次簽發付款表單。全站每天最多三筆（rolling 24h）。
- 付款回傳 POST https://koolo.app/api/fortune/ecpay/live-test-notify，不須瀏覽器 cookie；Cloudflare Access/WAF 不得阻擋綠界 POST。驗章、金額、MerchantID、訂單、信用卡、SimulatePaid=0、交易號及重放保護。瀏覽器返回不標記付款；開關關閉仍處理既有回傳。查看 /admin/payment-test 交易紀錄。
- 收到成功通知後，按向綠界查詢訂單，驗證 QueryTradeInfo/V5 的簽章、特店、訂單、金額和交易號一致。未收到通知先等待付款後至少 10 分鐘，單筆 10 分鐘冷卻，403 冷卻至少 30 分鐘。查詢不會變更付款通知紀錄，不會開通商品。
- 在 https://vendor.ecpay.com.tw/ 後台核對交易編號，依綠界信用卡狀態人工取消授權或退款，保存退款結果；本站不提供退款 API、不自動宣告退款成功。驗證後關閉 ECPAY_ENABLED 並重新部署。正式密鑰留在 Cloudflare，以供晚到通知驗證。
- 無命書、語音或會員權益變更；獨立 D1 表。不可視為正式商品訂單。
- 官方： https://developers.ecpay.com.tw/2864/ 、 https://developers.ecpay.com.tw/2878/ 、 https://developers.ecpay.com.tw/2890/ 、 https://developers.ecpay.com.tw/2883/ 。
