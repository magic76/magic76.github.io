import"./fortuneBaZiFree.css";
import{useTranslation}from"react-i18next";
import{buildFortuneIdentity}from"./identity";
export function FortuneBaZiFreeSummary({result}:{result:any}){
 const{t,i18n}=useTranslation("fortune");
 const zh=/^zh(?:-|$)/i.test(i18n.resolvedLanguage||i18n.language);
 const identity=buildFortuneIdentity("bazi",result,i18n.resolvedLanguage||i18n.language);
 const words=(z:string,e:string)=>zh?z:e;
 const career=result?.careerProfile||{},wealth=result?.wealthProfile||{};
 const number=(x:unknown)=>typeof x==="number"&&Number.isFinite(x)?x:0;
 const resources=number(career.resourceCount),output=number(career.outputCount),officer=number(career.officerCount);
 const careerText=resources>=Math.max(output,officer)?words("你可能擅長先弄懂原理再開始行動；試著把準備時間留一部分給實作。","You may prefer learning the principles before acting. Leave some time to test ideas in practice."):output>officer?words("你可能更喜歡自己找方法解決問題；試著把想法整理成可完成的小步驟。","You may enjoy finding your own approach. Try turning ideas into achievable steps."):words("責任與目標清楚時，你可能更容易投入；也要記得留出休息空間。","Clear responsibilities may help you focus. Remember to leave room for rest.");
 const wealthText=number(wealth.directWealthCount)>number(wealth.indirectWealthCount)?words("命盤中的正財線索較明顯，可以從穩定累積與規劃資源的角度反思自己的習慣。","Your chart emphasizes direct-wealth symbolism. Reflect on steady planning and resource habits."):words("命盤中的財星是理解資源運用的線索，不代表實際收入；可以檢視自己的儲蓄與支出選擇。","Wealth symbolism is a reflection prompt, not a prediction of income. Review your saving and spending choices.");
 const loveText=words("在人際關係裡，試著說清楚自己的期待，也留空間理解對方的節奏。","In relationships, try stating your expectations while making space for the other person's pace.");
 const cycleText=result?.currentLuckPillar?.ganZhi?words("你目前的大運為 "+result.currentLuckPillar.ganZhi+"；這是傳統命理的階段標記，不代表特定事件一定發生。","Your current luck cycle is "+result.currentLuckPillar.ganZhi+". It marks a traditional phase, not a certain event."):words("人生階段可以作為整理當下目標的提醒，不是對未來的保證。","Life stages can prompt reflection on current goals, not guarantee future outcomes.");
 const titles:Record<string,[string,string]>={personality:["性格與天賦","Personality and strengths"],career:["事業與職涯","Career and work"],wealth:["財富與資源","Wealth and resources"],relationships:["感情與人際","Relationships"],currentCycle:["目前人生階段","Current life phase"]};
 const items=[
  {id:"personality",text:identity?.behavior||words("你可以從自己的選擇方式探索性格特質。","Explore your personality through how you make decisions.")},
  {id:"career",text:careerText},{id:"wealth",text:wealthText},{id:"relationships",text:loveText},{id:"currentCycle",text:cycleText}
 ];
 return <section className="fortune-bazi-free" id="fortune-reading-report" tabIndex={-1} aria-label={t("reading.reportTitle")}>
  <header><span className="kicker">KOOLO FORTUNE · FREE</span><h3>{t("reading.reportTitle")}</h3><p>{words("免費看懂命格與生活主題；深入分析正在規劃中。","Explore your archetype and life themes for free. Deeper analysis is in development.")}</p></header>
  <div className="fortune-bazi-pillars" aria-label={words("四柱","Four pillars")}>{[result?.yearPillar,result?.monthPillar,result?.dayPillar,result?.timePillar].filter(Boolean).map((value:string,i:number)=><div key={i}><small>{[words("年","Year"),words("月","Month"),words("日","Day"),words("時","Hour")][i]}</small><strong>{value}</strong></div>)}</div>
  {identity&&<div className="fortune-bazi-identity-insight"><strong>{words("最像你的地方","A strength to explore")}</strong><p>{identity.behavior}</p><strong>{words("值得留意的另一面","Another side to consider")}</strong><p>{identity.tension}</p></div>}
  <div className="fortune-bazi-free-grid">{items.map(item=><article key={item.id} className="fortune-bazi-free-topic"><h4>{words(...titles[item.id])}</h4><p>{item.text}</p></article>)}</div>
  <small>{t("reading.disclaimer")}</small>
 </section>;
}
