import type{CourseLesson}from"./courseTypes";
export const TRAVEL_COURSE_LESSONS:CourseLesson[]=[
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
  }
];
