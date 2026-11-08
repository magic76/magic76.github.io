# Crew Fortune｜八字十命格 Q 版插畫資產

正式網站人物圖採用使用者已驗收的 **2D Q 版卡通角色系列**，不使用先前半寫實風格。

- 驗收來源：`crew-fortune-identity-demo-3-chibi-v2.zip`（甲木、壬水、辛金）及 `crew-fortune-bazi-remaining-7.zip`（其餘七位）。
- 正式路徑：`web-spa/public/fortune/identity/art/bazi-*.webp`，十張均為 1536×864、16:9。
- 日主 ID、英文檔名、核准清單統一於 `web-spa/src/fortune/identityArtwork.ts`；卡片與 Canvas 共用。
- 原始圖片不含 DEMO、水印、出生年月日時、命理文案；真正的文字由 `identity.ts` 依實際計算資料帶入。
- 甲、壬、辛三張延用通過的 v2 拼版裁切原圖；新增七張則是獨立生成並等比輸出。
- 網站無法載入插畫時顯示原有文字／符號備援；不要用其他命格的圖填補缺口。
- 未來若擴充塔羅 22 類和印度占星 12 類，另建立對應圖與核准規則，勿亂配八字角色。

分享卡為 1080×1350 PNG，網站產生當下合成人物圖、個人命盤文案與必要依據，不直接分享 DEMO 圖卡。

## 2026-11-08｜新增印度星盤十二種身份人物與八字入口

- 驗收來源：使用者交付的 `crew-fortune-vedic-12-plus-bazi-cover.zip` 更新版（與已驗收的八字 v2 Q 版插畫比對）。
- 13 張均為獨立 1536×864、16:9 WebP；已核對 SHA-256 manifest、RIFF/WEBP 檔頭、角色名稱與圖像內容。
- 印度星盤十二張正式路徑：`web-spa/public/fortune/identity/art/vedic-*.webp`，ID `vedic-aries` 至 `vedic-pisces`；只對應實際出生星盤計算出的 Lagna 上升星座，不依太陽星座任意配圖。
- 八字首頁插畫路徑：`web-spa/public/fortune/modes/fortune-bazi-cover.webp`，用於命理方式選擇卡；不是某一個日主的命格人物。
- `identityArtwork.ts` 核准清單現涵蓋 10 張八字 + 12 張印度星盤；塔羅 22 張人物另由整合 PR 納入，與印度星盤及八字共同使用命格插畫載入機制。
- 公開網站只部署壓縮 WebP。PNG 母版與手機 QA 圖保留在交付 ZIP，不需將大檔加入網站。
