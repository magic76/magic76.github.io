import type{CourseLesson}from"./courseTypes";
export const DAILY_COURSE_LESSONS:CourseLesson[]=[
  {
    "id": "daily_u1_l1",
    "trackId": "daily",
    "unitId": "daily_u1",
    "titleEn": "Weekend Plans & Outdoor Hobbies",
    "titleZh": "週末活動與戶外休閒展開",
    "descEn": "Chat casually with a friend about outdoor hiking, cafes, or relaxing plans.",
    "descZh": "和朋友輕鬆聊聊週末的登山健行、探店咖啡廳或放鬆規劃。",
    "scene": "daily",
    "rolePrompt": "You are an energetic and friendly friend. Ask what your buddy did last weekend and share excitement about outdoor activities.",
    "missions": [
      {
        "titleEn": "分享自己上週末做了一件有趣的事",
        "titleZh": "分享自己上週末做了一件有趣的事",
        "keywords": [
          "weekend",
          "went",
          "hiking",
          "movie",
          "cafe",
          "cooked",
          "played",
          "stayed"
        ]
      },
      {
        "titleEn": "主動反問對方的週末或近期生活 (How about you?)",
        "titleZh": "主動反問對方的週末或近期生活 (How about you?)",
        "keywords": [
          "how about you",
          "what about you",
          "did you",
          "how was your"
        ]
      },
      {
        "titleEn": "約定下次一起參與某個活動 (Let's do that)",
        "titleZh": "約定下次一起參與某個活動 (Let's do that)",
        "keywords": [
          "next time",
          "let's",
          "join",
          "together",
          "should do that",
          "sounds fun"
        ]
      }
    ]
  },
  {
    "id": "daily_u1_l2",
    "trackId": "daily",
    "unitId": "daily_u1",
    "titleEn": "Food Spots & Netflix Binge-Watching",
    "titleZh": "美食探店與熱門影集討論",
    "descEn": "Recommend a hidden gem restaurant and discuss favorite plot twists.",
    "descZh": "推薦一家巷弄排隊美食，並與朋友聊聊最近在追的 Netflix 燒腦影集。",
    "scene": "daily",
    "rolePrompt": "You are a movie and foodie enthusiast. Ask for food recommendations and share your current binge-worthy show.",
    "missions": [
      {
        "titleEn": "推薦一道喜愛的美食或一家餐廳 (Recommend food)",
        "titleZh": "推薦一道喜愛的美食或一家餐廳 (Recommend food)",
        "keywords": [
          "restaurant",
          "food",
          "delicious",
          "pasta",
          "tacos",
          "curry",
          "tried",
          "recommend"
        ]
      },
      {
        "titleEn": "分享正在觀看或喜愛的一部電影/影集 (Show / Movie)",
        "titleZh": "分享正在觀看或喜愛的一部電影/影集 (Show / Movie)",
        "keywords": [
          "netflix",
          "movie",
          "show",
          "series",
          "watching",
          "season",
          "actor",
          "plot"
        ]
      },
      {
        "titleEn": "表達自己對劇情的看法或推薦理由 (Hooked / Worth watching)",
        "titleZh": "表達自己對劇情的看法或推薦理由 (Hooked / Worth watching)",
        "keywords": [
          "worth",
          "hooked",
          "amazing",
          "twist",
          "ending",
          "recommend",
          "great"
        ]
      }
    ]
  },
  {
    "id": "daily_u1_l3",
    "trackId": "daily",
    "unitId": "daily_u1",
    "titleEn": "Declining Invitations Politely & Rain Checks",
    "titleZh": "委婉拒絕邀約與另約時間",
    "descEn": "Politely turn down a dinner party due to a prior commitment and offer another date.",
    "descZh": "因已有安排而委婉拒絕朋友的聚餐邀約，並主動提出改約下週。",
    "scene": "daily",
    "rolePrompt": "You are an understanding friend inviting the student to a weekend BBQ party. Handle their rescheduling warmly.",
    "missions": [
      {
        "titleEn": "感謝對方的邀約並委婉說明無法參加的原因",
        "titleZh": "感謝對方的邀約並委婉說明無法參加的原因",
        "keywords": [
          "thank you",
          "invitation",
          "love to",
          "can't make it",
          "prior",
          "busy",
          "committed"
        ]
      },
      {
        "titleEn": "使用 Rain check 或提議另擇日期 (Rain check / Next week)",
        "titleZh": "使用 Rain check 或提議另擇日期 (Rain check / Next week)",
        "keywords": [
          "rain check",
          "next week",
          "friday",
          "saturday",
          "another time",
          "reschedule"
        ]
      },
      {
        "titleEn": "祝對方活動玩得愉快 (Have a great time)",
        "titleZh": "祝對方活動玩得愉快 (Have a great time)",
        "keywords": [
          "have fun",
          "great time",
          "enjoy",
          "send photos",
          "catch up"
        ]
      }
    ]
  },
  {
    "id": "daily_u2_l1",
    "trackId": "daily",
    "unitId": "daily_u2",
    "titleEn": "Talking About Pets & Funny Animal Moments",
    "titleZh": "聊毛小孩與寵物搞笑日常",
    "descEn": "Talk about your dog/cat's funny quirks and daily companionship.",
    "descZh": "分享家中貓狗的可愛怪癖、拆家日常以及寵物帶來的陪伴與治癒感。",
    "scene": "daily",
    "rolePrompt": "You are a pet lover with two playful golden retrievers. Swap funny pet stories enthusiastically.",
    "missions": [
      {
        "titleEn": "分享自己養的寵物或喜愛的動物類型",
        "titleZh": "分享自己養的寵物或喜愛的動物類型",
        "keywords": [
          "dog",
          "cat",
          "pet",
          "puppy",
          "kitten",
          "animal",
          "breed"
        ]
      },
      {
        "titleEn": "生動描述寵物的一件搞笑或暖心事蹟",
        "titleZh": "生動描述寵物的一件搞笑或暖心事蹟",
        "keywords": [
          "funny",
          "cute",
          "sleeps",
          "barks",
          "toy",
          "walk",
          "cuddle",
          "habit"
        ]
      },
      {
        "titleEn": "詢問對方的寵物經驗 (Dog or cat person)",
        "titleZh": "詢問對方的寵物經驗 (Dog or cat person)",
        "keywords": [
          "do you have",
          "dog person",
          "cat person",
          "how about you",
          "ever had"
        ]
      }
    ]
  },
  {
    "id": "daily_u2_l2",
    "trackId": "daily",
    "unitId": "daily_u2",
    "titleEn": "Memorable Travel Adventures & Hidden Gems",
    "titleZh": "難忘的旅行冒險與在地私房景點",
    "descEn": "Share an unexpected cultural adventure or breathtaking scenery from past trips.",
    "descZh": "分享一次難忘的異國自由行奇遇、壯麗自然景觀與文化震撼感受。",
    "scene": "travel",
    "rolePrompt": "You are an avid backpacker who has visited over 30 countries. Share cultural insights and travel highlights.",
    "missions": [
      {
        "titleEn": "提到一個去過最喜歡的國家或城市 (City / Country)",
        "titleZh": "提到一個去過最喜歡的國家或城市 (City / Country)",
        "keywords": [
          "japan",
          "kyoto",
          "tokyo",
          "europe",
          "italy",
          "paris",
          "london",
          "trip",
          "visited"
        ]
      },
      {
        "titleEn": "描述一個印象深刻的景色或意外收穫 (Breathtaking / Culture)",
        "titleZh": "描述一個印象深刻的景色或意外收穫 (Breathtaking / Culture)",
        "keywords": [
          "scenery",
          "mountain",
          "breathtaking",
          "culture",
          "food",
          "people",
          "amazing"
        ]
      },
      {
        "titleEn": "分享下一個 Bucket List 夢想旅遊清單",
        "titleZh": "分享下一個 Bucket List 夢想旅遊清單",
        "keywords": [
          "next",
          "bucket list",
          "want to go",
          "iceland",
          "spain",
          "hope to"
        ]
      }
    ]
  },
  {
    "id": "daily_u2_l3",
    "trackId": "daily",
    "unitId": "daily_u2",
    "titleEn": "Work-Life Balance & De-Stressing Habits",
    "titleZh": "工作生活平衡與日常紓壓秘訣",
    "descEn": "Discuss modern burnout and practical habits like digital detox or yoga.",
    "descZh": "聊聊上班族的壓力管理、週末數位排毒 (Digital Detox) 與冥想運動放鬆法。",
    "scene": "daily",
    "rolePrompt": "You are a supportive friend who practices mindfulness and pilates. Chat about healthy boundaries and unwinding after work.",
    "missions": [
      {
        "titleEn": "分享自己近期感到疲倦或忙碌的真實感受",
        "titleZh": "分享自己近期感到疲倦或忙碌的真實感受",
        "keywords": [
          "busy",
          "stress",
          "tired",
          "work",
          "hours",
          "exhausted",
          "burnout"
        ]
      },
      {
        "titleEn": "介紹一種自己最有效的放鬆或減壓方式 (Unwind / Exercise)",
        "titleZh": "介紹一種自己最有效的放鬆或減壓方式 (Unwind / Exercise)",
        "keywords": [
          "gym",
          "run",
          "yoga",
          "read",
          "sleep",
          "walk",
          "unwind",
          "detox"
        ]
      },
      {
        "titleEn": "彼此打氣並提出一個健康的小目標 (Take it easy)",
        "titleZh": "彼此打氣並提出一個健康的小目標 (Take it easy)",
        "keywords": [
          "take it easy",
          "rest",
          "healthy",
          "boundary",
          "weekend",
          "cheer"
        ]
      }
    ]
  },
  {
    "id": "daily_u3_l1",
    "trackId": "daily",
    "unitId": "daily_u3",
    "titleEn": "AI Assistants & How Tech Changes Daily Life",
    "titleZh": "AI 智慧工具與未來科技生活",
    "descEn": "Share how you use AI for coding or language learning and debate future trends.",
    "descZh": "聊聊自己如何使用 AI 輔助寫程式或學英文，並交流對未來科技的看法。",
    "scene": "daily",
    "rolePrompt": "You are an enthusiastic tech blogger who uses generative AI daily. Discuss coolest AI tools and creative workflows.",
    "missions": [
      {
        "titleEn": "分享自己日常使用的 AI 或效率軟體工具",
        "titleZh": "分享自己日常使用的 AI 或效率軟體工具",
        "keywords": [
          "ai",
          "chatgpt",
          "gemini",
          "tool",
          "app",
          "code",
          "write",
          "search"
        ]
      },
      {
        "titleEn": "探討 AI 對工作或語言學習帶來的改變 (Productivity / Learning)",
        "titleZh": "探討 AI 對工作或語言學習帶來的改變 (Productivity / Learning)",
        "keywords": [
          "fast",
          "productive",
          "learn",
          "english",
          "helpful",
          "save time",
          "automate"
        ]
      },
      {
        "titleEn": "表達對未來科技的期待或省思 (Future / Exciting)",
        "titleZh": "表達對未來科技的期待或省思 (Future / Exciting)",
        "keywords": [
          "future",
          "exciting",
          "potential",
          "human",
          "creativity",
          "change"
        ]
      }
    ]
  },
  {
    "id": "daily_u3_l2",
    "trackId": "daily",
    "unitId": "daily_u3",
    "titleEn": "Live Concerts & Favorite Music Genres",
    "titleZh": "演唱會現場與喜愛音樂曲風",
    "descEn": "Talk about an electrifying live concert experience and your all-time top artists.",
    "descZh": "分享一次讓人起雞皮疙瘩的演唱會現場體驗，以及最喜歡的樂團歌手。",
    "scene": "daily",
    "rolePrompt": "You are an indie music fanatic who loves attending music festivals. Trade concert memories and artist favorites.",
    "missions": [
      {
        "titleEn": "分享自己最喜歡的音樂曲風或歌手樂團",
        "titleZh": "分享自己最喜歡的音樂曲風或歌手樂團",
        "keywords": [
          "band",
          "singer",
          "pop",
          "rock",
          "jazz",
          "hip hop",
          "artist",
          "music"
        ]
      },
      {
        "titleEn": "描述一次難忘的 Live 演唱會或音樂節現場 (Concert / Live)",
        "titleZh": "描述一次難忘的 Live 演唱會或音樂節現場 (Concert / Live)",
        "keywords": [
          "concert",
          "live",
          "crowd",
          "stage",
          "festival",
          "energy",
          "songs"
        ]
      },
      {
        "titleEn": "詢問對方最近是否有想看的演出 (Upcoming tour)",
        "titleZh": "詢問對方最近是否有想看的演出 (Upcoming tour)",
        "keywords": [
          "ticket",
          "tour",
          "next concert",
          "see them",
          "spotify",
          "playlist"
        ]
      }
    ]
  },
  {
    "id": "daily_u3_l3",
    "trackId": "daily",
    "unitId": "daily_u3",
    "titleEn": "Fitness Goals, Gym Routines & Healthy Eating",
    "titleZh": "健身目標、重訓與健康飲食",
    "descEn": "Swap workout routines, protein goals, and staying motivated consistently.",
    "descZh": "交流每週健身課表、高蛋白飲食心得以及如何維持規律自律。",
    "scene": "daily",
    "rolePrompt": "You are an energetic certified personal trainer. Share practical workout tips and celebrate fitness milestones.",
    "missions": [
      {
        "titleEn": "分享自己目前的運動習慣（如慢跑/重訓/游泳/瑜珈）",
        "titleZh": "分享自己目前的運動習慣（如慢跑/重訓/游泳/瑜珈）",
        "keywords": [
          "gym",
          "run",
          "running",
          "workout",
          "weights",
          "swim",
          "yoga",
          "walk"
        ]
      },
      {
        "titleEn": "分享一項健康飲食習慣或喜愛的健康餐 (Diet / Protein / Veggies)",
        "titleZh": "分享一項健康飲食習慣或喜愛的健康餐 (Diet / Protein / Veggies)",
        "keywords": [
          "diet",
          "protein",
          "salad",
          "chicken",
          "water",
          "sugar",
          "healthy food"
        ]
      },
      {
        "titleEn": "設定下一個月的新目標並互相鼓勵 (Goal / Keep it up)",
        "titleZh": "設定下一個月的新目標並互相鼓勵 (Goal / Keep it up)",
        "keywords": [
          "goal",
          "target",
          "keep it up",
          "routine",
          "stay consistent",
          "proud"
        ]
      }
    ]
  }
];
