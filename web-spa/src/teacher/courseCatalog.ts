export type CourseMission={titleEn:string;titleZh:string;keywords:string[]};
export type CourseLesson={id:string;trackId:string;unitId:string;titleEn:string;titleZh:string;descEn:string;descZh:string;scene:string;rolePrompt:string;missions:CourseMission[]};
export type CourseUnit={id:string;trackId:string;titleEn:string;titleZh:string;descEn:string;descZh:string};
export type CourseTrack={id:string;emoji:string;titleEn:string;titleZh:string;descEn:string;descZh:string};

export const COURSE_TRACKS:CourseTrack[]=[
  {
    "id": "travel",
    "emoji": "✈️",
    "titleEn": "Travel & Survival English",
    "titleZh": "出國自由行與生活生存英語",
    "descEn": "Master ordering, transit, hotel requests, customs and shopping easily.",
    "descZh": "從點餐、機場海關、交通問路、飯店入住到購物退稅，全面掌握海外生活口語。"
  },
  {
    "id": "business",
    "emoji": "💼",
    "titleEn": "Business & Career English",
    "titleZh": "職場商務與跨國溝通",
    "descEn": "Master remote meetings, project blockers, polite negotiations, and job interviews.",
    "descZh": "掌握英文會議主持、進度匯報、商業社交接待與外商求職面試談判技巧。"
  },
  {
    "id": "daily",
    "emoji": "☕",
    "titleEn": "Daily Conversation & Small Talk",
    "titleZh": "日常社交與深度閒聊",
    "descEn": "Talk about weekends, movies, food, pets, travel stories, and AI trends.",
    "descZh": "聊週末計畫、熱門影集、毛小孩寵物、旅遊故事與 AI 科技生活趨勢。"
  }
];
export const COURSE_UNITS:CourseUnit[]=[
  {
    "id": "travel_u1",
    "trackId": "travel",
    "titleEn": "Unit 1: Dining & Cafe Ordering",
    "titleZh": "第 1 單元：咖啡廳與各類餐廳點餐",
    "descEn": "Learn drink customizations, steakhouse doneness, fast food and bill splitting.",
    "descZh": "學會飲品客製、牛排熟度、速食店得來速、忌口交代與結帳買單。"
  },
  {
    "id": "travel_u2",
    "trackId": "travel",
    "titleEn": "Unit 2: Airport & Transit",
    "titleZh": "第 2 單元：機場出入境與交通問路",
    "descEn": "Check-in, customs immigration, lost baggage, subway and street directions.",
    "descZh": "機場報到劃位、海關入境應答、行李遺失申報與街頭問路。"
  },
  {
    "id": "travel_u3",
    "trackId": "travel",
    "titleEn": "Unit 3: Hotel & Accommodation",
    "titleZh": "第 3 單元：飯店入住與設施要求",
    "descEn": "Check-in, room problems, luggage storage, and check-out services.",
    "descZh": "飯店 Check-in、要求高樓層、房間設備問題反映與退房寄存。"
  },
  {
    "id": "travel_u4",
    "trackId": "travel",
    "titleEn": "Unit 4: Shopping, Tax Refund & Health",
    "titleZh": "第 4 單元：購物試穿、退稅與藥局求助",
    "descEn": "Fitting clothes, department store tax refund, and pharmacy symptom descriptions.",
    "descZh": "服飾專櫃試穿換尺寸、百貨商場退稅手續與藥局購藥症狀描述。"
  },
  {
    "id": "biz_u1",
    "trackId": "business",
    "titleEn": "Unit 1: Remote Meetings & Updates",
    "titleZh": "第 1 單元：跨國線上會議與專案進度",
    "descEn": "Icebreaking in meetings, delivering status updates, and alignment.",
    "descZh": "線上會議開場破冰、專案進度匯報與排除阻礙。"
  },
  {
    "id": "biz_u2",
    "trackId": "business",
    "titleEn": "Unit 2: Networking & Client Hosting",
    "titleZh": "第 2 單元：商業社交與海外客戶接待",
    "descEn": "Trade show networking, card exchange, office tours, and business dinners.",
    "descZh": "國際展會交流、互換名片、接待參觀辦公室與商務晚宴祝酒。"
  },
  {
    "id": "biz_u3",
    "trackId": "business",
    "titleEn": "Unit 3: Job Interviews & Negotiations",
    "titleZh": "第 3 單元：英文求職面試與薪資談判",
    "descEn": "Self-intro pitch, behavioral STAR questions, and salary/offer negotiations.",
    "descZh": "外商面試一分鐘自我介紹、行為面試 STAR 原則與薪資福利協商。"
  },
  {
    "id": "daily_u1",
    "trackId": "daily",
    "titleEn": "Unit 1: Weekend Life & Hobbies",
    "titleZh": "第 1 單元：週末生活與興趣話題",
    "descEn": "Weekend outdoor activities, movie/food recommendations, and declining plans.",
    "descZh": "分享週末行程、探店美食影集推薦與改期邀約。"
  },
  {
    "id": "daily_u2",
    "trackId": "daily",
    "titleEn": "Unit 2: Pets, Travel Stories & Wellness",
    "titleZh": "第 2 單元：毛小孩、旅行奇遇與生活調適",
    "descEn": "Sharing stories about pets, unforgettable travel, and managing stress.",
    "descZh": "分享毛小孩趣事、難忘的異國旅行奇遇與紓壓生活哲學。"
  },
  {
    "id": "daily_u3",
    "trackId": "daily",
    "titleEn": "Unit 3: AI & Modern Lifestyle Trends",
    "titleZh": "第 3 單元：AI 科技、音樂與生活新趨勢",
    "descEn": "Discussing generative AI, concert experiences, and fitness trends.",
    "descZh": "探討生成式 AI 對生活的改變、演唱會熱血體驗與健身飲食新潮流。"
  }
];
export const COURSE_LESSONS:CourseLesson[]=[
  {
    "id": "travel_u1_l1",
    "trackId": "travel",
    "unitId": "travel_u1",
    "titleEn": "Coffee Shop & Drink Customization",
    "titleZh": "咖啡廳點餐與客製化甜度冰塊",
    "descEn": "Order coffee and tea drinks with milk choices and sweetness levels.",
    "descZh": "點選咖啡與茶飲，並提出換燕麥奶、甜度冰塊等客製要求。",
    "scene": "food_ordering",
    "rolePrompt": "You are a friendly barista at a specialty coffee shop. Greet the customer warmly and ask for their drink order, size, and milk preference.",
    "missions": [
      {
        "titleEn": "向店員點一杯咖啡或茶飲",
        "titleZh": "向店員點一杯咖啡或茶飲",
        "keywords": [
          "latte",
          "coffee",
          "tea",
          "cappuccino",
          "order",
          "like"
        ]
      },
      {
        "titleEn": "提出客製化要求（換奶/甜度/冰塊）",
        "titleZh": "提出客製化要求（換奶/甜度/冰塊）",
        "keywords": [
          "oat milk",
          "less ice",
          "half sugar",
          "no ice",
          "skim",
          "almond",
          "sugar",
          "ice"
        ]
      },
      {
        "titleEn": "詢問結帳方式並完成買單",
        "titleZh": "詢問結帳方式並完成買單",
        "keywords": [
          "pay",
          "card",
          "apple pay",
          "cash",
          "total",
          "how much"
        ]
      }
    ]
  },
  {
    "id": "travel_u1_l2",
    "trackId": "travel",
    "unitId": "travel_u1",
    "titleEn": "Steakhouse & Food Recommendations",
    "titleZh": "西餐廳點餐與牛排熟度",
    "descEn": "Ask for house specials, choose steak doneness, and request side dishes.",
    "descZh": "詢問主廚招牌菜、點選牛排熟度與搭配附餐。",
    "scene": "food_ordering",
    "rolePrompt": "You are an attentive waiter at an upscale steakhouse. Welcome the guest, introduce today's special, and ask for their steak doneness preference.",
    "missions": [
      {
        "titleEn": "詢問服務生推薦料理或招牌菜",
        "titleZh": "詢問服務生推薦料理或招牌菜",
        "keywords": [
          "recommend",
          "special",
          "popular",
          "signature"
        ]
      },
      {
        "titleEn": "點選牛排並指定熟度 (如 medium-rare)",
        "titleZh": "點選牛排並指定熟度 (如 medium-rare)",
        "keywords": [
          "medium-rare",
          "medium",
          "rare",
          "well-done",
          "steak",
          "ribeye"
        ]
      },
      {
        "titleEn": "選擇附餐或詢問醬汁搭配",
        "titleZh": "選擇附餐或詢問醬汁搭配",
        "keywords": [
          "sauce",
          "fries",
          "salad",
          "side",
          "potato",
          "mash"
        ]
      }
    ]
  },
  {
    "id": "travel_u1_l3",
    "trackId": "travel",
    "unitId": "travel_u1",
    "titleEn": "Handling Food Issues & Splitting the Bill",
    "titleZh": "餐點問題反映與帳單分攤",
    "descEn": "Politely report a wrong dish and ask to split the bill with friends.",
    "descZh": "禮貌反映送錯餐點或冷掉，並與服務生提出分開結帳。",
    "scene": "food_ordering",
    "rolePrompt": "You are a polite restaurant manager. Listen to the customer's request carefully, apologize if needed, and assist with bill payment.",
    "missions": [
      {
        "titleEn": "禮貌反映餐點狀況（如送錯或冷掉）",
        "titleZh": "禮貌反映餐點狀況（如送錯或冷掉）",
        "keywords": [
          "wrong",
          "cold",
          "order",
          "ordered",
          "mistake",
          "excuse me"
        ]
      },
      {
        "titleEn": "要求索取帳單 (Check / Bill)",
        "titleZh": "要求索取帳單 (Check / Bill)",
        "keywords": [
          "bill",
          "check",
          "receipt"
        ]
      },
      {
        "titleEn": "提出分開結帳 (Split the bill)",
        "titleZh": "提出分開結帳 (Split the bill)",
        "keywords": [
          "split",
          "separately",
          "separate",
          "each"
        ]
      }
    ]
  },
  {
    "id": "travel_u2_l1",
    "trackId": "travel",
    "unitId": "travel_u2",
    "titleEn": "Airport Check-in & Window Seat",
    "titleZh": "機場報到劃位與更換靠窗座位",
    "descEn": "Check in your bags and ask the ground staff for a window or aisle seat.",
    "descZh": "在機場櫃檯辦理登機報到、托運行李並要求靠窗或靠走道座位。",
    "scene": "airport",
    "rolePrompt": "You are an airline check-in ground agent. Greet the passenger, ask for passport, baggage details, and seat preference.",
    "missions": [
      {
        "titleEn": "主動出示護照並表明飛往目的地",
        "titleZh": "主動出示護照並表明飛往目的地",
        "keywords": [
          "passport",
          "flying",
          "flight",
          "to",
          "here is"
        ]
      },
      {
        "titleEn": "說明行李托運數量 (Check-in luggage)",
        "titleZh": "說明行李托運數量 (Check-in luggage)",
        "keywords": [
          "luggage",
          "bag",
          "bags",
          "check-in",
          "suitcase",
          "piece"
        ]
      },
      {
        "titleEn": "要求靠窗或靠走道座位 (Window/Aisle seat)",
        "titleZh": "要求靠窗或靠走道座位 (Window/Aisle seat)",
        "keywords": [
          "window",
          "aisle",
          "seat"
        ]
      }
    ]
  },
  {
    "id": "travel_u2_l2",
    "trackId": "travel",
    "unitId": "travel_u2",
    "titleEn": "Customs Immigration & Travel Purpose",
    "titleZh": "海關入境問答與旅遊目的",
    "descEn": "Answer customs officer questions clearly about your stay and return ticket.",
    "descZh": "向海關官員清晰回答入境目的、停留天數與回程機票。",
    "scene": "airport",
    "rolePrompt": "You are an immigration customs officer at border control. Ask the traveler about their visit purpose, duration of stay, and accommodation.",
    "missions": [
      {
        "titleEn": "說明入境目的（如觀光旅遊/度假）",
        "titleZh": "說明入境目的（如觀光旅遊/度假）",
        "keywords": [
          "vacation",
          "sightseeing",
          "holiday",
          "travel",
          "tourism",
          "visit"
        ]
      },
      {
        "titleEn": "告知停留天數與住宿飯店名稱",
        "titleZh": "告知停留天數與住宿飯店名稱",
        "keywords": [
          "stay",
          "days",
          "week",
          "hotel",
          "staying"
        ]
      },
      {
        "titleEn": "表明已訂好回程機票 (Return ticket)",
        "titleZh": "表明已訂好回程機票 (Return ticket)",
        "keywords": [
          "return",
          "ticket",
          "flight back",
          "leaving"
        ]
      }
    ]
  },
  {
    "id": "travel_u2_l3",
    "trackId": "travel",
    "unitId": "travel_u2",
    "titleEn": "Subway & Street Directions",
    "titleZh": "地鐵購票與街頭問路",
    "descEn": "Ask pedestrians for directions to the train station or landmark.",
    "descZh": "向路人詢問地鐵站方向、換乘路線與步行時間。",
    "scene": "travel",
    "rolePrompt": "You are a helpful local pedestrian in London/New York. Guide the traveler to their destination clearly.",
    "missions": [
      {
        "titleEn": "禮貌詢問前往某地/地鐵站的方向",
        "titleZh": "禮貌詢問前往某地/地鐵站的方向",
        "keywords": [
          "how do i get",
          "where is",
          "station",
          "way to",
          "subway",
          "metro"
        ]
      },
      {
        "titleEn": "詢問步行或搭車大約需要多久 (How long)",
        "titleZh": "詢問步行或搭車大約需要多久 (How long)",
        "keywords": [
          "how long",
          "minutes",
          "walk",
          "far",
          "distance"
        ]
      },
      {
        "titleEn": "致謝並確認方向 (Thank you)",
        "titleZh": "致謝並確認方向 (Thank you)",
        "keywords": [
          "thank you",
          "thanks",
          "appreciate",
          "got it"
        ]
      }
    ]
  },
  {
    "id": "travel_u2_l4",
    "trackId": "travel",
    "unitId": "travel_u2",
    "titleEn": "Lost Baggage Claim & Help Desk",
    "titleZh": "機場行李遺失與服務台申報",
    "descEn": "Report a missing suitcase at the airport baggage service counter.",
    "descZh": "在行李查詢處申報行李未送達、描述外觀特徵並留下聯繫地址。",
    "scene": "airport",
    "rolePrompt": "You are a helpful baggage claim service staff. Ask the passenger for their baggage claim tag, suitcase color/brand, and delivery address.",
    "missions": [
      {
        "titleEn": "說明行李未在轉盤出現並出示行李票 (Claim tag)",
        "titleZh": "說明行李未在轉盤出現並出示行李票 (Claim tag)",
        "keywords": [
          "baggage",
          "suitcase",
          "carousel",
          "missing",
          "tag",
          "didn't come"
        ]
      },
      {
        "titleEn": "清晰描述行李箱的顏色與外觀特徵",
        "titleZh": "清晰描述行李箱的顏色與外觀特徵",
        "keywords": [
          "black",
          "silver",
          "blue",
          "hard-shell",
          "tag",
          "brand",
          "rimowa",
          "samsonite"
        ]
      },
      {
        "titleEn": "留下飯店地址與聯絡電話要求送達",
        "titleZh": "留下飯店地址與聯絡電話要求送達",
        "keywords": [
          "hotel",
          "deliver",
          "phone",
          "address",
          "call me"
        ]
      }
    ]
  },
  {
    "id": "travel_u3_l1",
    "trackId": "travel",
    "unitId": "travel_u3",
    "titleEn": "Hotel Check-in & Quiet High Floor",
    "titleZh": "飯店 Check-in 與要求高樓層安靜房",
    "descEn": "Check into your hotel room and request a quiet room on a high floor.",
    "descZh": "辦理飯店入住，確認早餐時間並要求高樓層安靜房間。",
    "scene": "hotel",
    "rolePrompt": "You are a receptionist at a boutique hotel. Welcome the guest, confirm their booking, and assist with room keys.",
    "missions": [
      {
        "titleEn": "出示預訂並說明入住姓名 (Reservation)",
        "titleZh": "出示預訂並說明入住姓名 (Reservation)",
        "keywords": [
          "reservation",
          "booking",
          "check in",
          "name",
          "booked"
        ]
      },
      {
        "titleEn": "要求高樓層或安靜房間 (High floor / Quiet)",
        "titleZh": "要求高樓層或安靜房間 (High floor / Quiet)",
        "keywords": [
          "high floor",
          "higher floor",
          "quiet",
          "view",
          "bed"
        ]
      },
      {
        "titleEn": "詢問 Wi-Fi 密碼或早餐時間 (Wi-Fi / Breakfast)",
        "titleZh": "詢問 Wi-Fi 密碼或早餐時間 (Wi-Fi / Breakfast)",
        "keywords": [
          "wifi",
          "wi-fi",
          "breakfast",
          "password",
          "time"
        ]
      }
    ]
  },
  {
    "id": "travel_u3_l2",
    "trackId": "travel",
    "unitId": "travel_u3",
    "titleEn": "Room Maintenance & Requesting Room Change",
    "titleZh": "房間設備故障與要求換房",
    "descEn": "Call the front desk to report broken air conditioning or hot water issues.",
    "descZh": "致電櫃檯反映冷氣故障或沒有熱水，必要時要求換房。",
    "scene": "hotel",
    "rolePrompt": "You are the front desk agent on duty. Handle the guest's complaint with empathy and send assistance promptly.",
    "missions": [
      {
        "titleEn": "表明房號並清楚描述設備故障問題",
        "titleZh": "表明房號並清楚描述設備故障問題",
        "keywords": [
          "room",
          "air conditioning",
          "ac",
          "hot water",
          "working",
          "broken",
          "noise"
        ]
      },
      {
        "titleEn": "要求派維修人員上樓檢查 (Send someone)",
        "titleZh": "要求派維修人員上樓檢查 (Send someone)",
        "keywords": [
          "send",
          "check",
          "fix",
          "look",
          "repair"
        ]
      },
      {
        "titleEn": "提出若無法修復希望能更換房間 (Switch room)",
        "titleZh": "提出若無法修復希望能更換房間 (Switch room)",
        "keywords": [
          "switch",
          "change",
          "another room",
          "different room"
        ]
      }
    ]
  },
  {
    "id": "travel_u3_l3",
    "trackId": "travel",
    "unitId": "travel_u3",
    "titleEn": "Hotel Check-out & Luggage Storage",
    "titleZh": "飯店退房與行李暫存接送",
    "descEn": "Check out of the hotel, leave bags until flight time, and book a taxi.",
    "descZh": "辦理退房結清帳單、暫存行李至下午並預約前往機場的計程車。",
    "scene": "hotel",
    "rolePrompt": "You are the front desk cashier. Assist the guest with invoice review, luggage storage tag, and airport taxi reservation.",
    "missions": [
      {
        "titleEn": "告知房號並辦理退房手續 (Check out)",
        "titleZh": "告知房號並辦理退房手續 (Check out)",
        "keywords": [
          "check out",
          "room",
          "key",
          "leaving",
          "bill"
        ]
      },
      {
        "titleEn": "要求暫存行李至出發時間 (Leave bags / Storage)",
        "titleZh": "要求暫存行李至出發時間 (Leave bags / Storage)",
        "keywords": [
          "leave",
          "bags",
          "luggage",
          "store",
          "hold",
          "afternoon"
        ]
      },
      {
        "titleEn": "請櫃檯幫忙叫計程車或預約接駁 (Call a cab / Taxi)",
        "titleZh": "請櫃檯幫忙叫計程車或預約接駁 (Call a cab / Taxi)",
        "keywords": [
          "taxi",
          "cab",
          "airport",
          "shuttle",
          "call"
        ]
      }
    ]
  },
  {
    "id": "travel_u4_l1",
    "trackId": "travel",
    "unitId": "travel_u4",
    "titleEn": "Clothing Store Fitting & Different Sizes",
    "titleZh": "服飾店試穿與尺寸挑選",
    "descEn": "Ask the sales assistant for a fitting room and exchange for a larger size.",
    "descZh": "詢問試衣間位置、試穿外套並請店員拿大一號或不同顏色。",
    "scene": "travel",
    "rolePrompt": "You are an energetic retail fashion sales assistant. Help the shopper find the right fit and suggest colors.",
    "missions": [
      {
        "titleEn": "詢問試衣間位置並要求試穿 (Try on / Fitting room)",
        "titleZh": "詢問試衣間位置並要求試穿 (Try on / Fitting room)",
        "keywords": [
          "try on",
          "fitting room",
          "try this",
          "wear"
        ]
      },
      {
        "titleEn": "說明尺寸大小並要求更換 (Medium / Large / Small)",
        "titleZh": "說明尺寸大小並要求更換 (Medium / Large / Small)",
        "keywords": [
          "size",
          "medium",
          "large",
          "small",
          "tight",
          "loose",
          "bigger"
        ]
      },
      {
        "titleEn": "確認是否有折扣或詢問價錢 (Discount / Price)",
        "titleZh": "確認是否有折扣或詢問價錢 (Discount / Price)",
        "keywords": [
          "discount",
          "sale",
          "price",
          "how much",
          "take it"
        ]
      }
    ]
  },
  {
    "id": "travel_u4_l2",
    "trackId": "travel",
    "unitId": "travel_u4",
    "titleEn": "Department Store Tax Refund",
    "titleZh": "百貨公司辦理購物退稅",
    "descEn": "Ask customer service for VAT tax refund forms with passport and receipts.",
    "descZh": "在百貨服務台出示護照與發票，辦理退稅表格填寫與退稅方式選擇。",
    "scene": "travel",
    "rolePrompt": "You are a tax refund officer at a major department store. Check the receipts, passport eligibility, and offer cash or credit card refund.",
    "missions": [
      {
        "titleEn": "出示護照與購物收據辦理退稅 (Passport & Receipts)",
        "titleZh": "出示護照與購物收據辦理退稅 (Passport & Receipts)",
        "keywords": [
          "passport",
          "receipt",
          "receipts",
          "tax refund",
          "vat"
        ]
      },
      {
        "titleEn": "選擇退款方式（現金退款或信用卡退刷）",
        "titleZh": "選擇退款方式（現金退款或信用卡退刷）",
        "keywords": [
          "card",
          "cash",
          "credit card",
          "refund"
        ]
      },
      {
        "titleEn": "詢問海關蓋章或機場投遞流程 (Customs stamp)",
        "titleZh": "詢問海關蓋章或機場投遞流程 (Customs stamp)",
        "keywords": [
          "airport",
          "customs",
          "stamp",
          "envelope",
          "mail"
        ]
      }
    ]
  },
  {
    "id": "travel_u4_l3",
    "trackId": "travel",
    "unitId": "travel_u4",
    "titleEn": "Pharmacy Consultation & Describing Symptoms",
    "titleZh": "藥局購藥與描述身體不適",
    "descEn": "Explain your symptoms to a pharmacist to get pain relievers or cold medicine.",
    "descZh": "向藥師描述頭痛、喉嚨痛或腸胃不適，詢問服藥劑量與次數。",
    "scene": "travel",
    "rolePrompt": "You are an empathetic pharmacist. Ask the customer about their symptoms, allergies, and give clear medication instructions.",
    "missions": [
      {
        "titleEn": "清楚說明身體不適症狀（如頭痛/喉嚨痛/發燒）",
        "titleZh": "清楚說明身體不適症狀（如頭痛/喉嚨痛/發燒）",
        "keywords": [
          "headache",
          "sore throat",
          "fever",
          "stomach",
          "cough",
          "cold",
          "dizzy"
        ]
      },
      {
        "titleEn": "詢問每日服用次數與是否飯後服用 (After meals)",
        "titleZh": "詢問每日服用次數與是否飯後服用 (After meals)",
        "keywords": [
          "how many",
          "times",
          "after meals",
          "take",
          "dosage",
          "food"
        ]
      },
      {
        "titleEn": "確認是否有嗜睡副作用 (Drowsy / Side effects)",
        "titleZh": "確認是否有嗜睡副作用 (Drowsy / Side effects)",
        "keywords": [
          "drowsy",
          "sleepy",
          "side effect",
          "driving"
        ]
      }
    ]
  },
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
  },
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

export function courseTrack(id:string){return COURSE_TRACKS.find(x=>x.id===id)||null}
export function courseUnit(id:string){return COURSE_UNITS.find(x=>x.id===id)||null}
export function courseLesson(id:string){return COURSE_LESSONS.find(x=>x.id===id)||null}
export function unitsForTrack(trackId:string){return COURSE_UNITS.filter(x=>x.trackId===trackId)}
export function lessonsForUnit(unitId:string){return COURSE_LESSONS.filter(x=>x.unitId===unitId)}
export function lessonsForTrack(trackId:string){return COURSE_LESSONS.filter(x=>x.trackId===trackId)}
