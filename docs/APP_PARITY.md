# Crew Web ↔ Android App Parity Contract

Android apps are the product source of truth for Crew Teacher, Crew Story, and Crew Fortune.

## Crew Teacher
Source: `magic76/crew-teacher`

Web must preserve the Android information architecture:
- 練習
  - 目前老師（同步 Android 固定 tutor roster；目前含 Emma / Alex / James / Mia / Sophie / Lina）
  - 今天下一步 / Continue Learning（教材續學 → 到期單字 → 下一堂課 → 自由對話）
  - 跟老師聊
  - 教材陪讀
  - 單字練習（到期複習、7/14/30/60/120 天間隔、6/3/1 難度節奏、答錯後 3 題 recovery）
  - 情境課程（3 Tracks / 10 Units / 31 Lessons，逐課解鎖、星等與 best score）
  - 今天 / 學習紀錄
- 學習
  - 教材陪讀
  - 單字練習
  - 情境課程
  - 朗讀糾音
- 老師
  - 老師角色（固定單張人像；Emma / Alex / James / Mia 使用 Android HQ portrait sprite，Sophie / Lina 使用 Android 原圖）
  - 聊天模式
  - 練習方式
  - 音色 / 語言風格
- 教材陪讀完成最後一頁後，完成教材會清除 resumable checkpoint
- 我的
  - 學習狀態
  - 紀錄與設定

Platform-only Android behavior (floating service, native permissions, Play-specific APIs) does not need a literal Web port.

## Crew Story
Source: `magic76/crew-story`

Web must preserve:
- 書架 / 我的
- 今天想讀什麼故事？
- 和阿奇一起創作、閱讀，或拿起手邊的故事書。
- 最近讀到這本
- 創作故事
- 實體書陪讀
- 我的故事
- 探索故事
- Story Player uses Gemini Live narration
- Story Editor remains page-centric
- 我的 Story manages story preferences, voice/language, and AI setup
- 未設定 Gemini Key 時要提供明確的取得教學；Web 共用 `/settings`，不複製 Android dialog

## Crew Fortune
Source: `magic76/crew-fortune`

Web must preserve:
- 從不同角度，看懂自己的節奏。
- 選一種方式
- 八字 — 性格 · 工作 · 財運 · 大運
- 塔羅生命靈數 — 核心性格 · 人生主題
- 印度星盤 — 人生週期 · 行星 · Dasha
- 你的資料 / 只需設定一次
- 解讀風格
- 開始解讀
- 最近解讀
- 歷史 is a header-level action, not a primary product tab
- deterministic result data is primary; Live teacher is secondary help only
- Gemini Key is optional for deterministic chart/basic results; AI interpretation and teacher conversation require it
- Web reuses the shared `/settings` Gemini guide rather than creating a Fortune-only key flow

## Review rule
For a meaningful Android product change:
1. Compare the latest Android user flow and labels.
2. Identify the Web parity gap.
3. Port product behavior and data structure first.
4. Adapt only platform mechanics, not the product concept.
5. Update parity tests when the source-of-truth flow changes.
