# Crew Souls Native Vision Lab｜Android 物品追蹤驗證版

這是獨立 Android Debug APK：**不接 Gemini Live、不保存 Soul 身分或記憶、不錄影、不上傳相機畫面，也沒有 WebView。** 原本的 /souls 網站程式保持不變。

## 技術架構

- CameraX 1.4.2 + Google ML Kit Object Detection 17.0.2 + CameraX 官方 MlKitAnalyzer
- STREAM_MODE，偵測一個最顯眼的物品；不啟用分類或多物品模式，降低 Android 手機負擔
- COORDINATE_SYSTEM_VIEW_REFERENCED：由 AndroidX 自動把框映射到 PreviewView 座標，避免手動換算方向與裁切
- STRATEGY_KEEP_ONLY_LATEST：若分析慢，自動丟掉過期影格
- Tracking ID 是同一次相機串流中的短暫 ID，**不是永久 Soul 身分**
- 物體沒有足夠紋理、太小、太模糊時，可能無法偵測；本版本不是 3D AR 或任意物品保證追蹤

## 取得 Android APK

1. 進入 GitHub Repo → Actions → **Crew Souls Native Vision Lab APK**。
2. 開啟成功的 workflow run，下載名為 **crew-souls-native-tracker-debug-apk** 的 Artifact ZIP。
3. 解壓縮後得到 app-debug.apk，安裝到 Android 手機，允許安裝此來源。
4. 給予相機權限；首次請保持網路可用，ML Kit unbundled 偵測模型需透過 Google Play 服務下載。

在 Android Studio 開啟此目錄（不是網站 Repo 根目錄），即可操作 app module。CI 使用 Gradle 8.10.2、JDK 17、Android SDK 35。

命令列：

    gradle --no-daemon testDebugUnitTest assembleDebug

此實驗沒有提交 Gradle Wrapper 二進位 JAR。Actions 使用官方 setup-gradle 安裝 Gradle。

## 手機實測

1. 先放一個杯子在光線充足、背景簡單的桌上，讓物品佔畫面約四分之一以上。
2. 等**青色偵測框**出現 Tracking ID，點框內或按**鎖定物品**。鎖住同一 ID 後，框變橘色，顯示 Q 版眼睛。
3. 以慢速左右移動杯子、靠近遠離、略微旋轉，觀察框與眼睛有沒有跟隨。
4. 用手短暫遮擋，再完全移出鏡頭。至少 3 次有效結果未見同一 ID 且超過 1.2 秒時才標成**疑似離開**。
5. 對杯子、玩偶、遙控器各重複至少兩次，按**重新選擇**清除鎖定。
6. 按**匯出 CSV**存檔；只記錄回呼時間、2D 框、追蹤 ID 和狀態，不保存影像或聲音。

## 驗收指標

| 項目 | 觀察方式 |
| --- | --- |
| 有效框與 Tracking ID | 靜止 10–15 秒能否出現 |
| 追蹤與貼附 | 平移時框/眼睛是否跑到桌面 |
| 縮放 | 物品近／遠時，框是否同步改變大小 |
| 追蹤 ID 保持率 | 物品仍在時，是否維持原 ID |
| 暫時遮擋 | 遮擋後，同一 ID 是否恢復 |
| 移除 | 完全移出後，是否標示「疑似離開」 |
| 結果 FPS | ML Kit 的分析回呼頻率，不是相機影格率或推論延遲 |
| 相鄰框位移 | 包括真實物品移動，**不能**當作純粹追蹤誤差 |

偵測器或模型出錯不會假裝「物品已經離開」。若光滑杯子經常沒有框，應評估自訂模型或影片分割，而不是再增加一個手寫特徵追蹤器。

這版沒有 Gemini、不做 Live 斷線，也不將 ML Kit 的暫時 Tracking ID 綁定到永久物品身份。

## 官方技術來源

- https://developers.google.com/ml-kit/vision/object-detection/android
- https://developer.android.com/media/camera/camerax/mlkitanalyzer
- https://developer.android.com/jetpack/androidx/releases/camera
- https://github.com/googlesamples/mlkit/tree/master/android/vision-quickstart
