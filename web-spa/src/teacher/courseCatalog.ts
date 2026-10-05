import type{CourseLesson,CourseTrack,CourseUnit}from"./courseTypes";
import{TRAVEL_COURSE_LESSONS}from"./courseCatalogTravel";
import{BUSINESS_COURSE_LESSONS}from"./courseCatalogBusiness";
import{DAILY_COURSE_LESSONS}from"./courseCatalogDaily";
export type{CourseLesson,CourseTrack,CourseUnit,CourseMission}from"./courseTypes";

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
export const COURSE_LESSONS:CourseLesson[]=[...TRAVEL_COURSE_LESSONS,...BUSINESS_COURSE_LESSONS,...DAILY_COURSE_LESSONS];

export function courseTrack(id:string){return COURSE_TRACKS.find(x=>x.id===id)||null}
export function courseUnit(id:string){return COURSE_UNITS.find(x=>x.id===id)||null}
export function courseLesson(id:string){return COURSE_LESSONS.find(x=>x.id===id)||null}
export function unitsForTrack(trackId:string){return COURSE_UNITS.filter(x=>x.trackId===trackId)}
export function lessonsForUnit(unitId:string){return COURSE_LESSONS.filter(x=>x.unitId===unitId)}
export function lessonsForTrack(trackId:string){return COURSE_LESSONS.filter(x=>x.trackId===trackId)}
