import type{CourseLesson}from"./courseTypes";
export const BUSINESS_COURSE_LESSONS:CourseLesson[]=[
  {
    "id": "biz_u1_l1",
    "trackId": "business",
    "unitId": "biz_u1",
    "titleEn": "Meeting Icebreaker & Self Introduction",
    "titleZh": "會議開場破冰與自我介紹",
    "descEn": "Introduce yourself concisely in an international team standup meeting.",
    "descZh": "在跨國團隊會議中簡明自我介紹、說明職責與問候同仁。",
    "scene": "business",
    "rolePrompt": "You are chairing a global sync meeting. Ask the new teammate to introduce themselves and their role.",
    "missions": [
      {
        "titleEn": "向與會同仁打招呼並說明自己的角色 (Role)",
        "titleZh": "向與會同仁打招呼並說明自己的角色 (Role)",
        "keywords": [
          "morning",
          "everyone",
          "role",
          "lead",
          "engineer",
          "designer",
          "manager",
          "name is"
        ]
      },
      {
        "titleEn": "簡要提及本季或近期負責的主要目標",
        "titleZh": "簡要提及本季或近期負責的主要目標",
        "keywords": [
          "responsible",
          "focus",
          "working on",
          "goal",
          "project",
          "building"
        ]
      },
      {
        "titleEn": "表達期待與團隊合作 (Look forward to)",
        "titleZh": "表達期待與團隊合作 (Look forward to)",
        "keywords": [
          "look forward",
          "working together",
          "collaborate",
          "excited",
          "happy to be here"
        ]
      }
    ]
  },
  {
    "id": "biz_u1_l2",
    "trackId": "business",
    "unitId": "biz_u1",
    "titleEn": "Project Status Updates & Blockers",
    "titleZh": "專案進度匯報與遭遇阻礙",
    "descEn": "Give a crisp 2-minute status update on what's done and current blockers.",
    "descZh": "清晰匯報已完成事項、進行中項目與需要團隊協助排除的阻礙 (Blockers)。",
    "scene": "business",
    "rolePrompt": "You are an agile project manager. Ask the engineer about their sprint progress and any blockers.",
    "missions": [
      {
        "titleEn": "說明最近已完成的里程碑 (Completed)",
        "titleZh": "說明最近已完成的里程碑 (Completed)",
        "keywords": [
          "completed",
          "finished",
          "shipped",
          "done",
          "launched"
        ]
      },
      {
        "titleEn": "說明目前進行中的項目 (Currently working on)",
        "titleZh": "說明目前進行中的項目 (Currently working on)",
        "keywords": [
          "currently",
          "working on",
          "testing",
          "building",
          "developing"
        ]
      },
      {
        "titleEn": "提出阻礙並尋求跨團隊支援 (Blocker / Need help)",
        "titleZh": "提出阻礙並尋求跨團隊支援 (Blocker / Need help)",
        "keywords": [
          "blocker",
          "blocked",
          "need help",
          "sync",
          "support",
          "dependency"
        ]
      }
    ]
  },
  {
    "id": "biz_u1_l3",
    "trackId": "business",
    "unitId": "biz_u1",
    "titleEn": "Disagreeing Politely & Reaching Consensus",
    "titleZh": "委婉表達異議與尋求共識",
    "descEn": "Express reservations politely and propose an alternative compromise.",
    "descZh": "在跨國討論中委婉提出疑慮、給出替代方案並達成共識。",
    "scene": "business",
    "rolePrompt": "You are a product director proposing a tight launch deadline. Listen to the engineer's concerns and find middle ground.",
    "missions": [
      {
        "titleEn": "肯定對方觀點並委婉切入疑慮 (I see your point, but...)",
        "titleZh": "肯定對方觀點並委婉切入疑慮 (I see your point, but...)",
        "keywords": [
          "see your point",
          "understand",
          "concern",
          "risk",
          "however",
          "worry"
        ]
      },
      {
        "titleEn": "提出具體替代方案或階段性發布 (Alternative / Phased)",
        "titleZh": "提出具體替代方案或階段性發布 (Alternative / Phased)",
        "keywords": [
          "what if",
          "suggest",
          "alternative",
          "phase",
          "step",
          "how about"
        ]
      },
      {
        "titleEn": "確認下一步行動與負責人 (Next steps / Align)",
        "titleZh": "確認下一步行動與負責人 (Next steps / Align)",
        "keywords": [
          "next step",
          "align",
          "agreed",
          "action item",
          "follow up"
        ]
      }
    ]
  },
  {
    "id": "biz_u2_l1",
    "trackId": "business",
    "unitId": "biz_u2",
    "titleEn": "Trade Show Networking & Exchanging Contacts",
    "titleZh": "展會社交與互換商業名片",
    "descEn": "Start a conversation at a tech booth, introduce products, and exchange LinkedIn/cards.",
    "descZh": "在展覽攤位自然攀談、介紹公司產品亮點並交換名片與 LinkedIn。",
    "scene": "business",
    "rolePrompt": "You are an exhibitor at a tech conference. Welcome the booth visitor, discuss industry trends, and swap business contacts.",
    "missions": [
      {
        "titleEn": "主動向展位人員打招呼並詢問產品特色",
        "titleZh": "主動向展位人員打招呼並詢問產品特色",
        "keywords": [
          "booth",
          "product",
          "demo",
          "features",
          "solutions",
          "interesting"
        ]
      },
      {
        "titleEn": "介紹自己的公司與正在尋找的合作機會",
        "titleZh": "介紹自己的公司與正在尋找的合作機會",
        "keywords": [
          "company",
          "looking for",
          "partnership",
          "integrate",
          "collaborate",
          "we provide"
        ]
      },
      {
        "titleEn": "提議互換名片或交換聯繫方式 (Exchange cards / LinkedIn)",
        "titleZh": "提議互換名片或交換聯繫方式 (Exchange cards / LinkedIn)",
        "keywords": [
          "card",
          "linkedin",
          "contact",
          "email",
          "keep in touch",
          "follow up"
        ]
      }
    ]
  },
  {
    "id": "biz_u2_l2",
    "trackId": "business",
    "unitId": "biz_u2",
    "titleEn": "Hosting Overseas Clients & Office Tour",
    "titleZh": "接待海外客戶與參觀辦公室",
    "descEn": "Welcome a visiting foreign partner, offer drinks, and show them around.",
    "descZh": "在公司前台熱情迎接外賓、提供咖啡茶飲並帶領參觀研發中心。",
    "scene": "business",
    "rolePrompt": "You are a foreign business partner visiting the Taipei office for the first time. Express appreciation for the warm hospitality.",
    "missions": [
      {
        "titleEn": "熱情迎接客戶並關心旅途與時差 (Flight / Jet lag)",
        "titleZh": "熱情迎接客戶並關心旅途與時差 (Flight / Jet lag)",
        "keywords": [
          "welcome",
          "flight",
          "trip",
          "jet lag",
          "taiwan",
          "taipei",
          "how was"
        ]
      },
      {
        "titleEn": "主動招待茶水或咖啡 (Coffee / Tea / Water)",
        "titleZh": "主動招待茶水或咖啡 (Coffee / Tea / Water)",
        "keywords": [
          "coffee",
          "tea",
          "water",
          "drink",
          "get you",
          "comfortable"
        ]
      },
      {
        "titleEn": "引導前往會議室並概述今日議程 (Agenda / Meeting room)",
        "titleZh": "引導前往會議室並概述今日議程 (Agenda / Meeting room)",
        "keywords": [
          "conference room",
          "meeting room",
          "agenda",
          "start",
          "presentation",
          "this way"
        ]
      }
    ]
  },
  {
    "id": "biz_u2_l3",
    "trackId": "business",
    "unitId": "biz_u2",
    "titleEn": "Business Dinner Banter & Toasts",
    "titleZh": "商務晚宴寒暄與祝酒致詞",
    "descEn": "Keep casual conversation flowing over dinner and propose a polite toast.",
    "descZh": "在商務晚宴上自然開啟輕鬆話題、介紹在地特色並舉杯祝酒慶祝合作。",
    "scene": "business",
    "rolePrompt": "You are a foreign client enjoying dinner at a fine restaurant. Share enthusiasm about the joint partnership and local culture.",
    "missions": [
      {
        "titleEn": "介紹一道在地經典特色美食給客戶",
        "titleZh": "介紹一道在地經典特色美食給客戶",
        "keywords": [
          "dish",
          "food",
          "beef noodle",
          "dumpling",
          "night market",
          "specialty",
          "try"
        ]
      },
      {
        "titleEn": "舉杯祝酒慶祝團隊與未來的合作 (Propose a toast / Cheers)",
        "titleZh": "舉杯祝酒慶祝團隊與未來的合作 (Propose a toast / Cheers)",
        "keywords": [
          "toast",
          "cheers",
          "partnership",
          "success",
          "future",
          "raise a glass"
        ]
      },
      {
        "titleEn": "得體結尾並表達對明天行程的期待",
        "titleZh": "得體結尾並表達對明天行程的期待",
        "keywords": [
          "tomorrow",
          "wonderful evening",
          "thank you",
          "great dinner",
          "rest well"
        ]
      }
    ]
  },
  {
    "id": "biz_u3_l1",
    "trackId": "business",
    "unitId": "biz_u3",
    "titleEn": "Interview Self-Intro & Core Strengths",
    "titleZh": "英文面試開場與核心優勢陳述",
    "descEn": "Deliver a structured 90-second pitch covering experience, impact, and fit.",
    "descZh": "自信闡述過往關鍵專案戰績、專業優勢以及與該職位的契合度。",
    "scene": "interview",
    "rolePrompt": "You are an executive interviewer at a global tech firm. Ask the candidate: 'Tell me about yourself and why you are interested in this position.'",
    "missions": [
      {
        "titleEn": "概述過往經歷與核心專業領域 (Experience & Background)",
        "titleZh": "概述過往經歷與核心專業領域 (Experience & Background)",
        "keywords": [
          "years",
          "experience",
          "background",
          "specialized",
          "engineer",
          "designer",
          "built"
        ]
      },
      {
        "titleEn": "具體量化一項過往成果 (Numbers / Growth / Impact)",
        "titleZh": "具體量化一項過往成果 (Numbers / Growth / Impact)",
        "keywords": [
          "percent",
          "%",
          "users",
          "reduced",
          "improved",
          "increased",
          "revenue",
          "scale"
        ]
      },
      {
        "titleEn": "說明為何對本公司/職位感興趣 (Why this company)",
        "titleZh": "說明為何對本公司/職位感興趣 (Why this company)",
        "keywords": [
          "excited",
          "admire",
          "mission",
          "fit",
          "opportunity",
          "growth",
          "why i want"
        ]
      }
    ]
  },
  {
    "id": "biz_u3_l2",
    "trackId": "business",
    "unitId": "biz_u3",
    "titleEn": "Behavioral Questions with STAR Method",
    "titleZh": "行為面試 STAR 原則實戰回答",
    "descEn": "Answer a challenging conflict or failure question with Situation, Task, Action, Result.",
    "descZh": "運用 STAR 結構回答「描述一次與同事意見分歧或專案挑戰」的經典考題。",
    "scene": "interview",
    "rolePrompt": "You are a hiring manager asking: 'Tell me about a time you faced a major technical challenge or deadline crunch.'",
    "missions": [
      {
        "titleEn": "交代具體挑戰背景與目標任務 (Situation & Task)",
        "titleZh": "交代具體挑戰背景與目標任務 (Situation & Task)",
        "keywords": [
          "situation",
          "faced",
          "challenge",
          "deadline",
          "task",
          "problem",
          "when"
        ]
      },
      {
        "titleEn": "清晰描述自己採取的行動策略 (Action taken)",
        "titleZh": "清晰描述自己採取的行動策略 (Action taken)",
        "keywords": [
          "i decided",
          "action",
          "communicated",
          "implemented",
          "solved",
          "led",
          "step"
        ]
      },
      {
        "titleEn": "總結最終帶來的具體成效與學習 (Result & Takeaway)",
        "titleZh": "總結最終帶來的具體成效與學習 (Result & Takeaway)",
        "keywords": [
          "result",
          "outcome",
          "learned",
          "delivered",
          "success",
          "improved",
          "eventually"
        ]
      }
    ]
  },
  {
    "id": "biz_u3_l3",
    "trackId": "business",
    "unitId": "biz_u3",
    "titleEn": "Salary & Offer Package Negotiation",
    "titleZh": "薪資待遇與 Offer 條件協商",
    "descEn": "Negotiate base pay, remote flexibility, and stock options diplomatically.",
    "descZh": "禮貌詢問薪資結構、爭取符合市場行情的底薪、遠端彈性與股票期權。",
    "scene": "interview",
    "rolePrompt": "You are a recruiter extending a job offer. Discuss the total compensation package with the candidate.",
    "missions": [
      {
        "titleEn": "表達對 Offer 的感謝與對職位的熱情 (Appreciate the offer)",
        "titleZh": "表達對 Offer 的感謝與對職位的熱情 (Appreciate the offer)",
        "keywords": [
          "thank you",
          "excited",
          "offer",
          "appreciate",
          "grateful",
          "love to join"
        ]
      },
      {
        "titleEn": "委婉提出期望的薪酬區間或待遇要求 (Target compensation)",
        "titleZh": "委婉提出期望的薪酬區間或待遇要求 (Target compensation)",
        "keywords": [
          "salary",
          "compensation",
          "target",
          "market rate",
          "package",
          "base pay"
        ]
      },
      {
        "titleEn": "確認回覆期限與到職日安排 (Start date / Timeline)",
        "titleZh": "確認回覆期限與到職日安排 (Start date / Timeline)",
        "keywords": [
          "start date",
          "notice period",
          "decision",
          "timeline",
          "review",
          "sign"
        ]
      }
    ]
  }
];
