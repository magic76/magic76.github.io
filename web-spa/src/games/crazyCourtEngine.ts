export type CourtLanguage="zh"|"en";
export type CourtRole="defense"|"prosecution";
export type CourtReason="unsupported"|"contradiction"|"irrelevant";
export type CourtText={zh:string;en:string};
export type CourtEvidence={id:string;icon:string;title:CourtText;detail:CourtText;supports:CourtRole|"both"};
export type CourtClaim={defense:CourtText;prosecution:CourtText;flaw:CourtReason|null};
export type CourtCase={
 id:string;title:CourtText;description:CourtText;defendant:CourtText;
 evidence:CourtEvidence[];claims:CourtClaim[];
};
export type CourtAction=
 |{kind:"statement";text:string}
 |{kind:"evidence";evidenceId:string}
 |{kind:"objection";reason:CourtReason}
 |{kind:"pass"};
export type CourtEvaluation={points:number;valid:boolean;label:CourtText;summary:CourtText;usedEvidenceId?:string};

const t=(zh:string,en:string):CourtText=>({zh,en});
export const courtReasons:{id:CourtReason;label:CourtText}[]=[
 {id:"unsupported",label:t("證據不足","No supporting evidence")},
 {id:"contradiction",label:t("前後矛盾","Contradiction")},
 {id:"irrelevant",label:t("與案件無關","Irrelevant statement")}
];
export const courtCases:CourtCase[]=[
 {
  id:"pizza",title:t("消失的最後一塊披薩","The Last Slice of Pizza"),
  description:t("室友指控有人偷吃冰箱裡最後一片披薩，被告卻說自己只是避免浪費。","A roommate accuses someone of taking the last slice; the defendant claims to have prevented food waste."),
  defendant:t("偷吃披薩的室友","The pizza-eating roommate"),
  evidence:[
   {id:"note",icon:"📝",title:t("冰箱便條","Fridge note"),detail:t("紙條寫著「這是我的披薩，請留到明天」。","The note says: 'My pizza. Please save it for tomorrow.'"),supports:"prosecution"},
   {id:"expiry",icon:"🕒",title:t("存放紀錄","Storage record"),detail:t("披薩已放在冰箱兩天，但沒有證明已經變質。","The pizza was refrigerated for two days, with no proof it had spoiled."),supports:"defense"},
   {id:"chat",icon:"💬",title:t("聊天截圖","Chat screenshot"),detail:t("室友前一天傳訊：「明天早餐留給我」。","The roommate wrote: 'Save it for my breakfast tomorrow.'"),supports:"prosecution"}
  ],
  claims:[
   {defense:t("未經同意拿走披薩，本身就是錯誤行為。","Taking the pizza without asking is wrong."),prosecution:t("沒有標示名字，怎麼能知道是誰的？","There was no name on the box; how could anyone know whose it was?"),flaw:null},
   {defense:t("我敢說，被告肯定每天都偷吃室友的食物！","I'm sure the defendant steals food every single day!"),prosecution:t("這塊披薩絕對已經壞掉，不吃就浪費了。","That pizza was definitely spoiled; eating it prevented waste."),flaw:"unsupported"},
   {defense:t("留下一張紙條就是法律，違反紙條等同犯下重罪！","A fridge note is the law; ignoring it is a serious crime!"),prosecution:t("就算有訊息，冰箱裡的食物都應該可以自由分享。","Even with a message, everything in the fridge ought to be communal."),flaw:"irrelevant"},
   {defense:t("請法庭相信這不是單純的小事，而是室友之間的信任。","This is about the trust between roommates."),prosecution:t("這只是一次誤會，沒有必要大動干戈。","This was a misunderstanding, not a major dispute."),flaw:null}
  ]
 },
 {
  id:"alarm",title:t("每天叫不醒的鬧鐘","The Alarm Clock on Trial"),
  description:t("被告連續三天睡過頭，宣稱鬧鐘沒有盡責，要求鬧鐘道歉。","After oversleeping three days in a row, someone demands an apology from their alarm clock."),
  defendant:t("無辜的鬧鐘","The innocent alarm clock"),
  evidence:[
   {id:"log",icon:"⏰",title:t("響鈴紀錄","Alarm log"),detail:t("手機紀錄顯示鬧鐘每日上午七點有正常響鈴。","The device log shows the alarm sounded at 7am each morning."),supports:"defense"},
   {id:"silent",icon:"🔕",title:t("靜音設定","Silent mode"),detail:t("手機曾啟用勿擾模式，但鬧鐘理應仍能響鈴。","Do Not Disturb was on, though alarms should still sound."),supports:"both"},
   {id:"witness",icon:"👂",title:t("鄰居證詞","Neighbor's testimony"),detail:t("鄰居表示有聽見鈴聲持續響了十分鐘。","A neighbor heard the alarm for ten minutes."),supports:"defense"}
  ],
  claims:[
   {defense:t("紀錄證明鬧鐘有工作，不能要求它負責。","The records show the clock did its job."),prosecution:t("連續三天遲到，鬧鐘一定有問題。","Three late mornings prove the alarm is faulty."),flaw:null},
   {defense:t("人類從來沒有辦法靠鬧鐘起床，這是常識。","Nobody ever wakes up to an alarm; everyone knows that."),prosecution:t("我有百分之百的把握，鬧鐘根本沒響。","I'm certain the alarm never rang at all."),flaw:"unsupported"},
   {defense:t("畢竟所有鬧鐘都長得很難看，問題一定在人。","Alarms look ugly anyway, so clearly it's the user's fault."),prosecution:t("鬧鐘太吵，聽到就心情不好，所以應該賠償。","The alarm is annoying, so it owes compensation."),flaw:"irrelevant"},
   {defense:t("請判決依據實際鈴聲紀錄，而不是情緒。","Decide on the alarm logs, not on frustration."),prosecution:t("請考慮使用者每天起床的痛苦。","Please consider the pain of getting up every day."),flaw:null}
  ]
 },
 {
  id:"cat",title:t("占領鍵盤的貓咪","The Cat Who Took Over the Keyboard"),
  description:t("一隻貓占住鍵盤，主人因此錯過視訊會議，決定告上法庭。","A cat sat on a keyboard, causing its owner to miss a video call."),
  defendant:t("被控占領鍵盤的貓","The accused cat"),
  evidence:[
   {id:"video",icon:"📷",title:t("監視影片","Security video"),detail:t("影片顯示貓在會議前十分鐘躺上鍵盤。","The cat lay on the keyboard ten minutes before the meeting."),supports:"prosecution"},
   {id:"bed",icon:"🛏️",title:t("備用睡墊","Spare pet bed"),detail:t("旁邊放著軟墊，主人也可以抱貓去睡墊。","A pet bed was nearby; the owner could have moved the cat."),supports:"defense"},
   {id:"calendar",icon:"📆",title:t("行事曆","Calendar"),detail:t("主人事先知道會議時間，卻沒有提前準備電腦。","The owner knew the meeting time but did not prepare the computer."),supports:"defense"}
  ],
  claims:[
   {defense:t("主人可以移動貓咪，沒必要遲到。","The owner could have moved the cat."),prosecution:t("貓咪明明知道鍵盤是用來工作的。","The cat clearly knew the keyboard was for work."),flaw:null},
   {defense:t("所有貓咪都不可能影響人類工作！","Cats can never interfere with human work!"),prosecution:t("牠一定是有計畫地想破壞這場會議。","The cat definitely planned to sabotage this meeting."),flaw:"unsupported"},
   {defense:t("貓咪太可愛了，根本不需要證據。","The cat is too cute to need evidence."),prosecution:t("貓咪每天睡那麼久，應該出來找工作。","The cat sleeps too much and should get a job."),flaw:"irrelevant"},
   {defense:t("就事論事，真正造成遲到的是缺乏準備。","The real issue is the owner's lack of preparation."),prosecution:t("鍵盤確實被占據，請法官判斷責任歸屬。","The keyboard was occupied; please determine responsibility."),flaw:null}
  ]
 }
];

/** Additional self-contained comedy case files. Every case has three verifiable exhibits,
 * four exchanges and balanced arguments for both player roles. */
type CourtPair=readonly [string,string];
type CourtExhibitSeed=readonly [string,string,CourtPair,CourtPair,CourtRole|"both"];
type CourtCaseSeed={
 id:string;title:CourtPair;description:CourtPair;defendant:CourtPair;
 evidence:readonly [CourtExhibitSeed,CourtExhibitSeed,CourtExhibitSeed];
 defense:readonly [CourtPair,CourtPair,CourtPair,CourtPair];
 prosecution:readonly [CourtPair,CourtPair,CourtPair,CourtPair];
};
const moreCaseSeeds:CourtCaseSeed[]=[
 {id:"remote",title:["遙控器獨裁者","The Remote Control Dictator"],
 description:["室友連續三晚霸占客廳遙控器，堅稱自己是家庭娛樂總監。","A roommate monopolized the living-room remote for three nights, calling themselves the entertainment director."],
 defendant:["霸占遙控器的室友","The remote-hogging roommate"],
 evidence:[
 ["schedule","📅",["輪流觀看表","Viewing schedule"],["冰箱貼著每人輪流選節目的時段表。","A posted schedule gives everyone a turn to pick a show."],"prosecution"],
 ["poll","📊",["投票結果","TV poll"],["三位室友中，有兩位同意昨晚看的節目。","Two of three roommates approved last night's show."],"defense"],
 ["battery","🔋",["電池紀錄","Battery receipt"],["遙控器的新電池由被告購買。","The defendant paid for replacement remote batteries."],"both"]],
 defense:[
 ["大家至少同意了昨晚播出的節目。","At least the others approved yesterday's show."],
 ["買電池的人當然是全家的娛樂董事長！","The person buying batteries must be the CEO of television!"],
 ["選節目也是一種藝術，不能用遙控器重量定罪。","Choosing shows is an art; the remote's weight cannot determine guilt."],
 ["共同規劃節目比處罰任何人更有效。","A fair schedule beats punishing anyone."]
 ],prosecution:[
 ["客廳是大家的，輪流表應該被尊重。","The shared room comes with a viewing schedule."],
 ["被告肯定是想建立遙控器帝國。","The defendant is clearly building a remote-control empire."],
 ["三晚的節目讓宇宙影視文化倒退十年！","These three nights set civilization back a decade!"],
 ["請要求被告按表交出遙控器。","Order the defendant to hand over the remote on schedule."]
 ]},
 {id:"umbrella",title:["借走不還的晴天雨傘","The Never-Returned Umbrella"],
 description:["朋友借走一把雨傘，一週後還說「反正最近都是晴天」，拒絕歸還。","A friend borrowed an umbrella and still hasn't returned it a week later, saying the weather has been sunny."],
 defendant:["拖著不還雨傘的朋友","The umbrella borrower"],
 evidence:[
 ["message","💬",["借用訊息","Borrowing message"],["被告明確說「借兩天就還」。","The borrower said: 'I'll return it in two days.'"],"prosecution"],
 ["photo","📷",["雨傘照片","Umbrella photo"],["照片顯示雨傘完好，沒有受損。","A photo shows the umbrella is undamaged."],"defense"],
 ["weather","☀️",["天氣紀錄","Weather report"],["這週確實連續五天沒下雨。","It has been dry for five consecutive days."],"both"]],
 defense:[
 ["雨傘沒有損壞，適合先談歸還而非重罰。","The umbrella is intact; a return is better than a harsh penalty."],
 ["晴天裡的雨傘也許正在享受帶薪休假。","Maybe umbrellas deserve paid leave on sunny days."],
 ["不能把每一場晴天都視為刑事證據。","Every sunny day cannot be treated as criminal evidence."],
 ["承諾今天歸還並致歉，比爭輸贏重要。","A prompt return and apology are what matter."]
 ],prosecution:[
 ["借兩天和借一週完全不同。","Two days is not a week."],
 ["難道要等到下一個颱風才准物歸原主？","Must the owner wait for the next typhoon?"],
 ["全世界的雨傘都在為這種行為哭泣。","Every umbrella in the world is weeping over this."],
 ["請要求立即歸還，並尊重借用期限。","Order its return and enforce agreed deadlines."]
 ]},
 {id:"bubble-tea",title:["珍奶無糖風波","The Bubble Tea Sugar Scandal"],
 description:["朋友代買珍珠奶茶，卻把半糖買成無糖；被指控毀掉整個下午的幸福感。","A friend bought bubble tea with no sugar instead of half sugar and is accused of ruining an afternoon."],
 defendant:["買錯甜度的朋友","The friend who ordered the wrong sweetness"],
 evidence:[
 ["order","🧾",["訂購訊息","Order text"],["代買訊息明確寫著「半糖去冰」。","The order text clearly said 'half sugar, no ice'."],"prosecution"],
 ["receipt","🥤",["飲料收據","Tea receipt"],["收據寫著「無糖去冰」，但杯子還是完整送到。","The receipt says 'no sugar, no ice'; the drink arrived intact."],"both"],
 ["refund","💰",["退款紀錄","Refund offer"],["被告主動提出補買一杯新的。","The friend offered to buy a replacement."],"defense"]],
 defense:[
 ["被告願意補買，至少有補救的誠意。","The defendant offered to make it right."],
 ["無糖可能是一場意外的健康實驗。","Perhaps it was an accidental health experiment."],
 ["人類的幸福不能完全交給砂糖定義。","Happiness cannot be measured solely in sugar."],
 ["以重新購買解決，不要把友誼一起丟進封口機。","Replace the drink, not the friendship."]
 ],prosecution:[
 ["訊息寫半糖，實際卻是無糖。","The request was for half sugar, not no sugar."],
 ["把半糖變無糖，連珍珠都可能感到背叛。","Even the pearls feel betrayed."],
 ["喝無糖的人，必然失去整個人生的顏色。","Anyone drinking unsweetened tea loses all joy forever."],
 ["請要求補買正確甜度，並好好道歉。","Ask for a correctly made replacement and an apology."]
 ]},
 {id:"karaoke",title:["卡拉 OK 高音災難","The Karaoke High-Note Disaster"],
 description:["朋友在包廂連唱七首歌，又在最後一首挑戰超高音，被控霸占麥克風。","A friend sang seven karaoke songs and attempted a dramatic high note, accused of hogging the microphone."],
 defendant:["連唱七首的麥霸","The seven-song karaoke hog"],
 evidence:[
 ["queue","🎵",["點歌清單","Song queue"],["清單顯示被告連續唱了七首。","The queue shows seven consecutive songs from the defendant."],"prosecution"],
 ["cheers","👏",["現場掌聲","Audience applause"],["有兩位朋友在歌曲結束時鼓掌。","Two friends applauded after one song."],"defense"],
 ["mic","🎤",["麥克風數量","Microphone count"],["包廂有兩支麥克風，一支當時沒人拿。","The room had two microphones; one was unused."],"both"]],
 defense:[
 ["另一支麥克風沒人使用，還可以安排合唱。","A spare mic was available for a duet."],
 ["高音雖然失控，熱情卻完全合法。","The high note may have escaped, but enthusiasm is lawful."],
 ["唱歌用的不是音準，而是靈魂的彈跳力。","Singing is measured in soul-bounce, not pitch."],
 ["下一輪改成每人輪唱，讓大家都參與。","Rotate singers so everyone gets a turn."]
 ],prosecution:[
 ["七首連唱破壞了大家公平唱歌的機會。","Seven songs in a row deprived others of turns."],
 ["每個人都應該取得麥克風使用權。","Everyone deserves a microphone turn."],
 ["那個高音可能把月亮都唱歪了。","That high note nearly knocked the moon sideways."],
 ["請制定輪唱規則，而不是禁止唱歌。","Require a fair song rotation, not a singing ban."]
 ]},
 {id:"elevator",title:["電梯門的最後守護者","The Elevator Door Guardian"],
 description:["被告為等遲到的朋友，連續按住電梯開門鍵四十秒，其他乘客開始不滿。","Someone held an elevator door for forty seconds waiting for a late friend, irritating other passengers."],
 defendant:["按住開門鍵的乘客","The passenger holding the door"],
 evidence:[
 ["camera","📹",["電梯監視器","Elevator camera"],["錄影顯示電梯門被按住約四十秒。","Camera footage shows the door held for about forty seconds."],"prosecution"],
 ["call","📱",["朋友來電","Friend's call"],["朋友表示自己就在同一樓層走廊。","The late friend said they were in the same-floor hallway."],"defense"],
 ["sign","🪧",["電梯告示","Elevator notice"],["告示提醒乘客避免長時間擋門。","A sign asks riders not to hold the door for long."],"both"]],
 defense:[
 ["等待的是同層的朋友，不是遠在另一棟樓的人。","The friend was nearby, not in another building."],
 ["四十秒也許是友情最後的考驗。","Perhaps forty seconds was friendship's final exam."],
 ["如果電梯有心，可能也想交一個朋友。","Maybe even elevators wish for company."],
 ["下次應讓朋友搭下一班，避免妨礙他人。","Next time, the friend can take the next elevator."]
 ],prosecution:[
 ["別人的時間同樣重要，不能無限等待。","Other passengers' time matters."],
 ["開門鍵不是私人時間暫停器。","The door button isn't a personal time-freeze device."],
 ["如果每人都等四十秒，電梯會被迫退休。","If everyone waits forty seconds, the elevator will retire."],
 ["請提醒被告遵守共同搭乘禮儀。","Ask the defendant to respect shared elevator etiquette."]
 ]},
 {id:"charger",title:["失蹤的手機充電線","The Vanishing Charging Cable"],
 description:["同事借了一條充電線兩週都沒還，還說它已經和自己的手機建立深厚感情。","A coworker borrowed a charging cable for two weeks and claims it has bonded emotionally with their phone."],
 defendant:["遲遲不還線的同事","The cable borrower"],
 evidence:[
 ["chat","📩",["借線對話","Borrowing chat"],["訊息顯示只約好借用一個下午。","The message specified borrowing for one afternoon."],"prosecution"],
 ["condition","🔌",["線材狀態","Cable condition"],["充電線目前仍能正常使用。","The cable still functions."],"defense"],
 ["loaner","🔋",["替代充電器","Spare adapter"],["公司公共區域有可借用的充電器。","A shared charger is available at work."],"both"]],
 defense:[
 ["線材沒有損壞，現在歸還就能解決大部分問題。","The cable is undamaged and can be returned."],
 ["線和手機有感情，也不能申請戶籍。","Emotional bonds do not grant cables citizenship."],
 ["USB 接頭有時只是不知道怎麼說再見。","Maybe the USB plug just hates goodbyes."],
 ["今天歸還，再提出借用規則。","Return it today and establish better borrowing rules."]
 ],prosecution:[
 ["借一個下午不是借兩週。","An afternoon is not two weeks."],
 ["再深的感情，也不能變成永久所有權。","Feelings do not transfer ownership."],
 ["若充電線能結婚，誰來付婚宴的電費？","If cables marry phones, who pays the electric bill?"],
 ["請判被告立即歸還原物。","Order its immediate return."]
 ]},
 {id:"laundry",title:["洗衣機霸佔事件","The Laundry Machine Sit-In"],
 description:["住戶洗完衣服後，整整兩小時沒把衣服拿走，讓其他人無法使用共用洗衣機。","A resident left finished laundry in the shared washer for two hours, blocking everyone else."],
 defendant:["忘記取衣服的住戶","The forgetful resident"],
 evidence:[
 ["timer","⏲️",["機器紀錄","Machine log"],["洗衣程序在下午三點就結束。","The washer cycle finished at 3 p.m."],"prosecution"],
 ["call","📞",["漏接電話","Missed call"],["被告正在工作，漏接了管理員的提醒電話。","The resident missed a reminder call while working."],"defense"],
 ["rules","📋",["使用守則","Laundry room rules"],["守則要求完成後三十分鐘內取走衣物。","The rules require pickup within thirty minutes."],"both"]],
 defense:[
 ["忘記拿走不是故意阻撓，應先考慮警告。","Forgetting is not the same as intentional obstruction."],
 ["衣服也許沉浸在乾淨的勝利感裡。","Maybe the clothes were celebrating being clean."],
 ["襪子分居還沒辦好，怎麼能逼它們離開？","The socks haven't even finished their separation paperwork."],
 ["設提醒鬧鐘並向等待的人道歉。","Set reminders and apologize to those waiting."]
 ],prosecution:[
 ["已超過守則規定的時間很多。","The delay far exceeded the posted limit."],
 ["共用設備不該成為私人衣櫥。","A shared washer is not a private closet."],
 ["兩小時足夠讓襪子成立自治政府。","Two hours is enough for socks to form a government."],
 ["請求改善提醒與取衣規則。","Require timely pickup and reminders."]
 ]},
 {id:"plant",title:["辦公桌上的盆栽侵略","The Office Plant Invasion"],
 description:["同事的盆栽越長越大，葉子伸到隔壁座位，讓另一位同事抱怨工作空間被侵佔。","A coworker's ever-growing plant extended onto a neighboring desk, causing a workspace dispute."],
 defendant:["種植巨大盆栽的同事","The plant-owning coworker"],
 evidence:[
 ["photo","🌿",["桌面照片","Desk photo"],["葉片確實越過兩個座位之間的隔板。","Leaves extend past the divider between desks."],"prosecution"],
 ["air","🌤️",["照明位置","Sunlight location"],["盆栽放在唯一接近窗戶的位置。","The plant sits in the only spot near sunlight."],"defense"],
 ["measure","📏",["桌面測量","Desk measurement"],["葉子占據隔壁桌面約十五公分。","Leaves overlap about fifteen centimeters of the other desk."],"both"]],
 defense:[
 ["適度修剪就可以兼顧植物和鄰桌。","Pruning can protect both the plant and the neighbor."],
 ["盆栽也只是追求職涯向上發展。","The plant is merely climbing the corporate ladder."],
 ["葉子越界不等於宣布成立綠色帝國。","Crossing leaves do not establish a green empire."],
 ["願意移盆並修剪，維護同事關係。","Move and trim the plant to keep peace."]
 ],prosecution:[
 ["葉片已經實際占用別人的工作區。","The leaves occupy another person's workspace."],
 ["植物沒有預約別人的桌面使用權。","Plants do not have booked desk privileges."],
 ["再放任兩週，公司可能被熱帶雨林併吞。","In two weeks the office may become a rainforest."],
 ["請要求修剪，讓座位恢復正常。","Ask for pruning so desks remain usable."]
 ]},
 {id:"meeting",title:["會議中的兔耳濾鏡","The Bunny-Ear Meeting Filter"],
 description:["線上工作會議中，被告忘記關掉兔耳朵濾鏡，還以為大家只是格外專注地看自己。","An employee forgot to disable a bunny-ear filter during a work call and thought everyone was simply attentive."],
 defendant:["忘記關濾鏡的同事","The filtered coworker"],
 evidence:[
 ["screen","🖥️",["畫面截圖","Screen capture"],["畫面清楚顯示被告頭上有兔耳朵。","The screenshot shows bunny ears on the speaker."],"prosecution"],
 ["minutes","📒",["會議紀錄","Meeting notes"],["會議仍完成了預定議程。","The meeting finished its agenda."],"defense"],
 ["notice","🔔",["設定提醒","App notice"],["程式介面有濾鏡啟用提示，但不太明顯。","The app showed a small filter-enabled indicator."],"both"]],
 defense:[
 ["議程照樣完成，沒有影響核心工作。","The agenda was completed despite the filter."],
 ["兔耳只是職場創意的一種具象化。","The bunny ears express workplace creativity."],
 ["兔子進不了會議室，卻先進了視訊畫面。","The rabbit couldn't enter the office, so it entered the call."],
 ["未來開會前檢查鏡頭設定即可。","Check video settings before future meetings."]
 ],prosecution:[
 ["工作場合需要基本專業，應事先檢查設備。","Basic professionalism requires checking video settings."],
 ["兔耳雖無害，但不代表每場會議都適合。","Harmless ears aren't appropriate in every meeting."],
 ["這不是復活節，會議也不是動物選秀。","This is a meeting, not an animal talent show."],
 ["請求在重要會議前先檢查濾鏡。","Require a quick filter check before major calls."]
 ]},
 {id:"robot",title:["掃地機器人的襪子收藏","The Robot Vacuum Sock Collection"],
 description:["掃地機器人連續捲走三隻襪子，主人怒控它蓄意建立自己的襪子博物館。","A robot vacuum swallowed three socks and is accused of building a secret sock museum."],
 defendant:["捲走襪子的掃地機器人","The sock-swallowing robot"],
 evidence:[
 ["log","🤖",["清掃紀錄","Cleaning log"],["機器人三次都依排程啟動清掃。","The robot started each cleaning session as scheduled."],"defense"],
 ["photo","🧦",["失蹤襪子","Recovered socks"],["三隻襪子都在機器集塵盒旁找到。","Three socks were found near the robot's dust compartment."],"prosecution"],
 ["manual","📖",["使用說明","User manual"],["說明書要求掃地前清除地上的小物件。","The manual says small objects should be removed before cleaning."],"both"]],
 defense:[
 ["按排程工作的機器不能自動被認為有惡意。","A robot following its schedule isn't necessarily malicious."],
 ["它只是希望襪子也有機會參加環島旅行。","It wanted socks to enjoy a tour of the house."],
 ["掃地機器人沒有收藏展覽的門票收入。","The robot earns no ticket sales from its collection."],
 ["請主人先整理地板、再檢查機器。","Clear the floor and inspect the robot."]
 ],prosecution:[
 ["三隻襪子確實被捲走，使用者有損失。","The robot did swallow three socks."],
 ["襪子博物館從未取得合法營業執照。","That sock museum has no operating license."],
 ["機器人沒有腳，卻占有最多襪子，十分可疑。","A footless robot owning the most socks is suspicious."],
 ["請求改善避障並要求主人整理。","Improve obstacle avoidance and keep the floor clear."]
 ]},
 {id:"queue",title:["排隊位置保衛戰","The Queue Spot Dispute"],
 description:["有人在排隊時用購物籃佔位離開十分鐘，回來後堅持自己仍是隊伍中的一員。","A shopper left a basket to hold a queue spot for ten minutes, then insisted it was still their place."],
 defendant:["用購物籃佔位的顧客","The queue-holding shopper"],
 evidence:[
 ["camera","🎥",["現場影像","Queue footage"],["影像顯示顧客離開隊伍十分鐘。","Footage shows the shopper gone for ten minutes."],"prosecution"],
 ["basket","🧺",["購物籃內容","Basket contents"],["購物籃一直留在原地，商品沒有被移動。","The basket stayed in place and its items were untouched."],"defense"],
 ["policy","🪧",["店內公告","Store notice"],["店家沒有明文規定離隊後是否可保留位置。","No posted policy specifies whether leaving forfeits a spot."],"both"]],
 defense:[
 ["店家沒有明確規則，應先好好協調。","Without a clear policy, a polite discussion is fair."],
 ["購物籃的排隊意志比人類還堅定。","The basket queued with more dedication than a human."],
 ["如果籃子會說話，它會要求排隊津貼。","If the basket could speak, it would demand queue pay."],
 ["讓店家制定清楚規則，避免再次爭議。","Ask the store to clarify its queue policy."]
 ],prosecution:[
 ["離開十分鐘讓後面的人一直等待。","Leaving for ten minutes affected the people behind."],
 ["隊伍排的是人，不是購物籃。","Queues are for people, not baskets."],
 ["照這個邏輯，放一顆馬鈴薯也能排到明天。","By this logic, a potato could queue until tomorrow."],
 ["請依現場公平原則安排重新排隊。","Use a fair queue order for everyone."]
 ]},
 {id:"thermostat",title:["冷氣遙控器溫度戰爭","The Air-Con Temperature War"],
 description:["共用辦公室有人把冷氣調到十九度，其他同事穿著外套開會，雙方互控不尊重彼此。","Someone set the office AC to nineteen degrees; coworkers wore jackets to meetings and argued over comfort."],
 defendant:["把冷氣調到十九度的同事","The nineteen-degree AC operator"],
 evidence:[
 ["screen","❄️",["溫控顯示","Thermostat display"],["面板顯示溫度設定為十九度。","The thermostat shows nineteen degrees."],"prosecution"],
 ["report","🌡️",["室內測量","Room measurement"],["靠近窗邊的座位日照較強，體感較熱。","Window-side seats receive more sun and feel warmer."],"defense"],
 ["survey","🗳️",["同事投票","Office vote"],["六名同事中，四位希望調高溫度。","Four of six coworkers want a warmer setting."],"both"]],
 defense:[
 ["靠窗座位確實比較熱，需求有合理性。","Window-side seats really are warmer."],
 ["被告只是想保護每台筆電不變成烤箱。","The defendant wanted laptops to avoid becoming ovens."],
 ["冷氣並沒有資格成為公司唯一的人事主管。","The AC shouldn't be the only HR director."],
 ["安排區域風扇與共同溫控規則。","Use fans and agree on a shared temperature."]
 ],prosecution:[
 ["多數同事希望調高溫度，應予尊重。","Most coworkers asked for a warmer temperature."],
 ["大家上班不是為了體驗北極探險。","Coworkers did not sign up for Arctic exploration."],
 ["繼續下去，辦公室可能要聘請企鵝保全。","Soon the office will need penguin security guards."],
 ["請先協商共同可接受的溫度。","Negotiate a setting everyone can tolerate."]
 ]}
];
const expandCourtSeed=(source:CourtCaseSeed):CourtCase=>({
 id:source.id,title:t(...source.title),description:t(...source.description),defendant:t(...source.defendant),
 evidence:source.evidence.map(([id,icon,title,detail,supports])=>({id,icon,title:t(...title),detail:t(...detail),supports})),
 claims:source.defense.map((line,i)=>({
  defense:t(...line),prosecution:t(...source.prosecution[i]),
  flaw:i===1?"unsupported":i===2?"irrelevant":null
 }))
});
courtCases.push(...moreCaseSeeds.map(expandCourtSeed));

export const courtPhases:[CourtText,CourtText,CourtText,CourtText]=[
 t("開庭陳述","Opening"),t("出示證據","Evidence"),t("交叉辯論","Debate"),t("最終陳詞","Closing")
];
export function evaluateCourtAction(
 court:CourtCase,role:CourtRole,turn:number,action:CourtAction,usedIds:readonly string[],objectionsLeft:number
):CourtEvaluation{
 if(turn<0||turn>=court.claims.length)return {points:0,valid:false,label:t("回合已結束","Round ended"),summary:t("請開始下一局。","Start another round.")};
 if(action.kind==="statement"){
  const value=action.text.trim();
  if(value.length<3)return {points:0,valid:false,label:t("發言太短","Statement too short"),summary:t("請說明你的論點。","Explain your argument first.")};
  return {points:1,valid:true,label:t("完成陳述 +1","Statement +1"),summary:t("法庭已記錄你的陳述。","The court recorded your statement.")};
 }
 if(action.kind==="pass")return {points:0,valid:true,label:t("略過發言","Turn passed"),summary:t("法官請對方繼續。","The judge yields the floor.")};
 if(action.kind==="evidence"){
  const evidence=court.evidence.find(item=>item.id===action.evidenceId);
  if(!evidence||usedIds.includes(action.evidenceId))return {points:0,valid:false,label:t("證據不可用","Evidence unavailable"),summary:t("這張證據已提交或不存在。","This evidence has already been used or doesn't exist.")};
  const points=evidence.supports===role?3:evidence.supports==="both"?2:0;
  return {points,valid:true,usedEvidenceId:evidence.id,label:t(points?"提交證據 +"+points:"證據無助於本方","Evidence "+(points?"+"+points:"does not support your side")),
   summary:t(points?"法官採納證據，認為它有助於你的主張。":"法官採納物證，但它沒有直接支持你的立場。",
             points?"Evidence admitted and relevant to your position.":"Evidence admitted, but it doesn't directly support your side.")};
 }
 if(objectionsLeft<=0)return {points:0,valid:false,label:t("異議次數已用完","No objections left"),summary:t("不能再提出異議。","No objections remain.")};
 const accepted=court.claims[turn].flaw===action.reason;
 return {points:accepted?3:-1,valid:true,label:t(accepted?"異議成立 +3":"異議駁回 −1",accepted?"Objection sustained +3":"Objection overruled −1"),
  summary:t(accepted?"法官要求對方撤回缺乏根據的說法。":"法官認為目前沒有足夠理由支持這項異議。",
            accepted?"The judge asks opposing counsel to withdraw the claim.":"The judge finds this objection unsupported.")};
}
export function courtVerdict(score:number):"win"|"lose"{
 return score>=5?"win":"lose";
}
