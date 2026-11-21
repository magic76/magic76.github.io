import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {COURSE_SEO} from "./course-seo.mjs";
import {GAME_SEO_SLUGS} from "./game-seo.mjs";
import {seoLastmod} from "./seo-lastmod.mjs";
import {previewUrl} from "./social-og.mjs";
// Public static landing pages are separate from the Web App HashRouter.
const ORIGIN = "https://koolo.app";
const PAGES = [
  {
    "slug": "",
    "nav": "首頁",
    "title": "AI 朋友聊天、英文口說練習與互動遊戲｜Koolo",
    "description": "和 AI 朋友免費文字聊天，也能練英文口說、玩 1A2B 猜數字與五子棋。選一種想練的語言，開啟 Koolo 就能開始探索。",
    "eyebrow": "ONE SPACE, MANY POSSIBILITIES",
    "heading": "你的 AI 夥伴，從學習到探索。",
    "intro": "用 Koolo 老師與朋友練習語言、和故事角色一起閱讀、從不同角度認識自己，再透過每日研發情報發現值得研究的新方向。",
    "primary": {
      "text": "開啟 Koolo Web",
      "href": "/crew-app/#/"
    },
    "secondary": {
      "text": "探索語言學習",
      "href": "/teacher/"
    },
    "visualLabel": "CREW SPACE",
    "visualTitle": "挑一件今天想做的事",
    "visualDetail": "語言對話 · 故事陪讀 · 命盤探索 · AI 研究",
    "sectionTitle": "四個入口，各有不同的探索方式",
    "sectionIntro": "先看看適合自己的功能，再進入 Web App 體驗。",
    "features": [
      {
        "label": "LANGUAGE",
        "title": "Koolo Teacher",
        "body": "AI 語言老師、Koolo 朋友、口說練習和教材陪讀。",
        "href": "/teacher/",
        "link": "認識語言學習"
      },
      {
        "label": "STORIES",
        "title": "Koolo Story",
        "body": "創作故事、閱讀與語音陪伴，也能拿起手邊的實體書。",
        "href": "/story/",
        "link": "認識故事陪讀"
      },
      {
        "label": "SELF DISCOVERY",
        "title": "Koolo Fortune",
        "body": "透過八字、塔羅生命靈數和印度星盤，整理不同角度的解讀。",
        "href": "/fortune/",
        "link": "認識命盤探索"
      },
      {
        "label": "RESEARCH",
        "title": "Koolo Research",
        "body": "每日精選 AI 論文、技術報告及值得動手實驗的研究方向。",
        "href": "/research/",
        "link": "閱讀研究情報"
      }
    ],
    "stepsTitle": "開始使用，比想像中簡單",
    "steps": [
      {
        "title": "挑選感興趣的功能",
        "body": "從 Teacher、Story 或 Fortune 選擇自己的入口。"
      },
      {
        "title": "設定 Gemini API Key",
        "body": "有 Google 帳號即可前往 Google AI Studio 建立 API Key，免費配額與費率依 Google 公告。"
      },
      {
        "title": "直接在瀏覽器體驗",
        "body": "設定完成後即可使用對應功能；介面語言與對話學習語言分開管理。"
      }
    ],
    "faq": [
      {
        "q": "使用 Koolo 需要先建立帳號嗎？",
        "a": "Web 版可直接進入體驗頁面。使用 Gemini 功能前，需要先設定自己的 API Key。"
      },
      {
        "q": "Gemini API Key 是免費的嗎？",
        "a": "Google AI Studio 可建立 API Key，但可用的免費額度因模型與用量而異，使用付費方案可能產生費用。"
      }
    ]
  },
  {
    "slug": "teacher",
    "nav": "Teacher",
    "title": "AI 英文口說練習｜和老師、AI 朋友自然對話｜Koolo Teacher",
    "description": "想練英文卻找不到語伴？和 Koolo Teacher 的 AI 老師練習發音、日常情境，也能和不同個性的 AI 朋友自然聊天。語音提供免費試用。",
    "eyebrow": "CREW TEACHER",
    "heading": "讓語言練習，更像真的在對話。",
    "intro": "想認真學習時，找 Koolo 老師；想自在聊天時，找有不同個性與背景的 Koolo 朋友。透過語音互動，練習日常與實際情境。",
    "primary": {
      "text": "開始語言練習",
      "href": "/crew-app/#/teacher/practice"
    },
    "secondary": {
      "text": "探索 Koolo 朋友",
      "href": "/crew-app/#/teacher/roles?mode=friends"
    },
    "visualLabel": "SPEAK & LEARN",
    "visualTitle": "老師教學 × 朋友聊天",
    "visualDetail": "語音對話 · 單字練習 · 情境學習",
    "sectionTitle": "從開口說，到累積自己的學習進度",
    "sectionIntro": "教學與自由聊天是不同場景，依照當下需求切換。",
    "features": [
      {
        "label": "01 / TUTOR",
        "title": "Koolo 老師",
        "body": "透過語音進行口說練習、發音與語句回饋，適合有明確學習目標的練習。"
      },
      {
        "label": "02 / FRIENDS",
        "title": "Koolo 朋友",
        "body": "挑選不同角色，進行偏自然、沉浸式的目標語言聊天。"
      },
      {
        "label": "03 / PRACTICE",
        "title": "單字與情境練習",
        "body": "用單字練習、情境課程和教材陪讀，將對話延伸成日常學習。"
      }
    ],
    "stepsTitle": "選擇自己的學習節奏",
    "steps": [
      {
        "title": "選老師或朋友",
        "body": "想要糾正與指導，就選老師；想自由聊天，就選 Koolo 朋友。"
      },
      {
        "title": "設定學習語言與速度",
        "body": "依需要選擇語言、語速與互動方式。"
      },
      {
        "title": "用自己的 Gemini Key 開始",
        "body": "於共用設定頁完成 Key 驗證，再開始語音體驗。"
      }
    ],
    "faq": [
      {
        "q": "Koolo 老師和 Koolo 朋友有什麼不同？",
        "a": "Koolo 老師以學習輔助與回饋為主；Koolo 朋友著重自然聊天和不同個性的情境互動。"
      },
      {
        "q": "可以調整練習的語言嗎？",
        "a": "可以。介面語言和學習／對話目標語言是不同設定，不會因切換介面文字就改變對話語言。"
      }
    ]
  },
  {
    "slug": "story",
    "nav": "Story",
    "title": "Koolo Story｜AI 故事創作、語音朗讀與親子陪讀",
    "description": "Koolo Story 讓你和 AI 一起創作故事、聆聽語音朗讀，也能用照片搭配手邊的實體書進行陪讀。探索 Web 故事書架與閱讀體驗。",
    "eyebrow": "CREW STORY",
    "heading": "從一個想法，走進一段故事。",
    "intro": "和阿奇一起創作、閱讀，或拿起手邊的故事書。保留故事閱讀的樂趣，把語音互動融入共讀時間。",
    "primary": {
      "text": "打開故事書架",
      "href": "/crew-app/#/story/shelf"
    },
    "secondary": {
      "text": "開始創作故事",
      "href": "/crew-app/#/story/create"
    },
    "visualLabel": "READ & IMAGINE",
    "visualTitle": "讓故事慢慢展開",
    "visualDetail": "創作 · 書架 · 語音陪讀",
    "sectionTitle": "故事可以自己寫，也可以從手邊開始",
    "sectionIntro": "從數位故事到實體書籍，讓不同閱讀方式保持連續。",
    "features": [
      {
        "label": "01 / CREATE",
        "title": "AI 故事創作",
        "body": "從自己的想法出發，建立可閱讀的故事內容。"
      },
      {
        "label": "02 / READ",
        "title": "故事閱讀與朗讀",
        "body": "在書架中選擇故事，跟著頁面與語音一起閱讀。"
      },
      {
        "label": "03 / BOOKS",
        "title": "實體書陪讀",
        "body": "拍攝手邊書籍的頁面，將共讀延伸到熟悉的紙本故事。"
      }
    ],
    "stepsTitle": "今天想讀什麼故事？",
    "steps": [
      {
        "title": "選擇故事入口",
        "body": "可以打開書架、創作新故事，或使用手邊的實體書。"
      },
      {
        "title": "準備故事內容",
        "body": "依閱讀模式選擇故事或提供書頁照片。"
      },
      {
        "title": "開始閱讀與語音互動",
        "body": "在 Web 中繼續故事，依介面提示控制朗讀。"
      }
    ],
    "faq": [
      {
        "q": "一定要先有故事才能使用嗎？",
        "a": "不用，可以在 Koolo Story 中探索已有的故事或嘗試創作自己的內容。"
      },
      {
        "q": "可以拿自己的紙本書陪讀嗎？",
        "a": "可以，Koolo Story 提供實體書照片的閱讀流程；實際效果取決於拍攝清晰度及模型對內容的理解。"
      }
    ]
  },
  {
    "slug": "fortune",
    "nav": "Fortune",
    "title": "Koolo Fortune｜八字、塔羅生命靈數與印度星盤",
    "description": "使用 Koolo Fortune 探索八字、塔羅生命靈數與印度星盤，整理性格、人生主題與不同時期的解讀。透過 Web 進行個人命盤探索。",
    "eyebrow": "CREW FORTUNE",
    "heading": "從不同角度，看懂自己的節奏。",
    "intro": "選一種方式，從性格、人生主題或時間週期探索個人命盤。把資料與解讀整理在一起，當作自我觀察的另一種參考。",
    "primary": {
      "text": "開始命盤探索",
      "href": "/crew-app/#/fortune"
    },
    "secondary": {
      "text": "查看三種方式",
      "href": "#approaches"
    },
    "visualLabel": "PATTERNS & REFLECTION",
    "visualTitle": "三種視角，一個探索入口",
    "visualDetail": "八字 · 塔羅生命靈數 · 印度星盤",
    "sectionTitle": "選擇一種最想了解的方式",
    "sectionIntro": "不同系統各有解讀框架，適合從不同角度整理自己關心的主題。",
    "features": [
      {
        "label": "01 / BAZI",
        "title": "八字",
        "body": "探索性格、工作、財運與大運等傳統命理面向。"
      },
      {
        "label": "02 / NUMEROLOGY",
        "title": "塔羅生命靈數",
        "body": "從生命靈數角度整理核心性格與人生主題。"
      },
      {
        "label": "03 / VEDIC",
        "title": "印度星盤",
        "body": "以行星、人生週期與 Dasha 等觀點探索命盤。"
      }
    ],
    "stepsTitle": "先輸入資料，再看不同面向",
    "steps": [
      {
        "title": "選擇探索模式",
        "body": "八字、塔羅生命靈數或印度星盤。"
      },
      {
        "title": "填寫需要的個人資料",
        "body": "依模式輸入出生資訊或相關條件。"
      },
      {
        "title": "閱讀並保存自己的理解",
        "body": "將解讀視為探索與反思素材，而非具保證性的預測。"
      }
    ],
    "faq": [
      {
        "q": "Koolo Fortune 目前有 Android 版嗎？",
        "a": "目前可以使用 Web 版；Google Play 上架進度請以正式產品頁公告為準。"
      },
      {
        "q": "命盤解讀可以當成醫療或投資建議嗎？",
        "a": "不適合。這些內容用於文化探索與個人反思，不應取代專業的醫療、法律或財務意見。"
      }
    ]
  },
  {
    "slug": "research",
    "nav": "Research",
    "title": "Koolo Research｜每日 AI 論文與工程研發情報",
    "description": "閱讀 Koolo 每日精選 AI 論文、技術報告與深度分析，聚焦 AI Agent、記憶、即時語音、開發工具與產品實作。",
    "eyebrow": "CREW RESEARCH",
    "heading": "每天找出真正值得研究的事。",
    "intro": "從 AI 論文、技術報告到工程實作，挑選值得深入的方向。不只追新消息，也關心它能否對實際產品開發帶來幫助。",
    "primary": {
      "text": "閱讀每日研發情報",
      "href": "/crew-app/#/briefing"
    },
    "secondary": {
      "text": "查看閱讀清單",
      "href": "/crew-app/#/briefing/board"
    },
    "visualLabel": "RESEARCH BRIEFING",
    "visualTitle": "研究 × 實作",
    "visualDetail": "AI Agent · Context · Real-time Voice",
    "sectionTitle": "研究重點，圍繞正在發生的開發問題",
    "sectionIntro": "用研發角度閱讀新資料，避免只停在產品新聞的標題。",
    "features": [
      {
        "label": "01 / AGENTS",
        "title": "AI Agent 與工作流程",
        "body": "觀察多 Agent 協作、工具調用、代理執行與可驗證的流程設計。"
      },
      {
        "label": "02 / MEMORY",
        "title": "記憶與 Context 管理",
        "body": "關心長期記憶、上下文壓縮、資訊來源與模型成本控制。"
      },
      {
        "label": "03 / VOICE",
        "title": "即時語音與互動體驗",
        "body": "追蹤語音對話延遲、模型互動、語言學習與使用者體驗。"
      }
    ],
    "stepsTitle": "把研究變成可以使用的洞察",
    "steps": [
      {
        "title": "先讀精選摘要",
        "body": "了解今天有哪些研究議題值得花時間。"
      },
      {
        "title": "回到原始資料",
        "body": "依研究報告提供的來源查證論點與實驗條件。"
      },
      {
        "title": "找到可驗證的實作方向",
        "body": "把觀點和 Koolo 系列產品的實際問題連結。"
      }
    ],
    "faq": [
      {
        "q": "Koolo Research 每天都會有新內容嗎？",
        "a": "Koolo Briefing 以每日研究情報為目標；實際更新狀態以報告頁發布內容為準。"
      },
      {
        "q": "研究文章會直接取代原始論文嗎？",
        "a": "不會。摘要是研究導讀，深入理解仍應回到原始論文、官方文件與實驗資料。"
      }
    ]
  }
];
const EN_PAGES = [
  {
    "slug": "",
    "nav": "Home",
    "title": "Chat with AI Friends, Practice Speaking & Play Games | Koolo",
    "description": "Start a free text chat with an AI friend, practice speaking English and other languages, and play guessing or board games in your browser with Koolo.",
    "eyebrow": "ONE SPACE, MANY POSSIBILITIES",
    "heading": "Your AI companions for learning and exploring.",
    "intro": "Practice speaking with a Koolo teacher or friend, read stories together, explore personal charts, and discover useful AI research—all in one place.",
    "primary": {
      "text": "Open Koolo Web",
      "href": "/crew-app/#/"
    },
    "secondary": {
      "text": "Explore language learning",
      "href": "/en/teacher/"
    },
    "visualLabel": "CREW SPACE",
    "visualTitle": "Choose what to explore today",
    "visualDetail": "Language · Stories · Reflection · AI research",
    "sectionTitle": "Four ways to explore, one Koolo experience",
    "sectionIntro": "Find something you enjoy, then jump straight into the interactive Web App.",
    "features": [
      {
        "label": "LANGUAGE",
        "title": "Koolo Teacher",
        "body": "AI tutors and conversational friends for speaking practice, vocabulary, and guided reading.",
        "href": "/en/teacher/",
        "link": "Explore language learning"
      },
      {
        "label": "STORIES",
        "title": "Koolo Story",
        "body": "Create stories, enjoy narrated reading, or bring a physical book to your reading session.",
        "href": "/en/story/",
        "link": "Explore stories"
      },
      {
        "label": "SELF-DISCOVERY",
        "title": "Koolo Fortune",
        "body": "Reflect on BaZi, numerology, and Vedic astrology as different perspectives on personal themes.",
        "href": "/en/fortune/",
        "link": "Explore personal charts"
      },
      {
        "label": "RESEARCH",
        "title": "Koolo Research",
        "body": "Selected AI papers, technical reports, and practical engineering research to investigate.",
        "href": "/en/research/",
        "link": "Read the research briefing"
      }
    ],
    "stepsTitle": "Getting started is straightforward",
    "steps": [
      {
        "title": "Choose what interests you",
        "body": "Start with Teacher, Story, or Fortune, depending on what you want to do."
      },
      {
        "title": "Set up your Gemini API key",
        "body": "Create an API key with Google AI Studio. Free-tier eligibility and pricing depend on Google's current terms."
      },
      {
        "title": "Explore in your browser",
        "body": "Continue to Koolo Web. Interface language and conversation or learning language are managed separately."
      }
    ],
    "faq": [
      {
        "q": "Do I need to sign up for a Koolo account?",
        "a": "You can open the Web App without creating a Koolo account. Gemini-powered features require you to configure your own API key."
      },
      {
        "q": "Can I get a Gemini API key for free?",
        "a": "Google AI Studio provides API key creation, but free-tier quotas vary by model and usage. Paid access may incur charges."
      }
    ]
  },
  {
    "slug": "teacher",
    "nav": "Teacher",
    "title": "AI English Speaking Practice with Tutors & Friends | Koolo Teacher",
    "description": "Practice spoken English with an AI tutor or talk naturally with Koolo Friends. Build confidence with real-life scenarios and try a free voice session.",
    "eyebrow": "CREW TEACHER",
    "heading": "Language practice that feels like a real conversation.",
    "intro": "Choose a Koolo teacher when you want guided learning and feedback. Pick a Koolo Friend when you'd rather chat naturally with a character who has their own personality and background.",
    "primary": {
      "text": "Start language practice",
      "href": "/crew-app/#/teacher/practice"
    },
    "secondary": {
      "text": "Meet Koolo Friends",
      "href": "/crew-app/#/teacher/roles?mode=friends"
    },
    "visualLabel": "SPEAK & LEARN",
    "visualTitle": "Learn with teachers. Talk with friends.",
    "visualDetail": "Voice chat · Vocabulary · Practical situations",
    "sectionTitle": "From speaking up to building steady progress",
    "sectionIntro": "Switch between teaching and casual conversation to match how you want to practice.",
    "features": [
      {
        "label": "01 / TUTOR",
        "title": "Koolo Teachers",
        "body": "Practice speaking with an AI tutor, receive pronunciation and phrasing feedback, and follow your learning goals."
      },
      {
        "label": "02 / FRIENDS",
        "title": "Koolo Friends",
        "body": "Meet characters with different personalities and enjoy more immersive conversations in your target language."
      },
      {
        "label": "03 / PRACTICE",
        "title": "Vocabulary and guided lessons",
        "body": "Build vocabulary, practice real-world situations, and bring reading material into learning sessions."
      }
    ],
    "stepsTitle": "Choose a pace that works for you",
    "steps": [
      {
        "title": "Choose a teacher or friend",
        "body": "Use a teacher for structured learning and feedback, or a Koolo Friend for relaxed conversation."
      },
      {
        "title": "Set your language and speaking pace",
        "body": "Adjust your target language, speed, and interaction preferences as needed."
      },
      {
        "title": "Start with your Gemini API key",
        "body": "Verify your key in the shared settings page before using live voice features."
      }
    ],
    "faq": [
      {
        "q": "What is the difference between Koolo Teachers and Koolo Friends?",
        "a": "Koolo Teachers focus on learning support and feedback. Koolo Friends prioritize natural conversations and character-based experiences."
      },
      {
        "q": "Can I change the language I practice?",
        "a": "Yes. Your interface language and the language used for speaking practice are separate settings."
      }
    ]
  },
  {
    "slug": "story",
    "nav": "Story",
    "title": "Koolo Story | AI Storytelling, Narration and Family Reading",
    "description": "Create stories, enjoy AI narration, and read together with Koolo Story. You can also photograph pages from a physical book and explore a guided reading experience.",
    "eyebrow": "CREW STORY",
    "heading": "Turn a simple idea into a story worth sharing.",
    "intro": "Create a new story, browse your reading shelf, or pick up a book you already own. Koolo Story brings voice interaction into reading time.",
    "primary": {
      "text": "Open the story shelf",
      "href": "/crew-app/#/story/shelf"
    },
    "secondary": {
      "text": "Create a story",
      "href": "/crew-app/#/story/create"
    },
    "visualLabel": "READ & IMAGINE",
    "visualTitle": "Make room for imagination",
    "visualDetail": "Story creation · Reading shelf · Voice",
    "sectionTitle": "Make your own stories or read what you love",
    "sectionIntro": "Move between digital stories and familiar printed books without losing the joy of reading together.",
    "features": [
      {
        "label": "01 / CREATE",
        "title": "AI-assisted story creation",
        "body": "Begin with an idea and create a story you can come back to and read."
      },
      {
        "label": "02 / READ",
        "title": "Stories and narration",
        "body": "Choose a story from your shelf and follow the pages along with spoken narration."
      },
      {
        "label": "03 / BOOKS",
        "title": "Read physical books together",
        "body": "Photograph pages from a book you own and use them in a guided reading flow."
      }
    ],
    "stepsTitle": "What story will you read today?",
    "steps": [
      {
        "title": "Pick a reading mode",
        "body": "Browse the story shelf, create a new story, or bring a physical book."
      },
      {
        "title": "Prepare your story",
        "body": "Select a story or provide readable photos of your book's pages."
      },
      {
        "title": "Read and interact",
        "body": "Use the reading controls to move through the story and manage narration."
      }
    ],
    "faq": [
      {
        "q": "Do I need to bring my own story?",
        "a": "No. You can explore stories in Koolo Story or create new content."
      },
      {
        "q": "Can I use a printed children's book?",
        "a": "Yes. The physical-book flow uses photos of pages. Results depend on image quality and how well the AI interprets the content."
      }
    ]
  },
  {
    "slug": "fortune",
    "nav": "Fortune",
    "title": "Koolo Fortune | BaZi, Numerology and Vedic Astrology",
    "description": "Explore BaZi, tarot-inspired life-path numerology, and Vedic astrology with Koolo Fortune. Consider personality themes, life cycles, and different traditions of self-reflection.",
    "eyebrow": "CREW FORTUNE",
    "heading": "Explore your story from different perspectives.",
    "intro": "Look at personality, life themes, and personal cycles through three different interpretive traditions. Use the readings as prompts for reflection rather than certain predictions.",
    "primary": {
      "text": "Explore your chart",
      "href": "/crew-app/#/fortune"
    },
    "secondary": {
      "text": "See the three approaches",
      "href": "#approaches"
    },
    "visualLabel": "PATTERNS & REFLECTION",
    "visualTitle": "Three perspectives, one place to explore",
    "visualDetail": "BaZi · Life-path numerology · Vedic astrology",
    "sectionTitle": "Find a perspective that interests you",
    "sectionIntro": "Each tradition has a different framework for reflecting on personal experiences and life themes.",
    "features": [
      {
        "label": "01 / BAZI",
        "title": "BaZi",
        "body": "Explore traditional themes around personality, career, finances, and longer life cycles."
      },
      {
        "label": "02 / NUMEROLOGY",
        "title": "Life-path numerology",
        "body": "Reflect on core traits and personal themes using tarot-inspired numerology."
      },
      {
        "label": "03 / VEDIC",
        "title": "Vedic astrology",
        "body": "Consider planets, astrological cycles, and Dasha periods within the Vedic tradition."
      }
    ],
    "stepsTitle": "Start with your details, explore at your pace",
    "steps": [
      {
        "title": "Choose a reading approach",
        "body": "Explore BaZi, life-path numerology, or Vedic astrology."
      },
      {
        "title": "Enter the relevant details",
        "body": "Provide birth information and other details requested by the selected approach."
      },
      {
        "title": "Reflect on the interpretation",
        "body": "Treat readings as cultural exploration and personal reflection, not guaranteed forecasts."
      }
    ],
    "faq": [
      {
        "q": "Is Koolo Fortune available on Android?",
        "a": "The Web version is available. Check official product announcements for any future Google Play release."
      },
      {
        "q": "Can I use a reading as medical or financial advice?",
        "a": "No. These readings are for cultural exploration and reflection, not a substitute for qualified medical, legal, or financial advice."
      }
    ]
  },
  {
    "slug": "research",
    "nav": "Research",
    "title": "Koolo Research | Daily AI Papers and Engineering Briefings",
    "description": "Read selected AI research papers, technical reports, and deeper engineering analysis covering AI agents, memory, context management, real-time voice, and practical product development.",
    "eyebrow": "CREW RESEARCH",
    "heading": "Find the AI research that's worth your time.",
    "intro": "Explore selected papers, technical reports, and engineering lessons. Beyond news headlines, focus on evidence and ideas that could improve real products.",
    "primary": {
      "text": "Read the daily AI briefing",
      "href": "/crew-app/#/briefing"
    },
    "secondary": {
      "text": "Open the reading list",
      "href": "/crew-app/#/briefing/board"
    },
    "visualLabel": "RESEARCH BRIEFING",
    "visualTitle": "From research to real-world work",
    "visualDetail": "AI Agents · Context · Real-time voice",
    "sectionTitle": "Research grounded in real engineering questions",
    "sectionIntro": "Dig into emerging techniques and their usefulness rather than chasing headlines.",
    "features": [
      {
        "label": "01 / AGENTS",
        "title": "AI agents and workflows",
        "body": "Follow agent coordination, tool use, execution reliability, and verifiable workflows."
      },
      {
        "label": "02 / MEMORY",
        "title": "Memory and context management",
        "body": "Study long-term memory, context compression, provenance, and AI operating costs."
      },
      {
        "label": "03 / VOICE",
        "title": "Real-time voice and interaction",
        "body": "Look into voice latency, conversational models, language practice, and product UX."
      }
    ],
    "stepsTitle": "Turn research into useful direction",
    "steps": [
      {
        "title": "Read the curated highlights",
        "body": "See which research directions may be worth a closer look today."
      },
      {
        "title": "Check the original sources",
        "body": "Review cited papers and official technical documentation for evidence and limits."
      },
      {
        "title": "Find something worth testing",
        "body": "Connect the research back to concrete problems in the Koolo product family."
      }
    ],
    "faq": [
      {
        "q": "Does Koolo Research publish a report every day?",
        "a": "Koolo Briefing is designed as a daily research selection. Check the briefing itself for its latest published edition."
      },
      {
        "q": "Do the research summaries replace original papers?",
        "a": "No. The summaries are starting points; consult the original publications and experiments before drawing conclusions."
      }
    ]
  }
];
const CSS = ":root{color-scheme:light;--ink:#172034;--muted:#687185;--line:#e4e8ef;--paper:#f7f8fb;--accent:#5267eb;--accent2:#8a65dc;--white:#fff}\n*{box-sizing:border-box}html{scroll-behavior:smooth;scrollbar-width:none}html::-webkit-scrollbar,body::-webkit-scrollbar{display:none}body{margin:0;background:var(--white);color:var(--ink);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,\"Segoe UI\",\"Noto Sans TC\",sans-serif;line-height:1.7;-webkit-font-smoothing:antialiased}a{color:inherit;text-decoration:none}a:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:4px;border-radius:5px}h1,h2,h3,p{margin-top:0}h1,h2,h3{line-height:1.23;letter-spacing:-.045em}p{color:var(--muted)}.shell{width:min(1120px,calc(100% - 48px));margin-inline:auto}\n.skip-link{position:absolute;left:16px;top:-80px;padding:10px 16px;background:var(--ink);color:white;z-index:99}.skip-link:focus{top:10px}\n.site-header{background:rgba(255,255,255,.94);border-bottom:1px solid var(--line)}.header-inner{width:min(1180px,calc(100% - 48px));margin:auto;min-height:84px;display:flex;align-items:center;justify-content:space-between;gap:22px}.brand{display:inline-flex;align-items:center;gap:10px;font-size:23px;font-weight:850;letter-spacing:-.055em;white-space:nowrap}.brand-symbol{display:grid;place-items:center;background:var(--ink);color:white;border-radius:12px;width:36px;height:36px;font-size:25px;font-weight:400;letter-spacing:0}.brand-dot{color:var(--accent)}nav{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:23px}nav a,.footer-nav a{font-size:13px;color:#5e6778;font-weight:650;transition:color .2s}nav a:hover,nav a[aria-current],.footer-nav a:hover{color:var(--accent)}.header-cta{white-space:nowrap;border:1px solid var(--line);padding:9px 15px;border-radius:999px;font-size:12px;font-weight:750}.header-cta:hover{border-color:var(--accent);color:var(--accent)}\n.hero{display:grid;grid-template-columns:1fr .95fr;gap:62px;align-items:center;min-height:610px;padding-block:80px 90px}.eyebrow,.section-kicker{display:inline-flex;align-items:center;gap:11px;letter-spacing:.15em;font-size:10px;font-weight:850;color:var(--accent)}.eyebrow-line{height:2px;width:26px;background:var(--accent)}.hero h1{font-size:clamp(38px,4.3vw,62px);margin:23px 0}.hero-desc{max-width:580px;font-size:16px;line-height:1.95}.actions{display:flex;flex-wrap:wrap;gap:12px;margin:28px 0 16px}.button{min-height:48px;display:inline-flex;gap:26px;align-items:center;justify-content:space-between;padding:12px 20px;border-radius:12px;font-weight:760;font-size:13px;transition:transform .2s,box-shadow .2s}.button:hover{transform:translateY(-2px)}.button.primary{background:var(--ink);color:white;box-shadow:0 12px 30px rgba(31,42,70,.13)}.button.secondary{background:#f0f2f8;color:var(--ink)}.hint{font-size:11px;margin:0;line-height:1.8}\n.hero-visual{position:relative;min-height:400px;display:grid;place-items:center;isolation:isolate}.hero-visual:before{content:\"\";position:absolute;inset:2% 0;background:linear-gradient(142deg,#f3f6ff,#f7f2fc 74%);border:1px solid #ebeefa;border-radius:40px;z-index:-2}.visual-orb{position:absolute;border-radius:50%;filter:blur(3px);z-index:-1}.visual-orb.one{width:180px;height:180px;background:#dce6ff;top:4%;right:0}.visual-orb.two{width:120px;height:120px;background:#e8dafa;bottom:4%;left:4%}.visual-card{width:min(340px,82%);min-height:292px;padding:28px;background:rgba(255,255,255,.88);backdrop-filter:blur(9px);border:1px solid white;border-radius:25px;box-shadow:0 32px 66px rgba(72,78,119,.12);display:flex;flex-direction:column;align-items:flex-start}.visual-tag{font-size:10px;letter-spacing:.13em;font-weight:800;color:#5c6980}.status-dot{display:inline-block;width:7px;height:7px;background:#6fcaaa;border-radius:50%;margin-right:7px}.visual-icon{display:grid;place-items:center;width:80px;height:80px;margin-top:30px;border-radius:26px;background:linear-gradient(145deg,#dfe6ff,#f0e8fd);color:#616bdd;font-size:46px}.visual-card strong{font-size:22px;margin-top:18px;letter-spacing:-.035em}.visual-card p{font-size:12px;margin:8px 0 auto}.visual-foot{font-size:9px;letter-spacing:.14em;font-weight:800;color:#8992a4;margin-top:15px}\n.section{padding-block:90px}.section-lead{max-width:720px;margin-bottom:30px}.section h2,.final-cta h2{font-size:clamp(28px,3vw,40px);margin:13px 0}.section-lead p{font-size:14px;line-height:1.85}.feature-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.feature-grid.four{grid-template-columns:repeat(4,minmax(0,1fr))}.feature{border:1px solid var(--line);border-radius:20px;background:white;padding:28px 24px;min-height:235px;display:flex;flex-direction:column;transition:border-color .2s,transform .2s}.feature:hover{border-color:#bbc4fa;transform:translateY(-2px)}.feature-label{font-size:10px;letter-spacing:.12em;font-weight:800;color:var(--accent)}.feature h3{font-size:20px;margin:18px 0 10px}.feature p{font-size:13px;line-height:1.85}.text-link{font-size:12px;color:var(--accent);font-weight:800;margin-top:auto;padding-top:12px}.text-link:hover{text-decoration:underline}\n.section-muted{background:var(--paper)}.steps-wrap{display:grid;grid-template-columns:.9fr 1.1fr;gap:80px}.steps-intro h2{max-width:400px}.steps-intro p{font-size:13px}.steps{list-style:none;margin:0;padding:0}.steps li{display:flex;gap:22px;padding:21px 0;border-bottom:1px solid #dfe3ec}.steps li:first-child{padding-top:0}.steps li:last-child{border-bottom:0}.step-num{font-size:12px;font-weight:900;letter-spacing:.09em;color:var(--accent);padding-top:3px}.steps h3{font-size:17px;margin:0 0 7px}.steps p{font-size:13px;margin:0;line-height:1.85}.questions{display:grid;grid-template-columns:.7fr 1.3fr;gap:70px}.faq details{border-bottom:1px solid var(--line);padding:19px 0}.faq summary{font-size:15px;font-weight:750;cursor:pointer;list-style-position:outside}.faq p{font-size:13px;line-height:1.9;margin:13px 0 0}.final-cta{background:linear-gradient(125deg,#eff2ff,#f7f1fc);border:1px solid #e8e9fb;border-radius:26px;margin-block:20px 100px;padding:50px;text-align:center}.final-cta p{font-size:13px}.final-cta .button{margin-top:18px}\n.site-footer{background:#f8f9fc;border-top:1px solid var(--line);padding-block:58px 30px}.site-footer .shell{display:flex;justify-content:space-between;gap:22px;flex-wrap:wrap}.site-footer p{font-size:12px;margin-top:9px}.footer-nav{display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start}.footer-bottom{width:100%;border-top:1px solid var(--line);margin-top:35px;padding-top:18px;display:flex;gap:22px;color:#7f8797;font-size:11px}.footer-bottom a:hover{text-decoration:underline}\n@media(max-width:1040px){.header-inner{flex-wrap:wrap;padding:14px 0}nav{order:3;width:100%;justify-content:flex-start;gap:18px}.hero{gap:30px}.feature-grid.four{grid-template-columns:repeat(2,minmax(0,1fr))}}\n@media(max-width:700px){.shell,.header-inner{width:min(100% - 32px,1120px)}.header-inner{gap:12px}nav{gap:14px;overflow-x:auto;flex-wrap:nowrap;white-space:nowrap;padding:3px 0 8px;scrollbar-width:none}nav::-webkit-scrollbar{display:none}nav a{font-size:12px}.brand{font-size:20px}.brand-symbol{width:33px;height:33px}.header-cta{margin-left:auto;font-size:11px}.hero{grid-template-columns:1fr;min-height:0;padding-block:62px 48px;gap:30px}.hero h1{font-size:38px}.hero-desc{font-size:14px}.hero-visual{min-height:315px}.hero-visual:before{border-radius:28px}.visual-card{min-height:240px}.visual-icon{margin-top:18px;width:60px;height:60px;font-size:36px}.section{padding-block:58px}.feature-grid,.feature-grid.four{grid-template-columns:1fr}.feature{min-height:0;padding:22px}.steps-wrap,.questions{grid-template-columns:1fr;gap:24px}.steps-intro h2{max-width:none}.final-cta{margin-block:0 55px;padding:36px 18px}.footer-nav{gap:15px}.site-footer{padding-top:42px}}\n@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.button,.feature{transition:none}}\n\n.language-switch{display:inline-flex;gap:5px;padding:4px;background:#f1f3f8;border-radius:999px;white-space:nowrap}\n.language-switch a{padding:4px 9px;border-radius:999px;color:#6b768c;font-weight:800;font-size:11px}\n.language-switch a[aria-current=\"page\"]{background:white;color:#263556;box-shadow:0 2px 8px #23304912}\n@media(max-width:700px){.language-switch{margin-left:auto}.header-cta{margin-left:0}.header-inner{justify-content:space-between}}\n";
function escapeHTML(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}

function pageUrl(slug,locale){return ORIGIN+"/"+(locale==="en"?"en/":"")+(slug?slug+"/":"")}

function jsonScript(data){return JSON.stringify(data).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026")}

function jsonld(p,locale){const url=pageUrl(p.slug,locale),home=pageUrl("",locale),name=p.slug==="teacher"?"Koolo Teacher":p.slug==="story"?"Koolo Story":p.slug==="fortune"?"Koolo Fortune":p.slug==="research"?"Koolo Research":"Koolo";const data=[
{"@type":"WebSite","@id":ORIGIN+"/#website","url":ORIGIN+"/","name":"Koolo","inLanguage":["zh-Hant","en"]},
{"@type":p.slug==="research"?"CollectionPage":"WebPage","@id":url+"#webpage","url":url,"name":p.title,"description":p.description,"inLanguage":locale==="en"?"en":"zh-Hant","isPartOf":{"@id":ORIGIN+"/#website"}},
];if(p.slug){data.push({"@type":"BreadcrumbList","@id":url+"#breadcrumbs","itemListElement":[{"@type":"ListItem","position":1,"name":locale==="en"?"Home":"首頁","item":home},{"@type":"ListItem","position":2,"name":name,"item":url}]});}
if(["teacher","story","fortune"].includes(p.slug)){data.push({"@type":"SoftwareApplication","@id":ORIGIN+"/#app-"+p.slug,"name":name,"applicationCategory":p.slug==="teacher"?"EducationalApplication":p.slug==="story"?"EntertainmentApplication":"LifestyleApplication","operatingSystem":"Web","url":ORIGIN+"/crew-app/#/"+p.slug,"description":p.description});}
return jsonScript({"@context":"https://schema.org","@graph":data});
}

function renderPage(p,locale){
const en=locale==="en", dict={home:en?"Home":"首頁",open:en?"Open Web App":"開啟 Web App",faq:en?"Frequently asked questions":"常見問題",stepHint:en?"Start with what matters to you and explore at your own pace.":"從想法到實際體驗，依自己的步調開始。",ctaTitle:en?"Ready to begin?":"準備好開始了嗎？",ctaBody:en?"Explore the interactive Koolo Web App whenever you're ready.":"不需要在介紹頁停留，直接進入原本的 Koolo Web 體驗。",skip:en?"Skip to main content":"跳至主要內容",researchHint:en?"Focused on technical research and practical applications.":"聚焦技術研究與應用實作。",usageHint:en?"Use your own Gemini API key. Free quotas and pricing are subject to Google's terms.":"使用自己的 Gemini API Key；免費額度與收費依 Google 規定。"};
const isHome=!p.slug;const nav=(en?EN_PAGES:PAGES).map(item=>`<a href="${pageUrl(item.slug,locale)}"${item.slug===p.slug?' aria-current="page"':""}>${escapeHTML(item.nav)}</a>`).join("");
const features=p.features.map(f=>`<article class="feature"><span class="feature-label">${escapeHTML(f.label)}</span><h3>${escapeHTML(f.title)}</h3><p>${escapeHTML(f.body)}</p>${f.href?`<a class="text-link" href="${escapeHTML(f.href)}">${escapeHTML(f.link)} <span aria-hidden="true">↗</span></a>`:""}</article>`).join("");
const steps=p.steps.map((s,i)=>`<li><span class="step-num">${String(i+1).padStart(2,"0")}</span><div><h3>${escapeHTML(s.title)}</h3><p>${escapeHTML(s.body)}</p></div></li>`).join("");
const faq=p.faq.map(f=>`<details><summary>${escapeHTML(f.q)}</summary><p>${escapeHTML(f.a)}</p></details>`).join("");
const related=(en?EN_PAGES:PAGES).filter(item=>item.slug!==p.slug).map(item=>`<a href="${pageUrl(item.slug,locale)}">${escapeHTML(item.nav)} <span aria-hidden="true">↗</span></a>`).join("");
const url=pageUrl(p.slug,locale),zhURL=pageUrl(p.slug,"zh"),enURL=pageUrl(p.slug,"en"), ogImage=p.slug?previewUrl("feature",p.slug):previewUrl("home");
return `<!doctype html>
<html lang="${en?"en":"zh-Hant"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#f7f8fb">
  <meta name="robots" content="index,follow">
  <title>${escapeHTML(p.title)}</title>
  <meta name="description" content="${escapeHTML(p.description)}">
  <link rel="canonical" href="${url}">
  <link rel="alternate" hreflang="zh-Hant" href="${zhURL}">
  <link rel="alternate" hreflang="en" href="${enURL}">
  <link rel="alternate" hreflang="x-default" href="${zhURL}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="${en?"en_US":"zh_TW"}">
  <meta property="og:locale:alternate" content="${en?"zh_TW":"en_US"}">
  <meta property="og:site_name" content="Koolo">
  <meta property="og:title" content="${escapeHTML(p.title)}">
  <meta property="og:description" content="${escapeHTML(p.description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:secure_url" content="${ogImage}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHTML(p.slug?p.title:"Koolo AI friends")}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${ogImage}">
  <link rel="stylesheet" href="/seo.css">
  <script type="application/ld+json">${jsonld(p,locale)}</script>
</head>
<body>
  <a class="skip-link" href="#main">${dict.skip}</a>
  <header class="site-header"><div class="header-inner">
    <a class="brand" href="${pageUrl("",locale)}" aria-label="Koolo ${dict.home}"><span class="brand-symbol" aria-hidden="true">✳</span><span>Koolo<span class="brand-dot">.</span></span></a>
    <nav aria-label="${en?"Main navigation":"主選單"}">${nav}</nav>
    <div class="language-switch" aria-label="${en?"Site language":"網站語言"}"><a lang="zh-Hant" href="${zhURL}"${!en?' aria-current="page"':""}>中文</a><a lang="en" href="${enURL}"${en?' aria-current="page"':""}>EN</a></div>
    <a class="header-cta" href="/crew-app/#/">${dict.open} <span aria-hidden="true">↗</span></a>
  </div></header>
  <main id="main">
    <section class="hero shell">
      <div class="hero-content"><span class="eyebrow"><span class="eyebrow-line"></span>${escapeHTML(p.eyebrow)}</span>
        <h1>${escapeHTML(p.heading)}</h1><p class="hero-desc">${escapeHTML(p.intro)}</p>
        <div class="actions"><a class="button primary" href="${escapeHTML(p.primary.href)}">${escapeHTML(p.primary.text)} <span aria-hidden="true">↗</span></a><a class="button secondary" href="${escapeHTML(p.secondary.href)}">${escapeHTML(p.secondary.text)} <span aria-hidden="true">→</span></a></div>
        <p class="hint">${p.slug==="research"?dict.researchHint:dict.usageHint}</p>
      </div>
      <div class="hero-visual" aria-label="${escapeHTML(p.visualLabel)}">
        <div class="visual-orb one" aria-hidden="true"></div><div class="visual-orb two" aria-hidden="true"></div>
        <div class="visual-card"><span class="visual-tag"><span class="status-dot"></span>${escapeHTML(p.visualLabel)}</span>
          <div class="visual-icon" aria-hidden="true">✳</div><strong>${escapeHTML(p.visualTitle)}</strong><p>${escapeHTML(p.visualDetail)}</p><span class="visual-foot">CREW / EXPLORE</span></div>
      </div>
    </section>
    <section id="approaches" class="section shell">
      <div class="section-lead"><span class="section-kicker">EXPLORE / 01</span><h2>${escapeHTML(p.sectionTitle)}</h2><p>${escapeHTML(p.sectionIntro)}</p></div>
      <div class="feature-grid ${isHome?"four":""}">${features}</div>
    </section>
    <section class="section section-muted"><div class="shell steps-wrap">
      <div class="steps-intro"><span class="section-kicker">GET STARTED / 02</span><h2>${escapeHTML(p.stepsTitle)}</h2><p>${dict.stepHint}</p></div>
      <ol class="steps">${steps}</ol>
    </div></section>
    <section class="section shell questions"><div class="section-lead"><span class="section-kicker">GOOD TO KNOW / 03</span><h2>${dict.faq}</h2></div><div class="faq">${faq}</div></section>
    <section class="shell final-cta"><span class="section-kicker">YOUR CREW SPACE</span><h2>${dict.ctaTitle}</h2><p>${dict.ctaBody}</p><a class="button primary" href="${escapeHTML(p.primary.href)}">${escapeHTML(p.primary.text)} <span aria-hidden="true">↗</span></a></section>
  </main>
  <footer class="site-footer"><div class="shell"><div><a class="brand footer-brand" href="${pageUrl("",locale)}"><span class="brand-symbol" aria-hidden="true">✳</span><span>Koolo<span class="brand-dot">.</span></span></a><p>Learn, imagine, explore.</p></div><div class="footer-nav">${related}</div><div class="footer-bottom"><span>© Koolo</span><a href="mailto:crew@3sssi.com">crew@3sssi.com</a><a href="/crew-app/#/">Web App</a></div></div></footer>
</body>
</html>
`;
}

const GAME_SLUGS=["games",...GAME_SEO_SLUGS.map(slug=>"games/"+slug)];
function renderSitemap(){const xml=(slug,locale)=>`    <xhtml:link rel="alternate" hreflang="zh-Hant" href="${pageUrl(slug,"zh")}"/>\n    <xhtml:link rel="alternate" hreflang="en" href="${pageUrl(slug,"en")}"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl(slug,"zh")}"/>`;
return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${PAGES.map(p=>p.slug).concat(GAME_SLUGS,COURSE_SEO.map(c=>"teacher/course/"+c.slug)).flatMap(slug=>["zh","en"].map(locale=>`  <url>\n    <loc>${pageUrl(slug,locale)}</loc>\n    <lastmod>${seoLastmod(slug)}</lastmod>\n${xml(slug,locale)}\n  </url>`)).join("\n")}\n</urlset>\n`}

function renderRobots(){return `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`}

function outputs(){const items={"seo.css":CSS,"robots.txt":renderRobots(),"sitemap.xml":renderSitemap()};for(const p of PAGES){items[p.slug?p.slug+"/index.html":"index.html"]=renderPage(p,"zh");items["en/"+(p.slug?p.slug+"/":"")+"index.html"]=renderPage(EN_PAGES.find(q=>q.slug===p.slug),"en");}return items}
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const checkOnly=process.argv.includes("--check");
let failed=false;
for(const [path,content] of Object.entries(outputs())){
  const absolute=join(root,path);
  if(checkOnly){
    let actual="";
    try{actual=readFileSync(absolute,"utf8")}catch{/* missing output */}
    // Git source history and ZIP mtimes can yield different but valid lastmod dates.
    // Still check exact URL coverage, markup, alternates and date presence.
    const normalize=xml=>path==="sitemap.xml"?xml.replace(/<lastmod>\\d{4}-\\d{2}-\\d{2}<\\/lastmod>/g,"<lastmod>DATE</lastmod>"):xml;
    if(normalize(actual)!==normalize(content)){console.error("SEO output is stale: "+path);failed=true}
  }else{
    mkdirSync(dirname(absolute),{recursive:true});
    writeFileSync(absolute,content,"utf8");
    console.log("Wrote "+path);
  }
}
if(failed)process.exitCode=1;
