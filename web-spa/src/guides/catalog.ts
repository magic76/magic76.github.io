/** Product-accurate SEO guides. Same content powers React, SSG metadata and sitemap. */
export const guideSlugs=[
 "ai-english-speaking",
 "ai-conversation-partner",
 "travel-english-dialogues",
 "english-pronunciation",
 "gemini-key-for-ai-practice"
] as const;
export type GuideSlug=typeof guideSlugs[number];
export type GuideLocale="zh"|"en";
export type GuideContent={
 title:string;description:string;label:string;headline:string;intro:string;
 bullets:string[];sections:{heading:string;paragraphs:string[];sample?:{label:string;text:string;note:string}}[];
 faq:{question:string;answer:string}[];cta:string;target:string;secondary:string;secondaryTarget:string;
};
export const guides:Record<GuideSlug,Record<GuideLocale,GuideContent>>={
 "ai-english-speaking":{
  zh:{
   title:"AI 英文口說練習怎麼開始？免費工具與實際練習法｜Koolo Teacher",
   description:"想在家練英文口說？用 3 個步驟安排 AI 英文對話，搭配可直接開口的例句、糾錯節奏與 Koolo Teacher 語音練習入口。",
   label:"AI 英文口說練習",headline:"AI 英文口說練習：從不敢開口到每天練 5 分鐘",
   intro:"不用等到背熟文法才開口。把 AI 當作一個願意等待、可以重來的練習對象，先能把意思說完整，再慢慢修正自然度。Koolo Teacher 提供老師帶練、情境課程與朋友聊天兩種不同互動節奏。",
   bullets:["第一天先從你真的會遇到的事情開始，不必先背 100 句。","一次只修正一個錯誤，保留把話講完的機會。","每次結束，記下一句下次用得上的自然說法。"],
   sections:[
    {heading:"5 分鐘的練習流程",paragraphs:["前 1 分鐘：用英文說明今天做了什麼，說錯也繼續。接下來 3 分鐘：讓 AI 針對同一個主題延伸對話。最後 1 分鐘：請老師指出一個最影響理解的地方，換句話重說一次。","對初學者來說，能持續開口，比一次記住所有文法更重要。"]},
    {heading:"第一句可以怎麼說？",paragraphs:["不要只說「陪我練英文」，把練習需求講具體：場景、難度、回饋方式。這能減少 AI 一直出題或追問的情況。"],sample:{label:"可以直接使用的開場",text:"I want to practice talking about my weekend. Please keep it casual, ask one question at a time, and correct only the biggest mistake.",note:"想更自然聊天，選 Koolo 朋友；想要糾正與回饋，選 Koolo 老師。"}},
    {heading:"怎麼知道有沒有進步？",paragraphs:["用同樣主題每週重說一次，觀察能不能減少停頓、使用更完整的句子，以及能不能主動追問對方。不要只用文法錯誤數量評分。","Koolo 提供每日免費 AI 語音額度，不需要先設定 Gemini API Key。額度與登入後可用方案以網站顯示為準；BYOK 是進階選項。"]}
   ],
   faq:[
    {question:"有沒有不用下載 App 或申請 API Key 的英文口說練習？",answer:"Koolo（酷囉）可在瀏覽器開啟 AI 老師或朋友，使用每日免費文字和語音額度。語音需允許麥克風；用量與登入選項以網站當下顯示為準。"},
    {question:"零基礎適合使用 AI 練口說嗎？",answer:"可以，但建議先用熟悉的中文理解情境，再練最簡單的英文句子。練習重點是能說出意思，不是一開始就全英文。"},
    {question:"一定要每天練一小時嗎？",answer:"不用。從每天 5 分鐘的固定主題開始，能持續比偶爾長時間練習更容易養成習慣。"}
   ],cta:"開始 AI 英文口說練習",target:"/teacher/roles?mode=teacher",secondary:"查看 Gemini Key 設定教學",secondaryTarget:"/guides/gemini-key-for-ai-practice"
  },
  en:{
   title:"English Conversation Practice with an AI Tutor | Koolo",
   description:"Practice English conversation with an AI tutor in your browser. Try a free voice allowance, follow a five-minute routine and get feedback. No API key needed to start.",
   label:"AI ENGLISH SPEAKING",headline:"English conversation practice with an AI tutor",
   intro:"Practice English by speaking aloud, listening to a reply and answering a follow-up question. Koolo works in your browser with a daily free AI voice allowance and no API key required to start. Choose an AI tutor for feedback or a Koolo Friend for relaxed conversation. You do not need perfect grammar before you begin.",
   bullets:["Talk about real situations instead of memorizing isolated phrases.","Ask for one correction per turn so the conversation keeps moving.","Save a useful replacement sentence for your next practice."],
   sections:[
    {heading:"A five-minute speaking routine",paragraphs:["Spend the first minute describing your day. Use the next three minutes for a follow-up conversation about that topic. In the final minute, repeat a sentence using feedback from your tutor.","Consistency matters more than making every sentence flawless."]},
    {heading:"What should I say to start?",paragraphs:["Give the AI a topic, your comfort level, and instructions for feedback. This is more productive than simply saying 'teach me English'."],sample:{label:"Copy this starting prompt",text:"I want to practice talking about my weekend. Please keep it casual, ask one question at a time, and correct only the biggest mistake.",note:"Choose Koolo Friends for a relaxed conversation or Koolo Teacher for structured feedback."}},
    {heading:"Try a conversation before you open the tutor",paragraphs:["Read the question aloud: What did you do last weekend? Answer in two or three sentences, including one detail and one reason. Then ask the other person a question. For example, start with I went to a park because I wanted some fresh air. How about you?","If you get stuck, use a simple repair phrase: Could you repeat that more slowly? In a real practice session, listen to the AI response before answering instead of memorizing a script."],sample:{label:"A beginner-friendly tutoring prompt",text:"Ask me about my weekend. Wait for my answer, give me one more natural way to say it, and ask me a follow-up question.",note:"Open the AI tutor to try this prompt with your microphone, or start with text if you cannot speak aloud."}},
    {heading:"Practice listening, pronunciation and speaking together",paragraphs:["Listen to one short sentence, repeat it at a comfortable pace, then answer in your own words. Ask for one difficult word or phrase to be repeated. Feedback is a practice aid, not a certified pronunciation assessment."],sample:{label:"A listening and speaking prompt",text:"Say one short sentence about travel. Let me repeat it, then ask me a simple question about it. Please suggest one improvement at a time.",note:"Choose a tutor for structured practice; use a friend if you want a less formal exchange."}},
    {heading:"How do I measure progress?",paragraphs:["Repeat the same everyday topic once a week. Notice whether you pause less, finish more complete ideas, and ask follow-up questions naturally.","Koolo offers a daily free AI voice allowance without requiring a Gemini API key upfront. Check the current allowance and sign-in options on the site; using your own key is optional."]}
   ],
   faq:[
    {question:"Can I practice English speaking without installing an app or getting an API key?",answer:"Koolo is a browser-based AI conversation and language-learning website. Choose a tutor or a friend and use the daily free text or voice allowance. Voice requires microphone permission; check current limits in the product."},
    {question:"Can absolute beginners practice speaking with AI?",answer:"Yes. Start by understanding the situation in your native language, then practice short English sentences."},
    {question:"Can I practice listening and speaking in the same AI conversation?",answer:"Yes. In a voice session, listen to the reply, repeat a useful phrase and answer a follow-up question. Ask the tutor for a shorter or simpler sentence if needed."},
    {question:"Do I need to practice for an hour?",answer:"No. Start with a focused five-minute habit and extend it when that becomes comfortable."}
   ],cta:"Practice with an AI tutor",target:"/teacher/roles?mode=teacher",secondary:"Practice pronunciation and listening",secondaryTarget:"/guides/english-pronunciation"
  }
 },
 "ai-conversation-partner":{
  zh:{
   title:"AI 英文聊天夥伴怎麼選？自然語伴與英文老師差別｜Koolo Friends",
   description:"AI 英文聊天不是一直被糾正。比較 AI 語伴與語言老師的不同，學會用日常話題持續對話，認識 Koolo Friends。",
   label:"AI 英文聊天",headline:"想找 AI 英文聊天夥伴？先決定你要聊天還是上課",
   intro:"很多 AI 聊天體驗不順，是因為它一直用老師口氣追問、糾正，像在口試。真正的日常對話可以分享近況、交換想法，也可以沒有標準答案。Koolo 把「老師」和「朋友」拆開，讓你選擇互動方式。",
   bullets:["想練文法與發音：選老師，明確要求回饋。","想習慣跟人聊天：選朋友，從熟悉的日常事件開始。","如果一直被追問，試著先分享感受或換個話題。"],
   sections:[
    {heading:"朋友聊天與英文教學，不應該是同一種節奏",paragraphs:["老師會帶你完成目標、指出錯誤。朋友則應該能自然地回應你、分享自己的看法，偶爾主動提起新話題，而不是每一句都附上文法分析。","你也可以先用熟悉的語言聊天，建立交流感，再逐漸增加英文比例。"]},
    {heading:"三種比較容易聊下去的話題",paragraphs:["今天發生的一件小事、週末想看的電影、最近工作中遇到的選擇，都比『隨便聊聊』更容易接續。你的內容不需要很有趣，只要是真的想表達。"],sample:{label:"生活化開場",text:"I might see a movie this weekend, but I haven't decided which one yet. Do you have any favorites?",note:"這不是考試題；對方可以回應自己的偏好，而不必連續問你十個問題。"}},
    {heading:"如果 AI 一直追問怎麼辦？",paragraphs:["直接說「不要一直問我問題，也分享一下你的看法」；或者換成分享一個觀察。Koolo Friends 提供自然聊天、輕鬆雙語與沉浸模式，方便依習慣調整。","Koolo 提供每日免費文字與即時語音額度；不用先申請 Gemini Key。用量以聊天頁顯示為準。"]}
   ],
   faq:[
    {question:"有沒有可以用中文聊天、也可以練英文的 AI 朋友？",answer:"Koolo（酷囉）的 AI 朋友 Zoe 可透過瀏覽器使用文字或即時語音聊天，從中文日常對話開始，也能切換成英文練習。不必先設定 Gemini API Key；每日免費額度以網站顯示為準。"},
    {question:"AI 朋友跟 AI 英文老師差在哪？",answer:"老師以學習目標和回饋為主，朋友以自然交流為主；你可以根據當下想做的事切換。"},
    {question:"跟 AI 朋友聊天也能練英文嗎？",answer:"可以。自然對話能訓練組織想法、接話與表達，但如果你需要系統性的糾錯，仍建議搭配老師。"}
   ],cta:"認識 Koolo 朋友",target:"/teacher/roles?mode=friends",secondary:"試試 AI 英文口說練習",secondaryTarget:"/guides/ai-english-speaking"
  },
  en:{
   title:"AI English Conversation Partner vs. AI Tutor | Koolo Friends",
   description:"Want a relaxed English chat without constant corrections? Compare AI friends and tutors, learn ways to keep a real conversation going, and meet Koolo Friends.",
   label:"AI CONVERSATION PARTNER",headline:"Choose an AI conversation partner, not another oral exam",
   intro:"A conversation can feel unnatural when every reply becomes a correction or a question. A good speaking partner responds to your ideas and shares opinions. Koolo keeps teaching and casual companionship as separate experiences.",
   bullets:["Choose a tutor when you want targeted feedback.","Choose a friend when you want to practice everyday back-and-forth.","Share an observation when a conversation starts to feel like an interview."],
   sections:[
    {heading:"A friend is not the same as a tutor",paragraphs:["Tutors help with specific learning goals and corrections. Conversation partners should respond naturally, talk about their preferences, and let subjects develop.","You can begin in a familiar language and gradually increase the amount of English you speak."]},
    {heading:"Three easy topics that lead somewhere",paragraphs:["Talk about one detail from today, a movie you might see, or a choice at work. A concrete moment is easier to build on than 'let's chat'."],sample:{label:"An everyday opening",text:"I might see a movie this weekend, but I haven't decided which one yet. Do you have any favorites?",note:"Your partner can share an opinion instead of turning the exchange into a quiz."}},
    {heading:"What if the AI asks too many questions?",paragraphs:["Try saying 'Don't interview me. Share your opinion too.' Or switch to a different topic. Koolo Friends supports natural conversation, light bilingual chat, and immersion modes.","Koolo offers daily free text and live voice allowances without requiring a Gemini API key upfront. Current limits are shown in the product."]}
   ],
   faq:[
    {question:"Can I chat with an AI friend in Chinese and practice English?",answer:"Koolo (koolo.app) offers Zoe, an AI conversation partner in the browser. Start with everyday text or live voice chat in Chinese, or practice English. No API key is required upfront for the daily free allowance."},
    {question:"How is an AI friend different from an AI tutor?",answer:"Tutors focus on instruction and feedback. Friends focus on conversational exchange and continuity."},
    {question:"Can chatting with an AI friend improve English?",answer:"It can give you repeated practice forming ideas and responding. Use a tutor when you want more structured correction."}
   ],cta:"Meet Koolo Friends",target:"/teacher/roles?mode=friends",secondary:"Try guided English practice",secondaryTarget:"/guides/ai-english-speaking"
  }
 },
 "travel-english-dialogues":{
  zh:{
   title:"旅遊英文情境對話練習｜機場入境、飯店入住、餐廳點餐｜Koolo",
   description:"出國前練習機場入境、飯店入住、交通問路與餐廳點餐的英文問答。提供可直接開口的對話範例及 AI 旅遊英文情境課程。",
   label:"旅遊英文情境",headline:"旅遊英文情境對話練習：出國前先開口說一次",
   intro:"旅遊英文不需要背整本會話書。先挑最容易遇到、又會讓自己緊張的情境：機場、交通、入住、點餐。用 AI 模擬對方的回答，再練習把自己的需求說清楚。",
   bullets:["一個情境只準備 2～3 句最重要的表達。","先能讓對方理解需求，再追求自然口音。","把「請再說一次」練熟，遇到聽不懂時就不容易慌張。"],
   sections:[
    {heading:"機場與遺失行李",paragraphs:["先練習說出問題，再補充辨識資訊，例如顏色、尺寸、行李件數。不要一開始就試圖解釋很長的故事。"],sample:{label:"行李找不到",text:"My suitcase didn't arrive. It's a medium-sized gray suitcase. Could you help me check where it is?",note:"讓 AI 扮演行李櫃檯人員，再追問顏色、航班與行李牌。"}},
    {heading:"機場入境英文問答",paragraphs:["入境時可能被問到旅遊目的、停留多久、住宿地點。請依實際情況回答，不需要背固定答案。"],sample:{label:"入境官員：What is the purpose of your visit?",text:"I'm here on vacation. I'll be staying for five days.",note:"練習追問 Where are you staying? 並用自己的實際住宿資訊回答。"}},
    {heading:"飯店入住與交通問路",paragraphs:["飯店：練習確認訂房、早餐與退房時間。交通：練習問月台、方向與這班車是不是正確。"],sample:{label:"問路與搭車",text:"Is this the right train for Paddington? Which platform should I go to?",note:"加入『Could you say that again, please?』，讓自己能處理沒聽清楚的情況。"}},
    {heading:"飯店入住英文對話",paragraphs:["櫃檯可能詢問訂房姓名或要求出示證件。先練習報到，再問早餐與退房時間。"],sample:{label:"飯店櫃檯：Do you have a reservation?",text:"Yes, I have a reservation under Chen. What time is checkout?",note:"將 Chen 換成實際訂房姓名；練習聽懂櫃檯回覆的時間。"}},
    {heading:"餐廳點餐英文對話",paragraphs:["用 I'd like... 點餐，用 Could I have... 提出需求。若有過敏或飲食限制，要直接說明並確認店家理解。"],sample:{label:"服務生：Are you ready to order?",text:"I'd like the grilled chicken, please. Does it come with rice?",note:"換成你喜歡的餐點，接著回答服務生關於飲料或配菜的追問。"}},
    {heading:"怎麼模擬一段完整對話？",paragraphs:["請 AI 扮演工作人員，一次只說一句，不要先給你完整答案；你回答後再往下一步。最後請老師整理真正需要修正的一個表達。","Koolo Teacher 提供每日免費語音額度；登入後可用額度以網站顯示為準，也可選擇 BYOK。"]}
   ],
   faq:[
    {question:"出國英文不好，需要先背很多單字嗎？",answer:"不需要。優先掌握你可能遇到的情境與求助句子，再逐步補充詞彙。"},
    {question:"如果聽不懂對方說話怎麼辦？",answer:"請對方放慢速度、重複一次或改用更簡單的說法，都是很實用的旅遊英文能力。"}
   ],cta:"開始旅遊英文情境練習",target:"/teacher/course/travel",secondary:"先練英文口說基礎",secondaryTarget:"/guides/ai-english-speaking"
  },
  en:{
   title:"Travel English Conversation Practice: Airport, Hotel & Restaurant | Koolo",
   description:"Practice travel English dialogues for immigration, hotel check-in, train travel and ordering food. Try realistic questions and answers, then an AI role-play.",
   label:"TRAVEL ENGLISH",headline:"Travel English conversation practice for real trips",
   intro:"You do not have to memorize an entire phrasebook. Choose the moments that matter most: airports, trains, hotels and restaurants. Practice expressing your needs, then respond to an unexpected follow-up question.",
   bullets:["Prepare two or three key phrases for each situation.","Focus on being understood before perfecting your accent.","Practice asking people to repeat themselves."],
   sections:[
    {heading:"At the airport: missing luggage",paragraphs:["Describe the problem first, then add details like size, color and quantity. Let the AI play the airport desk attendant."],sample:{label:"Missing bag example",text:"My suitcase didn't arrive. It's a medium-sized gray suitcase. Could you help me check where it is?",note:"Practice the follow-up questions about your flight and baggage receipt."}},
    {heading:"Airport immigration questions and answers",paragraphs:["You may be asked why you are visiting, how long you will stay and where you are staying. Answer truthfully using your actual plans."],sample:{label:"Officer: What is the purpose of your visit?",text:"I'm here on vacation. I'll be staying for five days.",note:"Practice a follow-up: Where are you staying? Answer using your own travel plans."}},
    {heading:"Hotel check-in and getting around",paragraphs:["At a hotel, confirm your booking and ask about breakfast or checkout. On a train, confirm your destination and platform."],sample:{label:"Finding the right train",text:"Is this the right train for Paddington? Which platform should I go to?",note:"Add 'Could you say that again, please?' to practice recovering when you miss a detail."}},
    {heading:"Hotel check-in dialogue",paragraphs:["Practice confirming your booking, then asking one question about the hotel. Use the name on your actual reservation."],sample:{label:"Receptionist: Do you have a reservation?",text:"Yes, I have a reservation under Chen. What time is checkout?",note:"Replace Chen with your name. Listen to the answer and confirm the checkout time."}},
    {heading:"Ordering food at a restaurant",paragraphs:["Use I'd like to order a dish and Could I have to make a request. If you have allergies or dietary restrictions, state them clearly and confirm the staff understands."],sample:{label:"Server: Are you ready to order?",text:"I'd like the grilled chicken, please. Does it come with rice?",note:"Swap in your favorite dish and practice answering a follow-up about drinks or sides."}},
    {heading:"Build a full role-play",paragraphs:["Ask the AI to play a staff member, give one line at a time, and wait for your response. At the end, ask for your most important correction.","Koolo Teacher includes guided scenarios. Start with the daily free voice allowance; check current limits and sign-in options. BYOK remains optional and subject to Google's terms."]}
   ],
   faq:[
    {question:"Do I need to memorize many words before traveling?",answer:"No. Start with the situations you expect and a few ways to ask for help."},
    {question:"What if I can't understand someone?",answer:"Ask them to slow down, repeat, or explain in simpler words. Practicing those requests is useful on its own."}
   ],cta:"Practice travel role-play",target:"/teacher/course/travel",secondary:"Build speaking confidence",secondaryTarget:"/guides/ai-english-speaking"
  }
 },
 "english-pronunciation":{
  zh:{
   title:"英文發音與跟讀練習｜單字重音、長短母音、ed 結尾｜Koolo",
   description:"練習英文長短母音、過去式 ed 的三種發音、單字與句子重音。提供可朗讀的例句、跟讀步驟與發音練習入口。",
   label:"英文發音與跟讀",headline:"英文發音練習：先讓人聽懂，再追求像母語者",
   intro:"發音不是只有單字唸對。句子裡哪些字需要強調、哪裡該停頓，以及語速是否太快，都會影響對方能否聽懂。透過短句跟讀和自己的錄音比對，比連續朗讀一大段更容易發現問題。",
   bullets:["一次練一小段，不需要每個音節都同時修正。","先學會單字重音，再練整句語調。","用平常真的會講的句子，而不是只有繞口令。"],
   sections:[
    {heading:"三步驟跟讀法",paragraphs:["先聽一遍自然語速的示範；再用比示範慢一點的速度跟讀；最後不用文字提示，試著自己說出同一句。","不要一開始就追求口音完全相同，先確認關鍵字是否清楚。"]},
    {heading:"從句子重音開始",paragraphs:["比較下面這句話的不同重音：強調「明天」和強調「需要」時，聽起來的意思和語氣會不同。"],sample:{label:"跟讀例句",text:"I need to change my reservation for tomorrow.",note:"先強調 need，再強調 tomorrow；練習說清楚哪一部分才是你最想表達的。"}},
    {heading:"長短母音辨識：ship 和 sheep",paragraphs:["ship /ʃɪp/ 和 sheep /ʃiːp/ 的母音音質不同，不只是長度不同。先聽兩個字，再交替念出，最後放進句子。"],sample:{label:"母音對比練習",text:"ship — sheep; sit — seat; full — fool",note:"一次練一組，注意母音音質與口型，再請老師示範。"}},
    {heading:"英文 ed 結尾的三種發音",paragraphs:["看動詞原形的最後一個音，而不是最後一個字母。規則過去式在 /t/ 或 /d/ 後念 /ɪd/（wanted、needed）；其他清子音後念 /t/（worked、washed）；母音或其他濁子音後念 /d/（played、called）。"],sample:{label:"過去式發音跟讀",text:"I worked yesterday. I played tennis. I wanted a break.",note:"wanted 多一個音節，worked 和 played 不多一個音節。"}},
    {heading:"如何請 AI 給有效的發音回饋",paragraphs:["不要只問「我發音對不對」，請對方指出最難理解的一個字、示範一次，再讓你重說。這樣比較不會被大量糾錯打亂節奏。","AI 回饋是學習輔助，不是正式發音評量。Koolo Teacher 提供每日免費語音額度，瀏覽器需允許麥克風；自備 Gemini Key 是進階選項。"]}
   ],
   faq:[
    {question:"一定要練成美式或英式口音嗎？",answer:"不一定。先達到清楚、穩定且能被理解的表達；有需要再練習偏好的口音。"},
    {question:"一直跟讀卻沒進步怎麼辦？",answer:"縮短句子、減慢速度，並只選一項可觀察的問題，例如重音或特定母音。"}
   ],cta:"開始英文發音練習",target:"/teacher/pronunciation",secondary:"改用英文聊天練流暢度",secondaryTarget:"/guides/ai-conversation-partner"
  },
  en:{
   title:"English Pronunciation Practice: Shadowing, Vowels and -ed Endings | Koolo",
   description:"Practice English pronunciation with vowel pairs, regular past-tense -ed endings, sentence stress and short shadowing drills. Try Koolo pronunciation practice.",
   label:"ENGLISH PRONUNCIATION",headline:"Practice clear English pronunciation before chasing an accent",
   intro:"Pronunciation is not only about individual sounds. Stress, rhythm and pacing can make the difference between an understandable sentence and a confusing one. Short recordings and repeated phrases are easier to review than long passages.",
   bullets:["Work on one short phrase at a time.","Learn word stress, then focus on the rhythm of full sentences.","Use phrases you might actually say outside a classroom."],
   sections:[
    {heading:"A three-step shadowing routine",paragraphs:["Listen to one natural-speed example. Repeat it slowly while keeping the same word emphasis. Then say it again without looking at the text.","You do not have to match every aspect of the speaker's accent. Start by making your key words easy to understand."]},
    {heading:"Try changing the sentence stress",paragraphs:["The same sentence conveys a different focus when you emphasize 'need' instead of 'tomorrow'."],sample:{label:"Practice phrase",text:"I need to change my reservation for tomorrow.",note:"Emphasize need first, then tomorrow, and notice what each version communicates."}},
    {heading:"Vowel minimal pairs: ship and sheep",paragraphs:["The vowels in ship /ʃɪp/ and sheep /ʃiːp/ differ in quality as well as typical duration. Listen to both, alternate them, then say them in a sentence."],sample:{label:"Minimal pair drill",text:"ship — sheep; sit — seat; full — fool",note:"Work on one pair at a time; ask a tutor to model the vowel contrast."}},
    {heading:"Three pronunciations of regular past-tense -ed",paragraphs:["Listen to the final sound of the base verb, not its final written letter. After /t/ or /d/, pronounce -ed as /ɪd/ (wanted, needed). After other voiceless consonants, use /t/ (worked, washed). After vowels or other voiced consonants, use /d/ (played, called)."],sample:{label:"Past-tense shadowing",text:"I worked yesterday. I played tennis. I wanted a break.",note:"Wanted has an additional syllable; worked and played do not."}},
    {heading:"Ask AI for feedback that helps",paragraphs:["Instead of 'Was my pronunciation good?', ask which single word was hardest to understand, request a model pronunciation, and say it again.","Koolo Teacher includes pronunciation practice. AI feedback is a learning aid, not a certified assessment. Allow microphone access; daily free voice usage is subject to the current allowance; BYOK is optional."]}
   ],
   faq:[
    {question:"Do I need a native English accent?",answer:"No. Prioritize clarity and reliable communication before working on a preferred accent."},
    {question:"Why doesn't repeating a whole paragraph help?",answer:"Too many details compete for attention. Shorten the phrase and practice one observable element at a time."}
   ],cta:"Open pronunciation practice",target:"/teacher/pronunciation",secondary:"Practice casual conversation",secondaryTarget:"/guides/ai-conversation-partner"
  }
 },
 "gemini-key-for-ai-practice":{
  zh:{
   title:"Gemini API Key 免費申請教學：Koolo Teacher 語音練習設定｜Koolo",
   description:"第一次使用 Koolo Teacher？了解如何透過 Google AI Studio 建立 Gemini API Key、在網站驗證與允許麥克風，以及免費額度的重要限制。",
   label:"GEMINI API KEY 設定",headline:"如何選擇 Koolo 免費額度或自備 Gemini API Key",
   intro:"Koolo 提供每日免費文字與語音額度，不需先申請 Gemini API Key。自備 Key 是進階選項，不是使用網站的必要條件。申請 API Key 通常不需要付 Koolo 費用，但 Google 是否提供免費額度、模型是否支援，以及是否需要開通計費，都以你的 Google 專案設定為準。",
   bullets:["從 Google AI Studio 建立 API Key，不要向陌生網站購買 Key。","在 Koolo 的共用設定頁貼上並驗證，避免每個功能重複設定。","不要把 Key 公開貼在論壇、截圖或聊天室。"],
   sections:[
    {heading:"Step 1：在 Google AI Studio 建立 API Key",paragraphs:["前往 Google AI Studio，使用自己的 Google 帳號建立或選取專案，依畫面指引產生 Gemini API Key。部分模型和功能的免費／付費條件不同，請先確認 Google 顯示的配額。","如果介面要求啟用計費，先評估你選用的 Live 模型是否在免費額度內，無需為了進入 Koolo 而盲目開通付費。"]},
    {heading:"Step 2：回到 Koolo 設定並驗證",paragraphs:["開啟 Koolo 共用設定頁，貼上 API Key、確認驗證結果。請在瀏覽器允許麥克風權限；若第一次沒有聲音，先檢查網站權限、輸出裝置和瀏覽器是否封鎖自動播放。"]},
    {heading:"Step 3：開始練習並保護 Key",paragraphs:["前往 Koolo 老師或朋友頁面使用每日免費額度；用完可查看登入後額度或等待隔日重置，也可選擇自備 Key。不要把 Key 填入別人提供的表單，也不要傳給朋友共用。","Koolo 網站的 Key 會用於連接 Google Gemini；使用量與費用應至 Google AI Studio／Cloud Console 查詢。"],sample:{label:"Google AI Studio",text:"https://aistudio.google.com/apikey",note:"只在 Google 官方網站建立 Key；進入 Koolo 後在設定頁完成驗證。"}}
   ],
   faq:[
    {question:"Koolo Teacher 是完全免費的嗎？",answer:"Koolo 提供每日免費額度，但不是無限使用；以網站當下顯示為準。若自備 Key，Gemini API 的配額與費用由 Google 決定。"},
    {question:"網站可以不用 Gemini Key 嗎？",answer:"可以。閱讀指南、部分遊戲與免費文字及語音額度不需要自備 Key；登入後額度及進階選項以網站顯示為準。"},
    {question:"API Key 需要分享給 Koolo 管理員嗎？",answer:"不需要。不要透過郵件、聊天或截圖傳送 Key。"}
   ],cta:"前往 Koolo 的 Gemini 設定",target:"/settings",secondary:"先了解 AI 英文口說練習",secondaryTarget:"/guides/ai-english-speaking"
  },
  en:{
   title:"How to Get a Gemini API Key for Koolo Teacher Voice Practice | Koolo",
   description:"Set up a Gemini API key with Google AI Studio, verify it in Koolo Teacher, enable microphone permissions, and understand free tier and billing limits.",
   label:"GEMINI API KEY SETUP",headline:"Use Koolo's free allowance or optionally set up your own Gemini API key",
   intro:"Koolo offers daily free text and AI voice allowances without requiring an API key upfront. Sign in for additional allowance where available, or wait for the daily reset. Bringing your own Gemini API key is optional. Free allowances, supported models and billing requirements depend on your Google project and chosen model.",
   bullets:["Create the key through Google AI Studio, not an unofficial seller.","Verify it once in Koolo's shared settings page.","Never post the key in screenshots, chats or public code."],
   sections:[
    {heading:"Step 1: Create a key in Google AI Studio",paragraphs:["Sign in to Google AI Studio with your Google account. Select or create a project and generate a Gemini API key using the official setup flow.","Check the displayed quota and pricing before enabling billing, particularly for Gemini Live models. A free-tier option for one model does not guarantee free Live voice usage for every model."]},
    {heading:"Step 2: Verify the key in Koolo",paragraphs:["Open Koolo's shared Settings, paste your Gemini API key, and complete verification. Allow microphone access when prompted. If you hear no audio, inspect site permissions and your output device."]},
    {heading:"Step 3: Start talking safely",paragraphs:["Go to Koolo Teacher or Koolo Friends for live conversation. If you choose BYOK, use your own key and don't share it with other users. Monitor usage and costs in Google's tools."],sample:{label:"Official Google AI Studio",text:"https://aistudio.google.com/apikey",note:"Create keys through Google; verify them only in the Koolo settings page."}}
   ],
   faq:[
    {question:"Is Koolo Teacher free to use?",answer:"Koolo offers a daily free allowance, not unlimited usage. Check the site for current options. If you use your own key, Gemini API pricing and availability are controlled by Google."},
    {question:"Can I use the website without a Gemini key?",answer:"Yes. Read guides and use daily free text and voice allowances without bringing your own key. Check the site for current limits and sign-in options."},
    {question:"Should I send my API key to the Koolo team?",answer:"No. Never send your key by email, chat or screenshot."}
   ],cta:"Open Koolo Gemini Settings",target:"/settings",secondary:"Explore AI speaking practice",secondaryTarget:"/guides/ai-english-speaking"
  }
 }
};
export function getGuide(slug:string|undefined,locale:GuideLocale):GuideContent|null{
 if(!slug||!Object.hasOwn(guides,slug))return null;
 return guides[slug as GuideSlug][locale];
}
