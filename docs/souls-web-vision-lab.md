# Crew Souls｜純 Web 物品追蹤驗證版

正式站部署後網址：https://3sssi.com/souls-vision-lab/

直接用手機 Chrome 或 Safari 開啟，授予相機權限即可。不必安裝 APK，建議 HTTPS 連線。

## 與 Crew Souls 完全隔離

本實驗不接 Gemini Live、不修改 /souls 角色和記憶、不錄影，也不傳送相機畫面。這是只用 Web 的物品追蹤 benchmark，沒有導航入口，設定 noindex/nofollow。

## 官方引擎與限制

使用 Google MediaPipe Tasks Vision 1.2.0 ObjectDetector（VIDEO 模式）、EfficientDet-Lite0 float16 模型。JS/WASM 從固定版本 CDN 載入，模型由 Google Cloud Storage 提供；第一次啟動需要網路。推論在裝置端進行，MediaPipe 仍可能收集使用及效能 telemetry。

官方 Web Object Detector **沒有 Android ML Kit Tracking ID**，只能輸出單幀 COCO 類別、分數和 Bounding Box。本實驗用保守的幀間框關聯：類別相同、位移和交集相近；兩個目標太相似時寧可拒絕，也不亂換 Soul。這不是任意物體持久身分辨識，不是 3D AR，不保證所有實體物品都能偵測。

模型在 JavaScript 上同步執行，可能短暫卡 UI，因此已限速約每秒 4–5 幀偵測；UI 顯示實際推論耗時和結果 FPS。

## 實際測試

1. 開啟頁面，按「開啟相機」，允許權限，等模型首次下載。
2. 對準單一杯子或玩偶，看到藍色偵測框後直接點它。
3. 橘色框和 Q 版眼睛代表臨時鎖定，慢慢移動、放大縮小、旋轉物品。
4. 暫時遮住、再移出鏡頭，觀察「暫時未找到」與「疑似離開」的切換；至少 3 次有效結果缺席且 1.4 秒後才標疑似離開。
5. 用杯子、泰迪熊、遙控器分別測試。
6. 按「匯出 CSV」取得推論時間、結果 FPS、方框和狀態；沒有影像、音訊內容。

如手機完全沒有偵測框，可換燈光、背景或距離。Google COCO 模型只支援有限類別，不保證任意日用品。

## 程式與測試

- web-spa/public/souls-vision-lab/index.html：獨立頁面
- web-spa/public/souls-vision-lab/app.mjs：相機、MediaPipe、疊加眼睛、CSV
- web-spa/public/souls-vision-lab/tracking.mjs：可單元測試的匹配及遺失邏輯
- tests/souls-web-tracker.test.mjs：幾何配對、遮擋、避免錯換目標、與正式版隔離

Vite 會自動複製 web-spa/public 的靜態內容，不必新增 React Route。

## 官方技術來源

https://developers.google.com/edge/mediapipe/solutions/vision/object_detector/web_js

https://developers.google.com/edge/api/mediapipe/js/tasks-vision.objectdetector

https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/README.md
