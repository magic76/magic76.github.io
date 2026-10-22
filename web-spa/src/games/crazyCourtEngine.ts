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
