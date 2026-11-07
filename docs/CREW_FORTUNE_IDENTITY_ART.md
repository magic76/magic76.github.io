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
