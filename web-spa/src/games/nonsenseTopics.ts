/** Fixed, versioned, no-network prompts; 6 themes × 25 prompts. */
export type NonsenseLanguage="zh"|"en";
export type NonsenseTopic={id:string;category:string;zh:string;en:string};
export const nonsenseCategories=[
  {
    "id": "science",
    "zh": "荒謬科學",
    "en": "Absurd Science"
  },
  {
    "id": "work",
    "zh": "職場地獄",
    "en": "Office Chaos"
  },
  {
    "id": "animals",
    "zh": "動物革命",
    "en": "Animal Revolution"
  },
  {
    "id": "laws",
    "zh": "奇葩法律",
    "en": "Ridiculous Laws"
  },
  {
    "id": "love",
    "zh": "戀愛人生",
    "en": "Love & Life"
  },
  {
    "id": "apocalypse",
    "zh": "末日幻想",
    "en": "Apocalyptic Fantasy"
  }
] as const;
const raw=[
  {
    "category": "science",
    "rows": [
      "睡覺其實是瞬間移動|Sleeping is actually teleportation",
      "月亮是地球的夜燈|The Moon is Earth's nightlight",
      "人類應該長出第三隻手|Humans should grow a third hand",
      "打噴嚏可以代替汽車喇叭|Sneezes should replace car horns",
      "冰淇淋比太陽能更適合發電|Ice cream is the future of energy",
      "襪子消失是平行宇宙的證據|Missing socks prove parallel universes exist",
      "打哈欠是一種無線充電|Yawning is a type of wireless charging",
      "雨傘應該被列為交通工具|Umbrellas should be classified as vehicles",
      "貓的呼嚕聲可以預測天氣|A cat's purr can predict the weather",
      "冷氣是在把冬天養在盒子裡|Air conditioners keep winter in a box",
      "手機電量越低人就越有創意|Low phone batteries make humans more creative",
      "地球其實是巨大的彈珠|Earth is secretly a giant marble",
      "鬧鐘是最古老的人工智慧|Alarm clocks were the first AI",
      "人類應該用泡泡傳送訊息|Bubbles are a better messaging system",
      "巧克力可以代替電腦密碼|Chocolate should replace computer passwords",
      "星星是宇宙的便利貼|Stars are the universe's sticky notes",
      "下雨是雲朵在洗澡|Rain is how clouds take showers",
      "影子其實是在跟蹤人類|Shadows are secretly following humans",
      "空氣應該有不同口味|Air should come in different flavors",
      "夢境需要設立客服中心|Dreams need a customer support center",
      "洗澡可以讓時間變慢|Taking a shower slows down time",
      "企鵝是南極的氣象主播|Penguins are Antarctica's weather reporters",
      "磁鐵其實只是在交朋友|Magnets are just trying to make friends",
      "泡麵應該列入天文研究|Instant noodles belong in astronomy research",
      "地心引力應該每週休假一天|Gravity deserves one day off each week"
    ]
  },
  {
    "category": "work",
    "rows": [
      "公司應該一週只上班一天|We should work only one day a week",
      "遲到的人應該加薪|Late employees deserve a raise",
      "開會是一項極限運動|Meetings are an extreme sport",
      "老闆應該接受員工的績效考核|Employees should review the boss",
      "午睡應該算加班|Office naps should count as overtime",
      "週一應該直接改名成週五|Mondays should be renamed Fridays",
      "上班打卡應該靠唱歌|Clocking in should require singing",
      "咖啡機才是公司的真正執行長|The coffee machine is the real CEO",
      "公司應該發放情緒津貼|Companies should pay a mood allowance",
      "所有會議都應該在溜滑梯上舉辦|Every meeting should happen on a slide",
      "離職信應該用詩歌表達|Resignation letters should be poems",
      "簡報越短薪水越高|Shorter slides deserve higher salaries",
      "辦公椅應該有年度體檢|Office chairs need annual health checks",
      "職稱應該依照午餐選擇決定|Job titles should depend on lunch choices",
      "摸魚應該列為企業文化|Slacking off should become company culture",
      "電子郵件應該有每日上限|Emails should have a daily limit",
      "面試應該先比賽疊紙飛機|Job interviews should start with paper airplanes",
      "所有主管都應該先養一盆仙人掌|Every manager should first raise a cactus",
      "公司年終應該用扭蛋決定|Year-end bonuses should be a capsule lottery",
      "出差只能靠擲骰子決定目的地|Business trips should be decided by dice",
      "沒有開鏡頭的會議才最有效率|Camera-off meetings are the most productive",
      "工作日曆應該顯示心情天氣|Work calendars should forecast emotions",
      "公司制服應該是睡衣|Pajamas should be the office uniform",
      "升遷考試應該考講笑話|Promotions should require telling jokes",
      "職場最大的技能是裝忙|Looking busy is the most important career skill"
    ]
  },
  {
    "category": "animals",
    "rows": [
      "貓應該擔任總統|Cats should be president",
      "企鵝應該統治地球|Penguins should rule the Earth",
      "蚊子應該領基本工資|Mosquitoes deserve a minimum wage",
      "狗應該有自己的社群媒體|Dogs should have their own social network",
      "烏龜應該擔任交通部長|Turtles should be transportation ministers",
      "鴿子是最可靠的郵差|Pigeons are the most reliable mail carriers",
      "金魚應該教人類冥想|Goldfish should teach humans meditation",
      "樹懶應該當時間管理教練|Sloths should teach time management",
      "海豚應該主持脫口秀|Dolphins should host talk shows",
      "熊貓應該負責外交談判|Pandas should handle diplomacy",
      "螞蟻可以管理大型企業|Ants could run big corporations",
      "章魚應該成為電競選手|Octopuses should be esports champions",
      "鴨子走路是最優雅的時尚秀|A duck's walk is the ultimate fashion show",
      "長頸鹿應該負責監視交通|Giraffes should monitor traffic",
      "狐狸應該開公關公司|Foxes should run PR agencies",
      "河馬應該代言牙膏|Hippos should advertise toothpaste",
      "刺蝟應該設計防盜系統|Hedgehogs should design security systems",
      "蜜蜂應該主持城市規劃|Bees should plan our cities",
      "青蛙應該當游泳教練|Frogs should be swimming instructors",
      "袋鼠適合經營快遞公司|Kangaroos should run delivery companies",
      "無尾熊可以當睡眠顧問|Koalas should be sleep consultants",
      "蝸牛應該參加賽車比賽|Snails should compete in racing",
      "企鵝的西裝證明牠們適合從政|Penguin suits make them ideal politicians",
      "松鼠應該管理國家糧倉|Squirrels should manage national food reserves",
      "貓頭鷹應該主持早晨新聞|Owls should anchor the morning news"
    ]
  },
  {
    "category": "laws",
    "rows": [
      "星期一應該被宣布違法|Mondays should be illegal",
      "打呼應該需要駕照|Snoring should require a license",
      "每個人每天都必須講一句謊話|Everyone should tell one lie a day",
      "起床超過三次鬧鐘應該有補助|Snoozing three times should earn a subsidy",
      "披薩最後一片應該依法拍賣|The last pizza slice must be auctioned",
      "排隊時玩手機應該算運動|Using a phone in line should count as exercise",
      "忘記帶鑰匙應該放國定假日|Forgetting your keys deserves a public holiday",
      "所有電梯都要播放入場音樂|Elevators must play entrance music",
      "人類每天至少要對鏡子鼓掌一次|Everyone must applaud their mirror daily",
      "生日當天所有東西應該打五折|Everything should be half-price on birthdays",
      "拖延症應該享有法律保障|Procrastination deserves legal protection",
      "冰箱半夜偷吃必須先申請|Midnight fridge raids should need a permit",
      "自拍超過十張必須繳娛樂稅|Taking ten selfies should trigger an entertainment tax",
      "餐廳等餐時間可以折抵上班|Waiting for food should count as work",
      "說冷笑話的人應該有免責權|Bad joke tellers deserve immunity",
      "假日下雨應該由天氣局道歉|Weather services must apologize for rainy holidays",
      "電視遙控器失蹤要成立專案小組|Missing remotes deserve a task force",
      "所有錯字都應該被視為創意寫作|Typos must be recognized as creative writing",
      "不回訊息超過三天要提出報告|Ignoring messages for three days requires a report",
      "賴床應該列入文化資產|Sleeping in should be cultural heritage",
      "早餐應該提供第二次機會|Breakfast should offer a second chance",
      "所有人都可以每月宣布一天暫停現實|Everyone gets one reality-pause day a month",
      "講太長的故事要附目錄|Long stories must include a table of contents",
      "烤焦吐司應該獲得勇氣獎|Burnt toast deserves a bravery award",
      "每座城市都應該有官方貓市長|Every city needs an official cat mayor"
    ]
  },
  {
    "category": "love",
    "rows": [
      "單身其實是一種超能力|Being single is a superpower",
      "分手應該有七天鑑賞期|Breakups should have a seven-day return window",
      "愛情應該提供保固服務|Love should come with a warranty",
      "約會遲到應該用笑話賠償|Being late for a date should require jokes",
      "第一次約會應該先交換購物清單|First dates should start with shopping lists",
      "戀人應該可以按下暫停鍵|Couples should have a pause button",
      "吵架應該交給石頭剪刀布決定|Arguments should be settled by rock paper scissors",
      "最浪漫的求婚是一起修水管|Fixing a sink is the most romantic proposal",
      "送禮物應該附使用說明書|Gifts should come with instruction manuals",
      "結婚前應該先一起玩密室逃脫|Couples should escape a room before marrying",
      "愛情顧問應該由貓擔任|Cats should be relationship advisors",
      "朋友聚會應該設立吐槽配額|Friend gatherings need a teasing quota",
      "人生應該允許免費重新命名|Everyone deserves a free life rename",
      "尷尬沉默應該算一種藝術|Awkward silence is an art form",
      "週末不出門應該得到社交獎勵|Staying home on weekends deserves social rewards",
      "好友應該定期舉辦辯論比賽|Friends should hold regular debates",
      "生日願望應該可以分期付款|Birthday wishes should support installments",
      "自拍是現代人的自畫像藝術|Selfies are modern fine art portraits",
      "遺忘紀念日應該用唱歌補救|Singing should fix forgotten anniversaries",
      "最好的禮物是一張免洗碗券|A dishwashing pass is the best gift",
      "人際關係需要客服專線|Friendships need customer service",
      "家庭群組應該有官方主持人|Family chats need official moderators",
      "對方已讀不回是一種神秘藝術|Being left on read is a mysterious art",
      "聊天應該設置每日最佳台詞獎|Chats should have a daily best-line award",
      "每個人都應該有自己的進場配樂|Everyone should have personal entrance music"
    ]
  },
  {
    "category": "apocalypse",
    "rows": [
      "殭屍爆發時最重要的是 Wi-Fi|Wi-Fi is the top priority in a zombie outbreak",
      "外星人應該雇用地球人當寵物|Aliens should hire humans as pets",
      "世界末日應該先放三天假|The apocalypse should begin with three days off",
      "如果時間停止第一件事應該是喝咖啡|Coffee is the first priority if time stops",
      "火星殖民地應該設立夜市|Mars colonies should open night markets",
      "機器人起義時應該用冷笑話談判|Bad jokes can stop a robot uprising",
      "漂流荒島第一件事要做招牌|The first task on a deserted island is making a sign",
      "外星人應該先學會排隊|Aliens should learn to queue first",
      "拯救地球應該靠大型抱枕|Giant pillows should save the planet",
      "末日避難所一定要有卡拉 OK|Every apocalypse bunker needs karaoke",
      "時間旅行應該禁止查看考試答案|Time travelers must not peek at exam answers",
      "宇宙飛船的船長應該由抽籤產生|Spaceship captains should be chosen by lottery",
      "如果太陽請假我們應該先辦歡迎會|If the Sun takes leave, we should throw a party",
      "黑洞其實是宇宙的垃圾桶|Black holes are the universe's trash bins",
      "平行宇宙應該有跨界旅遊簽證|Parallel universes should issue tourist visas",
      "如果月球開餐廳主打菜應該是泡麵|The Moon's signature dish should be instant noodles",
      "外星外交使節應該帶台灣珍珠奶茶|Alien diplomats should bring bubble tea",
      "如果地球會說話它應該先請病假|If Earth could speak, it would call in sick",
      "未來的戰爭應該改成枕頭大戰|Future wars should be pillow fights",
      "末日倒數時大家應該投票選背景音樂|Apocalypse countdowns should include a music vote",
      "太空人應該帶寵物金魚上火星|Astronauts should bring pet goldfish to Mars",
      "時空門應該設在便利商店門口|Time portals should be placed by convenience stores",
      "遇到外星文明應該先交換迷因|First contact with aliens should begin with memes",
      "超能力應該每月免費試用三天|Superpowers should offer three-day monthly trials",
      "宇宙末日的最後一則訊息應該是早安|The universe's last message should say good morning"
    ]
  }
];
export const nonsenseTopics:NonsenseTopic[]=raw.flatMap(({category,rows})=>rows.map((row,index)=>{
 const at=row.indexOf("|");
 if(at<1||at===row.length-1)throw Error("Invalid nonsense topic "+category+":"+index);
 return {id:category+"-"+String(index+1).padStart(2,"0"),category,zh:row.slice(0,at),en:row.slice(at+1)};
}));
export function pickNonsenseTopic(category:string,exclude?:string,random=Math.random):NonsenseTopic{
 const pool=nonsenseTopics.filter(topic=>(category==="all"||topic.category===category)&&topic.id!==exclude);
 if(!pool.length)throw Error("No nonsense topics available");
 return pool[Math.min(pool.length-1,Math.floor(Math.max(0,random())*pool.length))];
}
export const nonsenseHints:Record<string,{zh:string[];en:string[]}>={
 science:{zh:["奇怪的科學原理","生活中的荒謬證據","令人意外的好處"],en:["An impossible scientific theory","Absurd everyday evidence","A surprising benefit"]},
 work:{zh:["公司的隱藏成本","員工的幸福指數","主管最怕的結果"],en:["Hidden company costs","Employee happiness","The boss's greatest fear"]},
 animals:{zh:["動物的特殊能力","為什麼人類不如牠","改革的第一步"],en:["An animal's superpower","Why humans can't compete","The first reform"]},
 laws:{zh:["先定義違法行為","設計搞笑的罰則","為什麼社會會更好"],en:["Define the offense","Invent a silly penalty","How society improves"]},
 love:{zh:["一個尷尬的例子","你的荒謬理論","帶來的奇妙改變"],en:["An awkward example","Your wild theory","An unexpected change"]},
 apocalypse:{zh:["末日第一天","你的瘋狂求生策略","最後的反轉"],en:["The first day","Your absurd survival plan","The final twist"]}
};
export const nonsenseJudges=[
 {id:"stern",zh:"鐵面法官",en:"Stern Judge",icon:"⚖"},
 {id:"roast",zh:"毒舌主持人",en:"Roast Host",icon:"🎤"},
 {id:"scientist",zh:"瘋狂科學家",en:"Mad Scientist",icon:"⚗"},
 {id:"queen",zh:"傲嬌女王",en:"Proud Queen",icon:"♛"}
] as const;
export type NonsenseJudgeId=typeof nonsenseJudges[number]["id"];
