# Crew Web ↔ Android App Parity Contract

Android apps are the product source of truth for Crew Teacher, Crew Story, and Crew Fortune.

## Crew Teacher
Source: `magic76/crew-teacher`

Web must preserve the Android information architecture:
- 練習
  - 目前老師
  - 今天下一步 / Continue Learning
  - 跟老師聊
  - 教材陪讀
  - 單字練習
  - 情境課程
  - 今天 / 學習紀錄
- 學習
  - 教材陪讀
  - 單字練習
  - 情境課程
  - 朗讀糾音
- 老師
  - 老師角色
  - 聊天模式
  - 練習方式
  - 音色 / 語言風格
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

## Review rule
For a meaningful Android product change:
1. Compare the latest Android user flow and labels.
2. Identify the Web parity gap.
3. Port product behavior and data structure first.
4. Adapt only platform mechanics, not the product concept.
5. Update parity tests when the source-of-truth flow changes.
