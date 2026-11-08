# Crew Fortune｜塔羅命格人物圖 v6

## 美術驗收（2026-11-08）

來源：使用者上傳的 `crew-fortune-tarot-22-chibi.zip`，其中 `manifest.json` 的 production_approved 初始為 false，要求獨立視覺驗收。

- 22 張獨立 2D Q 版人物、1536×864、16:9；22 對 PNG/WebP 解碼、SHA-256、不同圖像均通過。
- 經檢視總覽、手機 390px 預覽、原始八字 v2 對照，以及代表性單張近看（02、05、16、17、18、21 等），整體畫風一致、主題可辨識、手腳無阻斷性變形。
- 18「希望引路人」使用星光提燈代替原定光之瓶、21「覺醒召喚者」使用號角與晨曦代替原定光之羽翼：兩者作為符合命格精神的藝術替代方案**接受**，保留未來美術微調空間。
- 以原圖直出到正式網站，未修改原始視覺，也未提交 PNG 母版。實際 390px 瀏覽器與原生 WebView 的彈窗視覺仍需部署預覽後驗收。

## 重大編號校正

ZIP 的 `webp/tarot-1.webp` 表示「第一張插畫：自由冒險家」，但網站引擎遵循塔羅編碼：**22 號是愚者／自由冒險家，1～21 號依序代表其餘角色**。

若直接按 ZIP 的編號接入，全部人物會錯位。因此必須依身份名稱對應，實際部署檔案名稱為：

- ZIP `tarot-1.webp` → 網站 `tarot-22.webp`（自由冒險家）。
- ZIP `tarot-2.webp` → 網站 `tarot-1.webp`（創造實踐者）。
- ...
- ZIP `tarot-22.webp` → 網站 `tarot-21.webp`（圓滿整合者）。

使用者的 `personalityCardNumber` 是唯一決定圖片的數字，不會根據人格描述或翻譯語系改變對應；`tarot-0` 作為愚者的備援別名，與 22 指向同一張圖片。

## 目標位置

`web-spa/public/fortune/identity/art/tarot-{1..22}.webp`

`web-spa/src/fortune/identityArtwork.ts` 管理核准 ID。讀取時同時供命格彈窗與 Canvas 分享圖片使用；若圖片損壞則退回符號而非借用其他命格圖。

不要改變 `identity.ts` 的計算編碼來迎合來源 ZIP 的編號：那會讓既有歷史命盤身份錯誤。
