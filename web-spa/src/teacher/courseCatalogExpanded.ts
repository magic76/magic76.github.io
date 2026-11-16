// Generated from Android main CourseManager.java and ExpandedCourseCatalog.java (2026-10-22).
// Android owns the lesson definition; keep IDs and mission ordering stable for progress.
import type {CourseLesson,CourseTrack,CourseUnit,CourseWarmupPhrase} from "./courseTypes";

export const EXPANDED_COURSE_TRACKS:CourseTrack[]=[
  {
    "id": "teamwork",
    "emoji": "🤝",
    "titleEn": "Teamwork & Collaboration",
    "titleZh": "團隊合作與協作溝通",
    "descEn": "Handle standups, blockers, reviews, brainstorming, disagreement and feedback with teammates.",
    "descZh": "練習站會、求助、協作審查、腦力激盪、意見衝突與回饋，讓團隊溝通更自然。"
  },
  {
    "id": "tickets",
    "emoji": "🎫",
    "titleEn": "Tickets & Going Out",
    "titleZh": "買票、交通與活動入場",
    "descEn": "Buy transport and event tickets, choose seats, change bookings, and solve entry problems.",
    "descZh": "從火車、巴士到電影、演唱會與景點門票，練習買票、選位、改票與入場問題。"
  },
  {
    "id": "services",
    "emoji": "🧾",
    "titleEn": "Everyday Services & Errands",
    "titleZh": "生活辦事與客服求助",
    "descEn": "Handle mobile plans, deliveries, banking, appointments, repairs and customer-service problems.",
    "descZh": "練習門號、包裹、銀行、預約、維修與客服問題，補齊真正生活中常遇到的英文。"
  }
];

export const EXPANDED_COURSE_UNITS:CourseUnit[]=[
  {
    "id": "teamwork_u1",
    "trackId": "teamwork",
    "titleEn": "Unit 1: Working Together Day to Day",
    "titleZh": "第 1 單元：日常團隊協作",
    "descEn": "Give status updates, ask for help, and review work together.",
    "descZh": "從進度同步、遇到阻塞求助，到一起 review 工作成果。"
  },
  {
    "id": "teamwork_u2",
    "trackId": "teamwork",
    "titleEn": "Unit 2: Alignment, Conflict & Feedback",
    "titleZh": "第 2 單元：對齊、衝突與回饋",
    "descEn": "Brainstorm options, disagree professionally, and give useful feedback.",
    "descZh": "學會提出方案、專業地不同意，並給出真正有幫助的建設性回饋。"
  },
  {
    "id": "tickets_u1",
    "trackId": "tickets",
    "titleEn": "Unit 1: Transport Tickets",
    "titleZh": "第 1 單元：交通票券",
    "descEn": "Buy train, bus and ferry tickets and handle booking changes.",
    "descZh": "購買火車、巴士、船票，並處理座位、班次與改退票問題。"
  },
  {
    "id": "tickets_u2",
    "trackId": "tickets",
    "titleEn": "Unit 2: Events & Attractions",
    "titleZh": "第 2 單元：電影、演唱會與景點門票",
    "descEn": "Buy event tickets, reserve time slots, and handle sold-out or entry issues.",
    "descZh": "購買電影、演唱會與景點票，選擇場次時段，並處理售罄與入場問題。"
  },
  {
    "id": "services_u1",
    "trackId": "services",
    "titleEn": "Unit 1: Daily Errands",
    "titleZh": "第 1 單元：日常生活辦事",
    "descEn": "Set up a SIM plan, collect a parcel, and handle simple banking tasks.",
    "descZh": "辦門號、領包裹、處理簡單銀行與換匯需求。"
  },
  {
    "id": "services_u2",
    "trackId": "services",
    "titleEn": "Unit 2: Appointments, Repairs & Customer Service",
    "titleZh": "第 2 單元：預約、維修與客服",
    "descEn": "Book appointments, explain repair problems, and request a fair resolution.",
    "descZh": "預約服務、描述維修問題，並在客服情境中禮貌爭取合理處理。"
  }
];

export const EXPANDED_COURSE_LESSONS:CourseLesson[]=[
  {
    "id": "teamwork_u1_l1",
    "trackId": "teamwork",
    "unitId": "teamwork_u1",
    "titleEn": "Daily Standup & Status Update",
    "titleZh": "每日站會與進度同步",
    "descEn": "Give a concise update on what you finished, what is next, and what is blocked.",
    "descZh": "用簡潔英文說明昨天完成什麼、今天要做什麼，以及目前阻塞點。",
    "scene": "business",
    "rolePrompt": "You are a teammate in a short daily standup. Ask for yesterday's progress, today's plan, and blockers. Keep the exchange concise and realistic.",
    "missions": [
      {
        "titleEn": "Share one thing you finished yesterday",
        "titleZh": "說出昨天完成的一件事",
        "keywords": [
          "finished",
          "completed",
          "yesterday",
          "done"
        ]
      },
      {
        "titleEn": "Explain your main task for today",
        "titleZh": "說明今天的主要工作",
        "keywords": [
          "today",
          "working on",
          "plan",
          "next"
        ]
      },
      {
        "titleEn": "Name a blocker or say you have none",
        "titleZh": "說出一個 blocker 或明確表示目前沒有 blocker",
        "keywords": [
          "blocked",
          "blocker",
          "issue",
          "no blockers",
          "need help"
        ]
      }
    ]
  },
  {
    "id": "teamwork_u1_l2",
    "trackId": "teamwork",
    "unitId": "teamwork_u1",
    "titleEn": "Asking for Help & Removing Blockers",
    "titleZh": "遇到問題求助與解除阻塞",
    "descEn": "Explain the problem clearly, show what you tried, and ask for specific help.",
    "descZh": "清楚描述問題、說明已嘗試的方法，並向同事提出具體協助需求。",
    "scene": "business",
    "rolePrompt": "You are a helpful senior teammate. Ask the learner to explain the blocker, what they already tried, and exactly what help they need.",
    "missions": [
      {
        "titleEn": "Describe the problem blocking your progress",
        "titleZh": "描述目前卡住的問題",
        "keywords": [
          "stuck",
          "problem",
          "issue",
          "error",
          "blocked"
        ]
      },
      {
        "titleEn": "Explain at least one solution you have already tried",
        "titleZh": "說明至少一個已經嘗試過的方法",
        "keywords": [
          "tried",
          "checked",
          "tested",
          "reproduced",
          "debugged"
        ]
      },
      {
        "titleEn": "Ask clearly for the help you need",
        "titleZh": "提出明確的協助請求",
        "keywords": [
          "could you",
          "help",
          "take a look",
          "review",
          "pair"
        ]
      }
    ]
  },
  {
    "id": "teamwork_u1_l3",
    "trackId": "teamwork",
    "unitId": "teamwork_u1",
    "titleEn": "Code / Design Review Discussion",
    "titleZh": "Code Review 與設計 Review 討論",
    "descEn": "Explain your decision, respond to comments, and agree on follow-up changes.",
    "descZh": "說明自己的設計考量、回應 review 意見，並確認接下來如何修改。",
    "scene": "business",
    "rolePrompt": "You are a thoughtful reviewer. Question one implementation or design decision, suggest an alternative, and ask the learner to explain trade-offs.",
    "missions": [
      {
        "titleEn": "Explain why you chose a particular design or implementation",
        "titleZh": "解釋一個實作或設計決定的理由",
        "keywords": [
          "because",
          "reason",
          "approach",
          "design",
          "trade-off"
        ]
      },
      {
        "titleEn": "Respond to a reviewer’s question or suggestion",
        "titleZh": "回應 reviewer 的疑問或建議",
        "keywords": [
          "point",
          "agree",
          "consider",
          "suggestion",
          "alternative"
        ]
      },
      {
        "titleEn": "Confirm at least one follow-up change",
        "titleZh": "確認至少一個後續修改項目",
        "keywords": [
          "update",
          "change",
          "fix",
          "add a test",
          "follow up"
        ]
      }
    ]
  },
  {
    "id": "teamwork_u2_l1",
    "trackId": "teamwork",
    "unitId": "teamwork_u2",
    "titleEn": "Brainstorming Ideas & Trade-offs",
    "titleZh": "腦力激盪與方案取捨",
    "descEn": "Suggest options, compare pros and cons, and recommend a direction.",
    "descZh": "提出多個方案、比較優缺點，並推薦團隊接下來採用的方向。",
    "scene": "business",
    "rolePrompt": "You are facilitating a product brainstorming session. Ask for two options, challenge the trade-offs, and help the learner recommend one direction.",
    "missions": [
      {
        "titleEn": "Suggest at least two possible approaches",
        "titleZh": "提出至少兩個可能方案",
        "keywords": [
          "option",
          "another",
          "alternative",
          "could",
          "what if"
        ]
      },
      {
        "titleEn": "Compare at least one advantage and drawback",
        "titleZh": "比較至少一項優點與缺點",
        "keywords": [
          "pro",
          "con",
          "benefit",
          "downside",
          "trade-off",
          "risk"
        ]
      },
      {
        "titleEn": "Recommend an approach and explain why",
        "titleZh": "推薦一個方向並說明原因",
        "keywords": [
          "recommend",
          "prefer",
          "I think",
          "because",
          "direction"
        ]
      }
    ]
  },
  {
    "id": "teamwork_u2_l2",
    "trackId": "teamwork",
    "unitId": "teamwork_u2",
    "titleEn": "Disagreeing Without Creating Conflict",
    "titleZh": "有不同意見但不製造衝突",
    "descEn": "Challenge an idea respectfully, explain your concern, and find a compromise.",
    "descZh": "禮貌提出不同意見、說明疑慮，最後一起找出可接受的折衷方案。",
    "scene": "business",
    "rolePrompt": "You are a teammate who strongly prefers a different solution. Push back professionally and work toward a practical compromise.",
    "missions": [
      {
        "titleEn": "Acknowledge the other person’s point of view",
        "titleZh": "先肯定或理解對方觀點",
        "keywords": [
          "understand",
          "see your point",
          "I get",
          "goal"
        ]
      },
      {
        "titleEn": "Clearly express your concern",
        "titleZh": "清楚說出自己的疑慮",
        "keywords": [
          "concern",
          "not sure",
          "risk",
          "worry",
          "scale"
        ]
      },
      {
        "titleEn": "Offer a practical compromise",
        "titleZh": "提出可執行的折衷方案",
        "keywords": [
          "could we",
          "compromise",
          "smaller",
          "pilot",
          "try first"
        ]
      }
    ]
  },
  {
    "id": "teamwork_u2_l3",
    "trackId": "teamwork",
    "unitId": "teamwork_u2",
    "titleEn": "Retrospective & Constructive Feedback",
    "titleZh": "Retro 復盤與建設性回饋",
    "descEn": "Describe what went well, what was difficult, and one concrete improvement.",
    "descZh": "在復盤中說出做得好的地方、遇到的困難，以及下一次可以如何改善。",
    "scene": "business",
    "rolePrompt": "You are leading a friendly sprint retrospective. Ask what went well, what was difficult, and what the team should change next time.",
    "missions": [
      {
        "titleEn": "Share one thing the team did well",
        "titleZh": "分享一件這次做得好的事",
        "keywords": [
          "went well",
          "good",
          "worked",
          "successful"
        ]
      },
      {
        "titleEn": "Describe one difficulty or area to improve",
        "titleZh": "說明一個困難或不足",
        "keywords": [
          "difficult",
          "problem",
          "challenge",
          "didn't",
          "issue"
        ]
      },
      {
        "titleEn": "Suggest a concrete improvement for next time",
        "titleZh": "提出下一次可採取的具體改善",
        "keywords": [
          "next time",
          "improve",
          "should",
          "change",
          "better"
        ]
      }
    ]
  },
  {
    "id": "tickets_u1_l1",
    "trackId": "tickets",
    "unitId": "tickets_u1",
    "titleEn": "Buying a Train Ticket & Choosing a Seat",
    "titleZh": "買火車票與選座位",
    "descEn": "Ask about departure times, ticket types, platforms and seat preferences.",
    "descZh": "詢問出發時間、票種、月台，並選擇靠窗或走道座位。",
    "scene": "travel",
    "rolePrompt": "You are a train-station ticket clerk. Help the traveler choose a departure, ticket type and seat, then confirm the platform.",
    "missions": [
      {
        "titleEn": "State your destination and preferred departure time",
        "titleZh": "說出目的地與想搭的時間",
        "keywords": [
          "ticket",
          "to",
          "train",
          "time",
          "one-way",
          "return"
        ]
      },
      {
        "titleEn": "Choose a ticket type or seating preference",
        "titleZh": "選擇票種或座位偏好",
        "keywords": [
          "window",
          "aisle",
          "seat",
          "first class",
          "standard",
          "return"
        ]
      },
      {
        "titleEn": "Confirm the platform and departure details",
        "titleZh": "確認月台或出發資訊",
        "keywords": [
          "platform",
          "leave",
          "depart",
          "which",
          "gate"
        ]
      }
    ]
  },
  {
    "id": "tickets_u1_l2",
    "trackId": "tickets",
    "unitId": "tickets_u1",
    "titleEn": "Bus, Ferry & Day Pass Tickets",
    "titleZh": "巴士、渡輪與一日票",
    "descEn": "Ask about zones, day passes, transfers and whether a ticket covers your whole trip.",
    "descZh": "詢問票價區域、一日票、轉乘，以及同一張票是否涵蓋整段行程。",
    "scene": "travel",
    "rolePrompt": "You are a transit information clerk. Compare single tickets with a day pass and explain transfer or zone rules.",
    "missions": [
      {
        "titleEn": "Ask about single tickets versus day passes",
        "titleZh": "詢問單程票與一日票的差別",
        "keywords": [
          "day pass",
          "single",
          "cheaper",
          "ticket",
          "price"
        ]
      },
      {
        "titleEn": "Check which routes or zones the ticket covers",
        "titleZh": "確認票券涵蓋的交通或區域",
        "keywords": [
          "include",
          "zone",
          "ferry",
          "bus",
          "cover"
        ]
      },
      {
        "titleEn": "Ask about transfers or ticket validity",
        "titleZh": "詢問轉乘或有效時間",
        "keywords": [
          "transfer",
          "valid",
          "hours",
          "change",
          "same ticket"
        ]
      }
    ]
  },
  {
    "id": "tickets_u1_l3",
    "trackId": "tickets",
    "unitId": "tickets_u1",
    "titleEn": "Changing, Refunding or Missing a Departure",
    "titleZh": "改票、退票與錯過班次",
    "descEn": "Explain what happened and ask to change or refund a transport booking.",
    "descZh": "說明錯過班次或行程改變，詢問是否能改票、補差價或退款。",
    "scene": "travel",
    "rolePrompt": "You are a transport service agent. Ask why the passenger missed or wants to change the booking and explain available options.",
    "missions": [
      {
        "titleEn": "Explain why you need a change or missed departure",
        "titleZh": "說明為什麼需要改票或錯過班次",
        "keywords": [
          "missed",
          "delayed",
          "change",
          "because",
          "connection"
        ]
      },
      {
        "titleEn": "Ask about the next or an alternative departure",
        "titleZh": "詢問下一班或可替代的班次",
        "keywords": [
          "next",
          "departure",
          "another",
          "later",
          "available"
        ]
      },
      {
        "titleEn": "Confirm change fees or refund rules",
        "titleZh": "確認改票費用或退款規則",
        "keywords": [
          "fee",
          "refund",
          "charge",
          "difference",
          "pay"
        ]
      }
    ]
  },
  {
    "id": "tickets_u2_l1",
    "trackId": "tickets",
    "unitId": "tickets_u2",
    "titleEn": "Movie or Concert Tickets & Seat Selection",
    "titleZh": "電影或演唱會買票與選位",
    "descEn": "Choose a showtime, ticket quantity, seat section and payment method.",
    "descZh": "選擇場次、張數、座位區域並確認付款方式。",
    "scene": "daily",
    "rolePrompt": "You are a box-office staff member. Help the customer choose a showtime, number of tickets and available seats.",
    "missions": [
      {
        "titleEn": "Ask whether tickets are available for a date or show",
        "titleZh": "詢問指定日期或場次是否有票",
        "keywords": [
          "tickets",
          "show",
          "tonight",
          "available",
          "time"
        ]
      },
      {
        "titleEn": "Specify the number of tickets and preferred seats",
        "titleZh": "說出需要的票數與座位偏好",
        "keywords": [
          "two",
          "seats",
          "center",
          "aisle",
          "section",
          "row"
        ]
      },
      {
        "titleEn": "Confirm the total price or payment method",
        "titleZh": "確認總價或付款方式",
        "keywords": [
          "total",
          "price",
          "pay",
          "card",
          "how much"
        ]
      }
    ]
  },
  {
    "id": "tickets_u2_l2",
    "trackId": "tickets",
    "unitId": "tickets_u2",
    "titleEn": "Museum, Theme Park & Timed Entry",
    "titleZh": "博物館、樂園與預約時段",
    "descEn": "Ask about timed entry, family tickets, child discounts and re-entry rules.",
    "descZh": "詢問預約時段、家庭票、兒童優惠，以及是否可以再次入場。",
    "scene": "travel",
    "rolePrompt": "You are an attraction ticket-counter staff member. Explain timed entry, family pricing and entry rules clearly.",
    "missions": [
      {
        "titleEn": "Ask whether a timed entry reservation is required",
        "titleZh": "詢問是否需要預約入場時段",
        "keywords": [
          "time slot",
          "book",
          "reserve",
          "entry",
          "advance"
        ]
      },
      {
        "titleEn": "Ask about family or child admission prices",
        "titleZh": "詢問家庭票或兒童票價",
        "keywords": [
          "family",
          "children",
          "child",
          "discount",
          "ticket"
        ]
      },
      {
        "titleEn": "Confirm entry and re-entry rules",
        "titleZh": "確認入場或再次入場規則",
        "keywords": [
          "re-entry",
          "enter",
          "leave",
          "same ticket",
          "valid"
        ]
      }
    ]
  },
  {
    "id": "tickets_u2_l3",
    "trackId": "tickets",
    "unitId": "tickets_u2",
    "titleEn": "Sold Out, Waitlist & Entry Problems",
    "titleZh": "售罄、候補與入場問題處理",
    "descEn": "Handle a sold-out event, wrong date, missing QR code, or invalid ticket calmly.",
    "descZh": "面對售罄、日期買錯、QR code 不見或票券無法掃描時，清楚向工作人員求助。",
    "scene": "travel",
    "rolePrompt": "You are an event guest-services agent. Help with sold-out shows, waitlists, ticket-date mistakes, and QR-code entry problems.",
    "missions": [
      {
        "titleEn": "Clearly explain a sold-out or ticketing problem",
        "titleZh": "清楚描述售罄或票券問題",
        "keywords": [
          "sold out",
          "wrong date",
          "QR code",
          "scan",
          "ticket"
        ]
      },
      {
        "titleEn": "Ask about waitlists, rescheduling, or another show",
        "titleZh": "詢問候補、改期或替代場次",
        "keywords": [
          "waitlist",
          "switch",
          "tomorrow",
          "another show",
          "available"
        ]
      },
      {
        "titleEn": "Provide booking details and ask staff to check",
        "titleZh": "提供訂位資訊並請工作人員協助查詢",
        "keywords": [
          "booking",
          "name",
          "email",
          "reference",
          "check"
        ]
      }
    ]
  },
  {
    "id": "services_u1_l1",
    "trackId": "services",
    "unitId": "services_u1",
    "titleEn": "SIM Card, Data Plan & Mobile Service",
    "titleZh": "SIM 卡、網路方案與電信門號",
    "descEn": "Ask about prepaid plans, data limits, hotspot use and activation.",
    "descZh": "詢問預付卡、流量上限、熱點分享與啟用方式。",
    "scene": "daily",
    "rolePrompt": "You are a mobile-store staff member. Compare prepaid plans, explain data limits, and help activate a SIM card.",
    "missions": [
      {
        "titleEn": "Explain how many days and how much mobile data you need",
        "titleZh": "說明使用天數與流量需求",
        "keywords": [
          "SIM",
          "data",
          "weeks",
          "prepaid",
          "GB"
        ]
      },
      {
        "titleEn": "Ask whether hotspot or calls are included",
        "titleZh": "詢問熱點或通話是否包含",
        "keywords": [
          "hotspot",
          "calls",
          "include",
          "plan",
          "text"
        ]
      },
      {
        "titleEn": "Confirm the price and activation process",
        "titleZh": "確認價格與啟用方式",
        "keywords": [
          "price",
          "activate",
          "immediately",
          "setup",
          "pay"
        ]
      }
    ]
  },
  {
    "id": "services_u1_l2",
    "trackId": "services",
    "unitId": "services_u1",
    "titleEn": "Parcel Pickup & Delivery Problems",
    "titleZh": "包裹領取與配送問題",
    "descEn": "Collect a parcel, provide ID or tracking details, and report a missing delivery.",
    "descZh": "領取包裹、提供證件與追蹤碼，或向客服反映包裹未送達。",
    "scene": "daily",
    "rolePrompt": "You are a parcel-service employee. Verify the tracking number and identity, then help resolve a delivery problem.",
    "missions": [
      {
        "titleEn": "Give your tracking number or pickup details",
        "titleZh": "提供追蹤碼或領件資訊",
        "keywords": [
          "tracking",
          "package",
          "pick up",
          "parcel",
          "number"
        ]
      },
      {
        "titleEn": "Describe the delivery status or problem",
        "titleZh": "描述配送狀態或問題",
        "keywords": [
          "delivered",
          "missing",
          "received",
          "address",
          "problem"
        ]
      },
      {
        "titleEn": "Ask what to do next",
        "titleZh": "詢問下一步處理方式",
        "keywords": [
          "what should",
          "check",
          "contact",
          "investigate",
          "next"
        ]
      }
    ]
  },
  {
    "id": "services_u1_l3",
    "trackId": "services",
    "unitId": "services_u1",
    "titleEn": "Bank, ATM & Currency Exchange",
    "titleZh": "銀行、ATM 與換匯",
    "descEn": "Exchange cash, ask about fees, and solve a card or ATM problem.",
    "descZh": "辦理換匯、詢問手續費，並處理提款或信用卡無法使用的狀況。",
    "scene": "daily",
    "rolePrompt": "You are a bank-service representative. Help with currency exchange, fees, ATM withdrawal issues, or a temporarily blocked card.",
    "missions": [
      {
        "titleEn": "State the currency and amount you want to exchange",
        "titleZh": "說明要兌換的幣別與金額",
        "keywords": [
          "exchange",
          "dollars",
          "pounds",
          "euros",
          "amount"
        ]
      },
      {
        "titleEn": "Ask about the exchange rate or service fees",
        "titleZh": "詢問匯率或手續費",
        "keywords": [
          "rate",
          "fee",
          "commission",
          "charge",
          "today"
        ]
      },
      {
        "titleEn": "Describe an ATM or card problem and ask for help",
        "titleZh": "描述 ATM 或卡片問題並求助",
        "keywords": [
          "ATM",
          "declined",
          "card",
          "withdraw",
          "blocked"
        ]
      }
    ]
  },
  {
    "id": "services_u2_l1",
    "trackId": "services",
    "unitId": "services_u2",
    "titleEn": "Booking or Changing an Appointment",
    "titleZh": "預約與更改時間",
    "descEn": "Book a service appointment, choose a time, and reschedule politely.",
    "descZh": "預約服務時間、確認日期，並在臨時有事時禮貌改期。",
    "scene": "daily",
    "rolePrompt": "You are a receptionist taking appointments. Offer available times, confirm the service, and help reschedule if needed.",
    "missions": [
      {
        "titleEn": "State the service and date you want to book",
        "titleZh": "說明想預約的服務與日期",
        "keywords": [
          "appointment",
          "book",
          "Friday",
          "service",
          "available"
        ]
      },
      {
        "titleEn": "Confirm a specific appointment time",
        "titleZh": "確認具體時間",
        "keywords": [
          "morning",
          "afternoon",
          "time",
          "works",
          "available"
        ]
      },
      {
        "titleEn": "Practice cancelling or rescheduling an appointment",
        "titleZh": "練習取消或改期",
        "keywords": [
          "reschedule",
          "move",
          "cancel",
          "Saturday",
          "change"
        ]
      }
    ]
  },
  {
    "id": "services_u2_l2",
    "trackId": "services",
    "unitId": "services_u2",
    "titleEn": "Phone or Laptop Repair Shop",
    "titleZh": "手機或筆電送修",
    "descEn": "Describe a device problem, ask for diagnosis time, cost, and warranty.",
    "descZh": "描述手機或筆電故障狀況，詢問檢測時間、維修價格與保固。",
    "scene": "daily",
    "rolePrompt": "You are a repair technician. Ask about symptoms, when the issue started, and explain diagnosis, cost and warranty options.",
    "missions": [
      {
        "titleEn": "Clearly describe the device malfunction",
        "titleZh": "清楚描述裝置的故障症狀",
        "keywords": [
          "phone",
          "laptop",
          "charging",
          "screen",
          "battery",
          "broken"
        ]
      },
      {
        "titleEn": "Ask how long diagnosis or repair will take",
        "titleZh": "詢問檢測或維修需要多久",
        "keywords": [
          "how long",
          "diagnosis",
          "repair",
          "days",
          "ready"
        ]
      },
      {
        "titleEn": "Ask for a price estimate or warranty details",
        "titleZh": "詢問估價或保固",
        "keywords": [
          "estimate",
          "cost",
          "warranty",
          "price",
          "covered"
        ]
      }
    ]
  },
  {
    "id": "services_u2_l3",
    "trackId": "services",
    "unitId": "services_u2",
    "titleEn": "Customer Service Complaint & Resolution",
    "titleZh": "客服申訴與問題解決",
    "descEn": "Explain a service failure calmly, state what outcome you want, and negotiate a resolution.",
    "descZh": "冷靜描述服務問題、提出希望的處理方式，並與客服協商退款或替代方案。",
    "scene": "daily",
    "rolePrompt": "You are a customer-service agent. Listen to the complaint, ask clarifying questions, and offer realistic solutions such as refund, replacement, or credit.",
    "missions": [
      {
        "titleEn": "Calmly describe the customer service problem",
        "titleZh": "冷靜描述發生的客服問題",
        "keywords": [
          "charged",
          "wrong",
          "problem",
          "order",
          "service",
          "issue"
        ]
      },
      {
        "titleEn": "Clearly state your preferred solution",
        "titleZh": "明確說出希望的解決方式",
        "keywords": [
          "refund",
          "replacement",
          "credit",
          "want",
          "would like"
        ]
      },
      {
        "titleEn": "Offer an alternative if the first option is unavailable",
        "titleZh": "在第一方案不可行時提出替代方案",
        "keywords": [
          "if",
          "instead",
          "alternative",
          "could you",
          "possible"
        ]
      }
    ]
  }
];

export const COURSE_WARMUPS:Record<string,CourseWarmupPhrase[]>={
  "travel_u1_l1": [
    {
      "en": "I'd like an iced latte with oat milk, please.",
      "zh": "請給我一杯冰拿鐵，換燕麥奶。",
      "ipa": "/aɪd laɪk ən aɪst ˈlɑːteɪ wɪð oʊt mɪlk pliːz/",
      "note": "點餐必備句"
    },
    {
      "en": "Could I get that with less ice and half sugar?",
      "zh": "可以幫我做少冰、半糖嗎？",
      "ipa": "/kʊd aɪ ɡɛt ðæt wɪð lɛs aɪs ænd hæf ˈʃʊɡər/",
      "note": "客製甜度冰塊"
    },
    {
      "en": "Can I pay with Apple Pay or credit card?",
      "zh": "可以用 Apple Pay 或信用卡結帳嗎？",
      "ipa": "/kæn aɪ peɪ wɪð ˈæp.əl peɪ / ˈkrɛdɪt kɑːrd/",
      "note": "結帳付款方式"
    }
  ],
  "travel_u1_l2": [
    {
      "en": "What do you recommend for the main course?",
      "zh": "主菜你們有什麼推薦的嗎？",
      "ipa": "/wʌt du juː ˌrɛkəˈmɛnd fɔːr ðə meɪn kɔːrs/",
      "note": "詢問推薦"
    },
    {
      "en": "I'll have the ribeye steak, medium-rare, please.",
      "zh": "我要一份肋眼牛排，五分熟，謝謝。",
      "ipa": "/aɪl hæv ðə ˈrɪb.aɪ steɪk, ˈmiːdiəm rɛər, pliːz/",
      "note": "熟度表達"
    }
  ],
  "travel_u1_l3": [
    {
      "en": "Excuse me, I think this isn't what I ordered.",
      "zh": "不好意思，這好像不是我點的餐點。",
      "ipa": "/ɪkˈskjuːz miː, aɪ θɪŋk ðɪs ˈɪznt wʌt aɪ ˈɔːrdərd/",
      "note": "禮貌反映錯誤"
    },
    {
      "en": "Could we get the bill and split it separately?",
      "zh": "可以幫我們結帳並分開付嗎？",
      "ipa": "/kʊd wiː ɡɛt ðə bɪl ænd splɪt ɪt ˈsɛpəreɪtli/",
      "note": "分開付 / AA制"
    }
  ],
  "travel_u2_l1": [
    {
      "en": "Could I have a window seat, please?",
      "zh": "可以給我一個靠窗的座位嗎？",
      "ipa": "/kʊd aɪ hæv ə ˈwɪndoʊ siːt pliːz/",
      "note": "靠窗座位要求"
    },
    {
      "en": "I have one piece of check-in luggage and one carry-on.",
      "zh": "我有一件托運行李和一件隨身行李。",
      "ipa": "/aɪ hæv wʌn piːs ʌv ˈtʃɛk.ɪn ˈlʌɡɪdʒ/",
      "note": "行李數量說明"
    }
  ],
  "travel_u2_l2": [
    {
      "en": "I'm here on vacation for 7 days.",
      "zh": "我是來觀光度假的，預計停留 7 天。",
      "ipa": "/aɪm hɪər ɒn veɪˈkeɪʃən fɔːr ˈsɛvən deɪz/",
      "note": "入境旅遊目的"
    },
    {
      "en": "I'll be staying at the Hilton Hotel downtown.",
      "zh": "我會住在市區的希爾頓飯店。",
      "ipa": "/aɪl biː ˈsteɪɪŋ æt ðə ˈhɪltən hoʊˈtɛl/",
      "note": "住宿地點交代"
    }
  ],
  "travel_u2_l3": [
    {
      "en": "Excuse me, how do I get to the nearest subway station?",
      "zh": "不好意思，請問最近的地鐵站怎麼走？",
      "ipa": "/ɪkˈskjuːz miː, haʊ duː aɪ ɡɛt tuː ðə ˈnɪərɪst ˈsʌbweɪ ˈsteɪʃən/",
      "note": "問路經典句"
    },
    {
      "en": "Is it within walking distance from here?",
      "zh": "從這裡走路能到嗎？",
      "ipa": "/ɪz ɪt wɪˈðɪn ˈwɔːkɪŋ ˈdɪstəns frʌm hɪər/",
      "note": "確認步行距離"
    }
  ],
  "travel_u2_l4": [
    {
      "en": "My checked suitcase didn't come out on carousel 4.",
      "zh": "我的托運行李沒有在 4 號轉盤出來。",
      "ipa": "/maɪ tʃɛkt ˈsuːt.keɪs ˈdɪdnt kʌm aʊt ɒn ˌkær.əˈsɛl/",
      "note": "行李遺失說明"
    },
    {
      "en": "It's a black hard-shell suitcase with a red tag.",
      "zh": "那是一個黑色硬殼行李箱，上面有紅色行李吊牌。",
      "ipa": "/ɪts ə blæk hɑːrd.ʃɛl ˈsuːt.keɪs wɪð ə rɛd tæɡ/",
      "note": "行李外觀描述"
    }
  ],
  "travel_u3_l1": [
    {
      "en": "Hi, I have a reservation under the name John Smith.",
      "zh": "嗨，我有一筆訂房，登記的名字是 John Smith。",
      "ipa": "/haɪ, aɪ hæv ə ˌrɛzərˈveɪʃən ˈʌndər ðə neɪm dʒɒn smɪθ/",
      "note": "入住開場句"
    },
    {
      "en": "If possible, could we get a quiet room on a higher floor?",
      "zh": "如果可以的話，能給我們高樓層安靜一點的房間嗎？",
      "ipa": "/ɪf ˈpɒsəbl, kʊd wiː ɡɛt ə ˈkwaɪət ruːm/",
      "note": "客房特殊要求"
    }
  ],
  "travel_u3_l2": [
    {
      "en": "The air conditioning in room 402 isn't working.",
      "zh": "402 號房的冷氣完全不運轉。",
      "ipa": "/ðiː ɛər kənˈdɪʃənɪŋ ɪn ruːm fɔːr oʊ tuː ˈɪznt ˈwɜːrkɪŋ/",
      "note": "設備故障描述"
    },
    {
      "en": "Could you send someone up or switch us to another room?",
      "zh": "可以派人上來檢查，或是幫我們換房間嗎？",
      "ipa": "/kʊd juː sɛnd ˈsʌmwʌn ʌp ɔːr swɪtʃ ʌs tuː əˈnʌðər ruːm/",
      "note": "要求換房"
    }
  ],
  "travel_u3_l3": [
    {
      "en": "We'd like to check out of room 508, please.",
      "zh": "我們要辦理 508 號房退房。",
      "ipa": "/wiːd laɪk tuː tʃɛk aʊt ʌv ruːm faɪv oʊ eɪt/",
      "note": "退房開場句"
    },
    {
      "en": "Could we leave our bags here until 4 PM?",
      "zh": "我們可以把行李暫存在這裡直到下午 4 點嗎？",
      "ipa": "/kʊd wiː liːv ˈaʊər bæɡz hɪər ʌnˈtɪl fɔːr piː.ɛm/",
      "note": "行李寄存實用句"
    }
  ],
  "travel_u4_l1": [
    {
      "en": "Could I try this jacket on? Where are the fitting rooms?",
      "zh": "我可以試穿這件外套嗎？請問試衣間在哪裡？",
      "ipa": "/kʊd aɪ traɪ ðɪs ˈdʒækɪt ɒn/",
      "note": "試穿必備句"
    },
    {
      "en": "It's a bit tight; do you have this in a medium or large?",
      "zh": "這件有點緊，請問有 M 號或 L 號嗎？",
      "ipa": "/ɪts ə bɪt taɪt, du juː hæv ðɪs ɪn ə ˈmiːdiəm/",
      "note": "換尺寸表達"
    }
  ],
  "travel_u4_l2": [
    {
      "en": "Where can I apply for the VAT tax refund?",
      "zh": "請問在哪裡可以辦理退稅手續？",
      "ipa": "/wɛər kæn aɪ əˈplaɪ fɔːr ðə væt tæks ˈriːfʌnd/",
      "note": "詢問退稅處"
    },
    {
      "en": "Here are my receipts and passport. I'd prefer refund to my card.",
      "zh": "這是我的發票和護照，我希望退稅退回信用卡。",
      "ipa": "/hɪər ɑːr maɪ rɪˈsiːts ænd ˈpɑːspɔːrt/",
      "note": "出示單據與選擇退稅方式"
    }
  ],
  "travel_u4_l3": [
    {
      "en": "I have a sore throat and a bad headache.",
      "zh": "我喉嚨很痛，而且頭痛得很厲害。",
      "ipa": "/aɪ hæv ə sɔːr θroʊt ænd ə bæd ˈhɛdeɪk/",
      "note": "描述症狀"
    },
    {
      "en": "How many times a day should I take this medication?",
      "zh": "這個藥一天需要吃幾次？",
      "ipa": "/haʊ ˈmɛni taɪmz ə deɪ ʃʊd aɪ teɪk ðɪs ˌmɛdɪˈkeɪʃən/",
      "note": "詢問用藥劑量"
    }
  ],
  "biz_u1_l1": [
    {
      "en": "Good morning everyone, thrilled to join the team as the tech lead.",
      "zh": "大家早安，很高興以技術主管的身份加入團隊。",
      "ipa": "/ɡʊd ˈmɔːrnɪŋ ˈɛvrɪwʌn, θrɪld tuː dʒɔɪn ðə tiːm/",
      "note": "自我介紹開場"
    },
    {
      "en": "I'll be focusing on optimizing our mobile backend infrastructure.",
      "zh": "我接下來會主要負責優化我們的手機後端基礎設施。",
      "ipa": "/aɪl biː ˈfoʊkəsɪŋ ɒn ˈɒptɪmaɪzɪŋ .../",
      "note": "說明專案職責"
    }
  ],
  "biz_u1_l2": [
    {
      "en": "We've completed the API migration; currently we're testing checkout.",
      "zh": "我們已經完成了 API 遷移，目前正在測試結帳流程。",
      "ipa": "/wiːv kəmˈpliːtɪd ðiː ˌeɪ.piːˈaɪ maɪˈɡreɪʃən/",
      "note": "進度匯報句型"
    },
    {
      "en": "We're blocked by the third-party auth service and need a quick sync.",
      "zh": "我們目前卡在第三方驗證服務，需要快速同步對齊一下。",
      "ipa": "/wɪər blɒkt baɪ ðə θɜːrd ˈpɑːrti ˌɔːθ ˈsɜːrvɪs/",
      "note": "提出阻礙 (Blockers)"
    }
  ],
  "biz_u1_l3": [
    {
      "en": "I see your point, but I have some concerns regarding the timeline.",
      "zh": "我理解您的考量，但我對時程表有些疑慮。",
      "ipa": "/aɪ siː jʊər pɔɪnt, bʌt aɪ hæv sʌm kənˈsɜːrnz/",
      "note": "委婉表達疑慮"
    },
    {
      "en": "What if we phase the rollout into two releases instead?",
      "zh": "如果我們把發布拆成兩個階段分批上線，您覺得如何？",
      "ipa": "/wʌt ɪf wiː feɪz ðə ˈroʊl.aʊt ˈɪntuː tuː rɪˈliːsɪz/",
      "note": "提出折衷方案"
    }
  ],
  "biz_u2_l1": [
    {
      "en": "Hi, what brought you to the conference this year?",
      "zh": "嗨！今年是什麼主題吸引您來參加這場研討會？",
      "ipa": "/haɪ, wʌt brɔːt juː tuː ðə ˈkɒnfərəns/",
      "note": "展會破冰句"
    },
    {
      "en": "Here's my card, let's definitely connect on LinkedIn.",
      "zh": "這是我的名片，我們一定要在 LinkedIn 上保持聯繫！",
      "ipa": "/hɪərz maɪ kɑːrd, lɛts ˈdɛfɪnɪtli kəˈnɛkt/",
      "note": "交換聯繫方式"
    }
  ],
  "biz_u2_l2": [
    {
      "en": "Welcome to our office! How was your flight into Taipei?",
      "zh": "歡迎來到我們辦公室！飛往台北的航班還順利嗎？",
      "ipa": "/ˈwɛlkəm tuː ˈaʊər ˈɒfɪs! haʊ wʌz jʊər flaɪt/",
      "note": "接待寒暄開場"
    },
    {
      "en": "Can I get you some water, coffee, or hot tea?",
      "zh": "需要為您準備水、咖啡還是熱茶嗎？",
      "ipa": "/kæn aɪ ɡɛt juː sʌm ˈwɔːtər ˈkɒfi ɔːr hɒt tiː/",
      "note": "招待飲品"
    }
  ],
  "biz_u2_l3": [
    {
      "en": "I'd like to propose a toast to our successful partnership!",
      "zh": "我想提議舉杯，祝我們的合作圓滿成功！",
      "ipa": "/aɪd laɪk tuː prəˈpoʊz ə toʊst tuː ˈaʊər səkˈsɛsfʊl ˈpɑːrtnərʃɪp/",
      "note": "商務祝酒"
    },
    {
      "en": "Have you had a chance to try our local beef noodles yet?",
      "zh": "您有機會品嚐過我們在地的牛肉麵了嗎？",
      "ipa": "/hæv juː hæd ə tʃæns tuː traɪ ˈaʊər ˈloʊkəl biːf ˈnuːdlz/",
      "note": "在地美食話題"
    }
  ],
  "biz_u3_l1": [
    {
      "en": "Over the past 5 years, I've specialized in scaling cloud systems.",
      "zh": "在過去 5 年中，我專注於大規模雲端架構的擴展。",
      "ipa": "/ˈoʊvər ðə pæst faɪv jɪərz, aɪv ˈspɛʃəlaɪzd ɪn.../",
      "note": "經驗亮點概括"
    },
    {
      "en": "What excites me about this role is your team's focus on AI innovation.",
      "zh": "這份職位最吸引我的是貴團隊對 AI 創新的專注投入。",
      "ipa": "/wʌt ɪkˈsaɪts miː əˈbaʊt ðɪs roʊl ɪz.../",
      "note": "表達應徵動機"
    }
  ],
  "biz_u3_l2": [
    {
      "en": "When our database had a major outage, I stepped in to lead the triage.",
      "zh": "當資料庫發生重大故障時，我主動介入帶領團隊進行排查。",
      "ipa": "/wɛn ˈaʊər ˈdeɪtəbeɪs hæd ə ˈmeɪdʒər ˈaʊtɪdʒ/",
      "note": "Situation 交代背景"
    },
    {
      "en": "As a result, we restored service within 30 minutes with zero data loss.",
      "zh": "最終，我們在 30 分鐘內恢復服務且零資料遺失。",
      "ipa": "/æz ə rɪˈzʌlt, wiː rɪˈstɔːrd ˈsɜːrvɪs/",
      "note": "Result 成果收尾"
    }
  ],
  "biz_u3_l3": [
    {
      "en": "Based on my track record and market rate, I was targeting around $120k.",
      "zh": "根據我的過往戰績與市場行情，我的目標薪資約為 12 萬美元。",
      "ipa": "/beɪst ɒn maɪ træk ˈrɛk.ɔːrd.../",
      "note": "提出期望薪資"
    },
    {
      "en": "Is there any flexibility around stock options or remote work days?",
      "zh": "在股票期權或遠端工作天數方面有協商彈性嗎？",
      "ipa": "/ɪz ðɛər ˈɛni ˌflɛksəˈbɪlɪti əˈraʊnd.../",
      "note": "詢問福利彈性"
    }
  ],
  "daily_u1_l1": [
    {
      "en": "I went hiking in the mountains; the weather was phenomenal!",
      "zh": "我去了山裡爬山，天氣超級棒！",
      "ipa": "/aɪ wɛnt ˈhaɪkɪŋ ɪn ðə ˈmaʊntɪnz/",
      "note": "分享週末行程"
    },
    {
      "en": "What did you get up to over the weekend?",
      "zh": "你週末都做了些什麼好玩的？",
      "ipa": "/wʌt dɪd juː ɡɛt ʌp tuː ˈoʊvər ðə ˈwiːk.ɛnd/",
      "note": "反問對方"
    }
  ],
  "daily_u1_l2": [
    {
      "en": "Have you checked out that new Italian bistro downtown?",
      "zh": "你有去過市區那家新開的義大利小餐館了嗎？",
      "ipa": "/hæv juː tʃɛkt aʊt ðæt njuː ɪˈtæliən ˈbiːstroʊ/",
      "note": "美食推薦問句"
    },
    {
      "en": "I'm totally hooked on this sci-fi thriller series on Netflix!",
      "zh": "我最近完全沉迷在 Netflix 上的一部科幻懸疑影集！",
      "ipa": "/aɪm ˈtoʊtəli hʊkt ɒn ðɪs ˈsaɪ.faɪ ˈθrɪlər/",
      "note": "推薦追劇"
    }
  ],
  "daily_u1_l3": [
    {
      "en": "I'd love to, but I've already committed to a family dinner.",
      "zh": "我很想去，但我那天已經答應跟家人吃晚餐了。",
      "ipa": "/aɪd lʌv tuː, bʌt aɪv ɔːlˈrɛdi kəˈmɪtɪd tuː.../",
      "note": "委婉拒絕第一步"
    },
    {
      "en": "Can I take a rain check and make it up to you next Friday?",
      "zh": "我能先欠你一次、改約下週五補請你嗎？",
      "ipa": "/kæn aɪ teɪk ə reɪn tʃɛk.../",
      "note": "改期必備：Take a rain check"
    }
  ],
  "daily_u2_l1": [
    {
      "en": "My golden retriever always greets me at the door with his favorite toy.",
      "zh": "我的黃金獵犬每次都在門口咬著他最愛的玩具迎接我。",
      "ipa": "/maɪ ˈɡoʊldən rɪˈtriːvər.../",
      "note": "描述寵物行為"
    },
    {
      "en": "Are you more of a dog person or a cat person?",
      "zh": "你比較是愛狗派還是愛貓派？",
      "ipa": "/ɑːr juː mɔːr ʌv ə dɒɡ ˈpɜːrsən ɔːr ə kæt ˈpɜːrsən/",
      "note": "社交經典破冰問句"
    }
  ],
  "daily_u2_l2": [
    {
      "en": "The most memorable part of Japan was stumbling upon a hidden onsen in Kyoto.",
      "zh": "日本最讓我難忘的是在京都意外走進一家隱秘溫泉。",
      "ipa": "/ðə moʊst ˈmɛmərəbl pɑːrt.../",
      "note": "旅遊記憶點"
    },
    {
      "en": "The local hospitality truly blew me away.",
      "zh": "當地居民的熱情好客真的讓我無比感動。",
      "ipa": "/ðə ˈloʊkəl ˌhɒspɪˈtælɪti ˈtruːli bluː miː əˈweɪ/",
      "note": "表達文化震撼"
    }
  ],
  "daily_u2_l3": [
    {
      "en": "I try to turn off work notifications after 7 PM to set clear boundaries.",
      "zh": "我試著在晚上 7 點後關閉工作通知，建立清楚的生活邊界。",
      "ipa": "/aɪ traɪ tuː tɜːrn ɒf.../",
      "note": "建立生活邊界"
    },
    {
      "en": "Meditation and weightlifting help me clear my head after a long day.",
      "zh": "冥想和重訓能幫我在忙碌一天後徹底放空思緒。",
      "ipa": "/ˌmɛdɪˈteɪʃən ænd ˈweɪtˌlɪftɪŋ hɛlp miː.../",
      "note": "放鬆習慣說明"
    }
  ],
  "daily_u3_l1": [
    {
      "en": "I use AI daily to brainstorm ideas and refine my English writing.",
      "zh": "我每天都用 AI 來腦力激盪點子和潤飾英文寫作。",
      "ipa": "/aɪ juːz eɪ.aɪ ˈdeɪli tuː.../",
      "note": "AI 使用場景"
    },
    {
      "en": "Do you think AI will replace routine tasks or augment human creativity?",
      "zh": "你認為 AI 會取代常規工作，還是增強人類的創造力？",
      "ipa": "/du juː θɪŋk eɪ.aɪ wɪl rɪˈpleɪs.../",
      "note": "探討未來趨勢"
    }
  ],
  "daily_u3_l2": [
    {
      "en": "The energy of the crowd at the Coldplay concert was electrifying!",
      "zh": "Coldplay 演唱會全場觀眾的熱情能量真的令人無比震撼！",
      "ipa": "/ðiː ˈɛnərdʒi ʌv ðə kraʊd wʌz ɪˈlɛktrɪfaɪ.ɪŋ/",
      "note": "描述演唱會現場"
    },
    {
      "en": "Their live performance gave me absolute goosebumps.",
      "zh": "他們的現場演出真的讓我全身起雞皮疙瘩。",
      "ipa": "/ðɛər laɪv pərˈfɔːrməns ɡeɪv miː ˈæbsəluːt ˈɡuːsbʌmps/",
      "note": "讚嘆現場感染力"
    }
  ],
  "daily_u3_l3": [
    {
      "en": "I hit the gym 4 times a week, focusing on strength training.",
      "zh": "我每週去健身房 4 次，主要以肌力重訓為主。",
      "ipa": "/aɪ hɪt ðə dʒɪm fɔːr taɪmz ə wiːk.../",
      "note": "分享健身習慣"
    },
    {
      "en": "Consistency is key; I prioritize getting enough protein and sleep.",
      "zh": "堅持是關鍵，我最看重攝取足夠的蛋白質與優質睡眠。",
      "ipa": "/kənˈsɪstənsi ɪz kiː; aɪ praɪˈɔːrətaɪz.../",
      "note": "健康飲食生活觀"
    }
  ],
  "teamwork_u1_l1": [
    {
      "en": "Yesterday I finished the login flow, and today I'm working on error handling.",
      "zh": "昨天我完成登入流程，今天會處理錯誤狀態。",
      "ipa": "",
      "note": "站會進度句"
    },
    {
      "en": "I'm blocked by an API issue, so I may need help from the backend team.",
      "zh": "我被 API 問題卡住了，可能需要後端團隊協助。",
      "ipa": "",
      "note": "說明 blocker"
    }
  ],
  "teamwork_u1_l2": [
    {
      "en": "I'm stuck on this state update. Could you take a quick look with me?",
      "zh": "我卡在這個 state update，可以跟我一起快速看一下嗎？",
      "ipa": "",
      "note": "具體求助"
    },
    {
      "en": "I've tried clearing the cache and reproducing it locally, but the issue is still there.",
      "zh": "我已經試過清快取和本機重現，但問題還在。",
      "ipa": "",
      "note": "說明已嘗試方法"
    }
  ],
  "teamwork_u1_l3": [
    {
      "en": "I chose this approach because it keeps the component API simple.",
      "zh": "我選這個做法是因為它能讓 component API 保持簡單。",
      "ipa": "",
      "note": "說明設計理由"
    },
    {
      "en": "That's a good point. I'll update this part and add a test for the edge case.",
      "zh": "這個點很好，我會修改這部分並補上 edge case 測試。",
      "ipa": "",
      "note": "接受 review 意見"
    }
  ],
  "teamwork_u2_l1": [
    {
      "en": "One option is to ship a simpler version first and iterate after launch.",
      "zh": "其中一個方案是先上簡化版，上市後再迭代。",
      "ipa": "",
      "note": "提出方案"
    },
    {
      "en": "The downside is less flexibility, but we'd reduce implementation risk.",
      "zh": "缺點是彈性較低，但可以降低實作風險。",
      "ipa": "",
      "note": "描述取捨"
    }
  ],
  "teamwork_u2_l2": [
    {
      "en": "I understand the goal, but I'm not sure this approach will scale well.",
      "zh": "我理解目標，但我不確定這個做法能不能良好擴展。",
      "ipa": "",
      "note": "禮貌不同意"
    },
    {
      "en": "Could we try a smaller rollout first and review the data next week?",
      "zh": "我們可以先小規模上線，下週再看數據嗎？",
      "ipa": "",
      "note": "提出折衷"
    }
  ],
  "teamwork_u2_l3": [
    {
      "en": "What went well was that we communicated risks early.",
      "zh": "做得好的地方是我們很早就把風險說清楚。",
      "ipa": "",
      "note": "正向復盤"
    },
    {
      "en": "Next time, I think we should align on requirements before implementation starts.",
      "zh": "下次我覺得應該在開始實作前先把需求對齊。",
      "ipa": "",
      "note": "提出改善"
    }
  ],
  "tickets_u1_l1": [
    {
      "en": "I'd like a one-way ticket to Oxford for the 10:30 train, please.",
      "zh": "我想買一張 10:30 去 Oxford 的單程票。",
      "ipa": "",
      "note": "購買指定班次"
    },
    {
      "en": "Is there a window seat available, and which platform does it leave from?",
      "zh": "有靠窗座位嗎？另外是從哪個月台出發？",
      "ipa": "",
      "note": "選位與月台"
    }
  ],
  "tickets_u1_l2": [
    {
      "en": "Would a day pass be cheaper if I'm taking several buses today?",
      "zh": "如果我今天會搭好幾次巴士，一日票會比較便宜嗎？",
      "ipa": "",
      "note": "比較票種"
    },
    {
      "en": "Does this ticket include the ferry, or do I need a separate one?",
      "zh": "這張票有包含渡輪嗎？還是需要另外買？",
      "ipa": "",
      "note": "確認涵蓋範圍"
    }
  ],
  "tickets_u1_l3": [
    {
      "en": "I missed my train because my previous connection was delayed.",
      "zh": "我因為前一班車延誤，所以錯過了火車。",
      "ipa": "",
      "note": "說明原因"
    },
    {
      "en": "Can I change this ticket to the next departure, and is there a fee?",
      "zh": "我可以改到下一班嗎？需要補手續費嗎？",
      "ipa": "",
      "note": "詢問改票"
    }
  ],
  "tickets_u2_l1": [
    {
      "en": "Do you have two tickets for the 7:30 show tonight?",
      "zh": "今晚 7:30 的場次還有兩張票嗎？",
      "ipa": "",
      "note": "詢問場次與張數"
    },
    {
      "en": "We'd prefer seats near the center, not too close to the stage.",
      "zh": "我們想坐中間一點，不要離舞台太近。",
      "ipa": "",
      "note": "座位偏好"
    }
  ],
  "tickets_u2_l2": [
    {
      "en": "Do we need to book a time slot in advance, or can we enter anytime?",
      "zh": "我們需要先預約入場時段，還是隨時都能進去？",
      "ipa": "",
      "note": "確認時段"
    },
    {
      "en": "Do you offer a family ticket or a discount for children?",
      "zh": "你們有家庭票或兒童優惠嗎？",
      "ipa": "",
      "note": "詢問優惠票"
    }
  ],
  "tickets_u2_l3": [
    {
      "en": "I accidentally booked the wrong date. Is it possible to switch to tomorrow?",
      "zh": "我不小心買錯日期了，可以改到明天嗎？",
      "ipa": "",
      "note": "日期買錯"
    },
    {
      "en": "My QR code won't scan. Could you check the booking with my name or email?",
      "zh": "我的 QR code 掃不過，可以用姓名或 Email 查訂單嗎？",
      "ipa": "",
      "note": "入場問題"
    }
  ],
  "services_u1_l1": [
    {
      "en": "I need a prepaid SIM with enough data for two weeks.",
      "zh": "我需要一張可以用兩週、流量足夠的預付 SIM 卡。",
      "ipa": "",
      "note": "說明需求"
    },
    {
      "en": "Can I use hotspot with this plan, and does it activate immediately?",
      "zh": "這個方案可以開熱點嗎？會馬上啟用嗎？",
      "ipa": "",
      "note": "確認功能"
    }
  ],
  "services_u1_l2": [
    {
      "en": "I'm here to pick up a package. Here's the tracking number.",
      "zh": "我是來領包裹的，這是追蹤號碼。",
      "ipa": "",
      "note": "領件開場"
    },
    {
      "en": "The tracking says delivered, but I haven't received anything.",
      "zh": "追蹤顯示已送達，但我完全沒收到。",
      "ipa": "",
      "note": "反映未收到"
    }
  ],
  "services_u1_l3": [
    {
      "en": "I'd like to exchange 500 US dollars into pounds. What's today's rate?",
      "zh": "我想把 500 美元換成英鎊，今天匯率是多少？",
      "ipa": "",
      "note": "換匯需求"
    },
    {
      "en": "The ATM declined my card. Could you help me check what happened?",
      "zh": "ATM 拒絕我的卡，可以幫我看看發生什麼事嗎？",
      "ipa": "",
      "note": "提款問題"
    }
  ],
  "services_u2_l1": [
    {
      "en": "I'd like to make an appointment for Friday afternoon if possible.",
      "zh": "如果可以，我想預約星期五下午。",
      "ipa": "",
      "note": "預約時間"
    },
    {
      "en": "Something came up. Could I move my appointment to Saturday morning?",
      "zh": "我臨時有事，可以把預約改到星期六早上嗎？",
      "ipa": "",
      "note": "改期"
    }
  ],
  "services_u2_l2": [
    {
      "en": "My phone suddenly stopped charging unless I hold the cable at an angle.",
      "zh": "我的手機突然充不了電，除非把線斜著壓住。",
      "ipa": "",
      "note": "描述故障"
    },
    {
      "en": "How long will the diagnosis take, and can you give me an estimate first?",
      "zh": "檢測大概要多久？可以先給我估價嗎？",
      "ipa": "",
      "note": "詢問時間與費用"
    }
  ],
  "services_u2_l3": [
    {
      "en": "I was charged twice for the same order, and I'd like the duplicate charge refunded.",
      "zh": "同一筆訂單被扣款兩次，我希望退回重複扣款。",
      "ipa": "",
      "note": "清楚申訴"
    },
    {
      "en": "If a refund isn't possible today, could you issue a replacement or store credit?",
      "zh": "如果今天沒辦法退款，可以提供換貨或購物金嗎？",
      "ipa": "",
      "note": "協商替代方案"
    }
  ]
};
