import type {CourtLanguage,CourtRole,CourtText,CourtCase} from "./crazyCourtEngine";

export type CourtApproach={title:CourtText;example:CourtText};
export type CourtDossier={background:CourtText;dispute:CourtText;approaches:Record<CourtRole,[CourtApproach,CourtApproach,CourtApproach]>;questions:Record<CourtRole,[CourtText,CourtText,CourtText,CourtText]>};
const t=(zh:string,en:string):CourtText=>({zh,en});
const a=(titleZh:string,titleEn:string,exZh:string,exEn:string):CourtApproach=>({title:t(titleZh,titleEn),example:t(exZh,exEn)});
const dossiers:Record<string,CourtDossier>={
 pizza:{
  background:t("室友特地把最後一片披薩放進冰箱，打算隔天當早餐。被告深夜餓了，把披薩吃掉，說自己是為了避免浪費。","A roommate saved the last slice for breakfast. The defendant ate it overnight, claiming to prevent waste."),
  dispute:t("重點是：沒有取得同意，是否能用「避免浪費」作為理由？即使做錯，該如何補償？","The issue: can avoiding waste justify taking someone's food without permission, and what remedy is fair?"),
  approaches:{
   defense:[
    a("解釋動機","Explain intent","被告不是想傷害室友，只是錯估了食物的保存情況。","The defendant misjudged the food's condition, rather than intending harm."),
    a("承認錯誤，爭取輕判","Admit fault, ask for leniency","沒有先問確實不妥，但被告願意買一片新的賠償。","Not asking was wrong, but replacing the slice is a fair remedy."),
    a("討論損害程度","Discuss proportionality","吃掉披薩有錯，但值得怎樣的處罰？","Taking the slice was wrong, but what response is proportionate?")
   ],
   prosecution:[
    a("主張室友所有權","Argue ownership","便條紙說得很清楚，這塊披薩是室友留到明天的。","The note made clear that the roommate intended to keep the slice."),
    a("指出動機不等於同意","Question the excuse","就算想避免浪費，也應該先詢問擁有者。","Even to avoid waste, the defendant should have asked."),
    a("從信任切入","Focus on trust","損失的不只是一片披薩，也是室友彼此的信任。","It's not just a lost slice, but trust between roommates.")
   ]
  },
  questions:{
   defense:[t("你認為被告吃掉披薩的理由，哪一部分還值得法庭考慮？","Which part of the defendant's explanation deserves consideration?"),
    t("如果承認沒有先詢問，你會提出怎樣的合理補償？","If the defendant admits not asking, what remedy would be fair?"),
    t("室友的字條很明確，你想如何回應這項證據？","The note is clear. How would you respond to that evidence?"),
    t("你的最後一句話，最希望法官記住什麼？","What is the one thing you want the judge to remember?")],
   prosecution:[t("你要用哪一項事實證明這不是單純的誤會？","Which fact shows this was more than a misunderstanding?"),
    t("如果對方說是在避免浪費，你會怎麼反駁？","How would you challenge the waste-prevention excuse?"),
    t("除了披薩本身，室友受到什麼影響？","What was lost besides the slice itself?"),
    t("你認為怎樣的判決既公平又不過度？","What verdict would be fair without overreacting?")]
  }
 },
 alarm:{
  background:t("被告連續三天睡過頭，把責任推給每天早上七點準時響鈴的鬧鐘，甚至要求鬧鐘道歉。","After oversleeping three days in a row, the owner blames an alarm clock that apparently rang at seven each day."),
  dispute:t("該怪罪鬧鐘，還是沒按時起床的人？裝置紀錄和證人說法是否足夠？","Who bears responsibility: the clock or the sleeper? What do the log and witness prove?"),
  approaches:{
   defense:[a("檢查紀錄","Examine the log","響鈴紀錄顯示鬧鐘正常工作。","The alarm log shows the clock activated as expected."),
    a("指出人的責任","Personal responsibility","響鈴後選擇不起床，不能完全怪鬧鐘。","Not getting up after an alarm isn't necessarily the clock's fault."),
    a("證人支持","Use witness testimony","鄰居也聽到鈴聲，說明鬧鐘確實發出聲音。","A neighbor heard the alarm, supporting that it rang.")],
   prosecution:[a("質疑使用體驗","Question usability","即使有紀錄，使用者到底能不能聽見？","A log doesn't prove the sleeper could hear it."),
    a("追問設置","Review setup","勿擾模式是否可能影響提醒效果？","Could Do Not Disturb have affected how the alert was heard?"),
    a("提出改善方案","Ask for remedies","鬧鐘應該提供更強的提醒與重複確認。","The alarm could offer stronger reminders or a confirmation.")]
  },
  questions:{
   defense:[t("哪一項紀錄最能證明鬧鐘有正常工作？","Which record best supports that the alarm functioned?"),t("響了卻沒起床，責任應該由誰承擔？","Who bears responsibility if the alarm sounded?"),t("對方說沒聽見，你要怎麼回應？","How would you address the claim it wasn't heard?"),t("法官最應採納哪項證據？","Which evidence matters most?")],
   prosecution:[t("紀錄顯示鬧鐘有響，這對你的指控有什麼影響？","The log shows an alarm; how does that change your case?"),t("勿擾模式讓你有什麼疑問？","What question does Do Not Disturb raise?"),t("你能提出比「鬧鐘道歉」更合理的訴求嗎？","What would be a more reasonable remedy?"),t("你最希望法官釐清什麼？","What should the judge clarify?")]
  }
 },
 cat:{
  background:t("貓咪在會議開始前跳上鍵盤，主人因此錯過線上會議，氣得把愛貓告上法庭。","A cat occupied a keyboard before a meeting, and its owner missed the call and brought the cat to court."),
  dispute:t("是貓咪故意搗亂，還是主人本來就應該提前準備？","Was the cat at fault, or should the owner have prepared?"),
  approaches:{
   defense:[a("主人有選擇","Owner had options","主人可以把貓抱到旁邊的軟墊。","The owner could have moved the cat to its bed."),
    a("沒有故意的證據","No proof of intent","沒證據能證明貓知道那是工作用的鍵盤。","There is no proof the cat intended disruption."),
    a("準備不足","Lack of preparation","主人知道會議時間，應該早一點準備。","The meeting was scheduled; the owner had time to prepare.")],
   prosecution:[a("指出時間點","Highlight timing","貓咪在重要會議前占據了鍵盤。","The cat took the keyboard right before the call."),
    a("討論實際影響","Focus on impact","不管是否故意，主人確實錯過會議。","Whatever the intent, the missed meeting is real."),
    a("討論預防","Consider prevention","需要一個讓貓不再占鍵盤的辦法。","A practical way to keep the keyboard clear is needed.")]
  },
  questions:{
   defense:[t("為什麼不能直接認定貓咪有罪？","Why can't we assume the cat is guilty?"),t("旁邊的軟墊可以證明什麼？","What does the spare bed show?"),t("行事曆是否支持你的論點？","Does the calendar help your case?"),t("你會建議主人下次怎麼做？","What should the owner do next time?")],
   prosecution:[t("貓咪的行為確實造成什麼結果？","What was the actual impact?"),t("你能證明是故意的嗎？","Can you show intent?"),t("你希望法庭提出什麼改善方式？","What remedy makes sense?"),t("你最想對法官強調哪一點？","What is your final point to the judge?")]
  }
 }
};
function generatedDossier(court:CourtCase):CourtDossier{
 const defenseEvidence=court.evidence.find(e=>e.supports==="defense")||court.evidence[0];
 const prosecutionEvidence=court.evidence.find(e=>e.supports==="prosecution")||court.evidence[0];
 const approachesFor=(role:CourtRole):[CourtApproach,CourtApproach,CourtApproach]=>{
  const supporting=role==="defense"?defenseEvidence:prosecutionEvidence;
  const opening=court.claims[0][role],closing=court.claims[3][role];
  return [
   {title:t("先提出主要立場","Start with your position"),example:opening},
   {title:t("抓住這張證據","Use this evidence"),example:t(
    "我方特別想請法官注意「"+supporting.title.zh+"」："+supporting.detail.zh,
    "Please consider "+supporting.title.en+": "+supporting.detail.en
   )},
   {title:t("爭取合理的結果","Ask for a fair remedy"),example:closing}
  ];
 };
 const questionsFor=(role:CourtRole):[CourtText,CourtText,CourtText,CourtText]=>{
  const you=role==="defense"?"替被告":"為申訴者";
  const youEn=role==="defense"?"defend":"challenge";
  return [
   t("在「"+court.title.zh+"」中，你想先"+you+"說什麼？","In "+court.title.en+", what is your opening argument to "+youEn+" the accused?"),
   t("「"+court.evidence[0].title.zh+"」提到："+court.evidence[0].detail.zh+" 你怎麼看？","What do you make of "+court.evidence[0].title.en+"? "+court.evidence[0].detail.en),
   t("如果對方引用「"+court.evidence[1].title.zh+"」，你會如何反駁？","How would you respond if the other side cited "+court.evidence[1].title.en+"?"),
   t("看完這些證據，你希望法庭如何判決？","Based on the evidence, what verdict would be fair?")
  ];
 };
 return {
  background:t("案件卷宗記載："+court.description.zh+" 請從物證與說法判斷責任，別把想像當成已發生的事。","Case report: "+court.description.en+" Examine the evidence and distinguish speculation from facts."),
  dispute:t("這場爭議的關鍵是："+court.description.zh+" 雙方應如何分清責任與合理補救？",
   "The dispute is: "+court.description.en+" What would be fair responsibility and remedy?"),
  approaches:{defense:approachesFor("defense"),prosecution:approachesFor("prosecution")},
  questions:{defense:questionsFor("defense"),prosecution:questionsFor("prosecution")}
 };
}
export function courtDossier(court:CourtCase){return dossiers[court.id]||generatedDossier(court);}
export function courtRoleMission(court:CourtCase,role:CourtRole,language:CourtLanguage):string{
 const name=court.defendant[language];
 if(role==="defense")return language==="zh"
  ?"你代表被告「"+name+"」。目標：提出有利理由、挑戰指控，爭取無責或減輕處罰。"
  :"You represent the accused, "+name+". Challenge the accusation and seek an acquittal or a lighter remedy.";
 return language==="zh"
  ?"你代表提出指控的一方。目標：證明「"+name+"」應為這件事負責，爭取合理補償或改善。"
  :"You represent the complainant. Show why "+name+" should take responsibility and propose a fair remedy.";
}
/** These are rhetorical ideas, NOT newly discovered facts. Players can edit before submitting. */
export function courtRiffIdeas(court:CourtCase,role:CourtRole,language:CourtLanguage){
 const supporter=court.evidence.find(e=>e.supports===role)||court.evidence.find(e=>e.supports==="both")||court.evidence[0];
 const opponent=court.evidence.find(e=>e.supports!=="both"&&e.supports!==role)||court.evidence[0];
 return language==="zh"?[
  {title:"誇張比喻",text:"法官大人，這件事簡直是「"+court.title.zh+"」的宇宙級風暴！但說回證據，「"+supporter.title.zh+"」至少顯示："+supporter.detail.zh},
  {title:"反問對手",text:"等等，如果對方一直強調「"+opponent.title.zh+"」，那是不是也該解釋「"+supporter.title.zh+"」代表什麼？"},
  {title:"提出奇葩補救",text:"我提議雙方先訂一條超級明確的「"+court.title.zh+"」和平協議！畢竟我們要解決問題，不是把小事變成世界大戰。"}
 ]:[
  {title:"Dramatic metaphor",text:"Your Honor, "+court.title.en+" is a cosmic-scale crisis! But let's return to the actual evidence: "+supporter.detail.en},
  {title:"Challenge the other side",text:"If the other side relies on "+opponent.title.en+", shouldn't they also address "+supporter.title.en+"?"},
  {title:"Absurd compromise",text:"I propose a legendary peace treaty for "+court.title.en+"! We need a remedy, not a world war."}
 ];
}
export function courtQuestion(court:CourtCase,role:CourtRole,stage:number,language:CourtLanguage){
 return courtDossier(court).questions[role][Math.max(0,Math.min(3,stage))][language];
}
export function courtSuggestedLines(court:CourtCase,role:CourtRole,language:CourtLanguage){
 return courtDossier(court).approaches[role].map(item=>({title:item.title[language],text:item.example[language]}));
}
