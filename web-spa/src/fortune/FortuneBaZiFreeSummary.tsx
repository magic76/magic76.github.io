import "./fortuneBaZiFree.css";
import {useTranslation} from "react-i18next";
import {buildFortuneIdentity} from "./identity";

const ELEMENTS=["木","火","土","金","水"] as const;
const MEANING:Record<string,[string,string]>={
 木:["成長、探索與規劃","Growth, exploration and planning"],
 火:["表達、熱情與連結","Expression, enthusiasm and connection"],
 土:["穩定、承接與整合","Stability, support and integration"],
 金:["原則、判斷與整理","Principles, decisions and structure"],
 水:["觀察、彈性與思考","Observation, flexibility and reflection"]
};
const num=(v:unknown)=>typeof v==="number"&&Number.isFinite(v)?Math.max(0,v):0;
export function FortuneBaZiFreeSummary({result}:{result:any}){
 const {t,i18n}=useTranslation("fortune");
 const zh=/^zh(?:-|$)/i.test(i18n.resolvedLanguage||i18n.language);
 const words=(z:string,e:string)=>zh?z:e;
 const identity=buildFortuneIdentity("bazi",result,i18n.resolvedLanguage||i18n.language);
 const career=result?.careerProfile||{},wealth=result?.wealthProfile||{},relation=result?.relationshipProfile||{};
 const visible=result?.visibleFiveElements||{};
 const values=ELEMENTS.map(name=>({name,count:num(visible[name])}));
 const total=values.reduce((sum,item)=>sum+item.count,0);
 const strongest=[...values].sort((a,b)=>b.count-a.count)[0];
 const least=[...values].sort((a,b)=>a.count-b.count)[0];
 const resources=num(career.resourceCount),output=num(career.outputCount),officer=num(career.officerCount);
 const dominant=resources>=output&&resources>=officer?"resource":output>=officer?"output":"officer";
 const careerCopy=dominant==="resource"
  ?words("印星線索較突出，傳統上連結學習、整理知識與獲得支援。可以觀察自己是否擅長研究、準備與建立方法；也留意別讓準備取代行動。","Resource symbols stand out, traditionally linked to learning and support. Explore your research strengths while making room for action.")
  :dominant==="output"
  ?words("食傷線索較突出，傳統上連結創作、表達與成果輸出。可以試著把想法變成作品，也留意如何與團隊協調。","Output symbols stand out, traditionally linked to expression and making things. Turn ideas into tangible work and consider collaboration.")
  :words("官殺線索較突出，傳統上連結責任、規則與挑戰。可以觀察自己在目標明確時的表現，同時練習設定界線。","Authority symbols stand out, traditionally linked to responsibility and challenges. Reflect on clear goals and healthy boundaries.");
 const direct=num(wealth.directWealthCount),indirect=num(wealth.indirectWealthCount);
 const wealthCopy=direct>indirect
  ?words("正財線索比偏財多，傳統上偏向規劃與穩定管理資源。試著盤點自己如何安排預算；這不代表收入一定穩定。","Direct-wealth symbols are more prominent, associated with steady resource planning, not guaranteed income.")
  :indirect>direct
  ?words("偏財線索比正財多，傳統上連結機會與彈性資源。可以反思如何評估新機會，同時建立風險界線；不代表投資會獲利。","Indirect-wealth symbols are more prominent, associated with flexible opportunities, not investment returns.")
  :words("正財與偏財線索相近，適合從穩定規劃與彈性嘗試兩方面檢視資源使用。財星不是實際財務預測。","Direct and indirect wealth symbols are balanced. Reflect on both planning and flexibility; these are not financial forecasts.");
 const spouse=String(relation.spousePalace||"");
 const partner=num(relation.partnerGodCount);
 const relationshipCopy=spouse
  ?words("你的日支（傳統稱配偶宮）是「"+spouse+"」，相關十神為「"+(relation.spousePalaceTenGods||[]).join("、")+"」。"+(partner>0?"命盤也出現傳統伴侶星線索，可用來反思親密關係中的期待與分工。":"伴侶星線索較少，不代表感情運差；可以從溝通需求與界線開始反思。"),"Your day branch (relationship palace) is "+spouse+". "+(partner>0?"Partner symbols also appear in this chart.":"Fewer partner symbols do not imply poor relationships.")+" Use these symbols to reflect on expectations and communication.")
  :words("關係分析需要日支資料；先從自己的溝通習慣與期待開始整理。","Relationship details require the day branch. Start with your communication habits.");
 const cycle=result?.currentLuckPillar;
 const cycleCopy=cycle?.ganZhi
  ?words("目前大運為「"+cycle.ganZhi+"」"+(cycle.startYear&&cycle.endYear?"（"+cycle.startYear+"–"+cycle.endYear+"）":"")+"。大運是傳統十年階段的符號，不是事件保證；可以對照這段時間的學習、工作與關係重心。","Your current luck cycle is "+cycle.ganZhi+(cycle.startYear&&cycle.endYear?" ("+cycle.startYear+"–"+cycle.endYear+")":"")+". It is a traditional phase marker, not an event prediction.")
  :words("目前沒有可用的大運資料；不以缺失資料推測未來。","No current luck cycle data is available; no prediction is inferred.");
 const topics=[
  {id:"personality",title:words("性格與天賦","Personality and strengths"),evidence:words("日主："+(result?.dayMaster||"—")+" · "+(result?.dayMasterStrength||"—"),"Day master: "+(result?.dayMaster||"—")+" · "+(result?.dayMasterStrength||"—")),body:identity?.behavior||words("從日主觀察自己的行動習慣。","Reflect on your day-master archetype."),tip:identity?.tension||""},
  {id:"career",title:words("事業與職涯","Career and work"),evidence:words("印星 "+resources+" · 食傷 "+output+" · 官殺 "+officer,"Resources "+resources+" · Output "+output+" · Authority "+officer),body:careerCopy},
  {id:"wealth",title:words("財富與資源","Wealth and resources"),evidence:words("正財 "+direct+" · 偏財 "+indirect,"Direct "+direct+" · Indirect "+indirect),body:wealthCopy},
  {id:"relationships",title:words("感情與人際","Relationships"),evidence:words("配偶宮："+(spouse||"—")+" · 伴侶星 "+partner,"Relationship palace: "+(spouse||"—")+" · Partner symbols "+partner),body:relationshipCopy},
  {id:"currentCycle",title:words("目前人生階段","Current life phase"),evidence:words("大運："+(cycle?.ganZhi||"—"),"Luck cycle: "+(cycle?.ganZhi||"—")),body:cycleCopy}
 ];
 return <section className="fortune-bazi-free" id="fortune-reading-report" tabIndex={-1} aria-label={t("reading.reportTitle")}>
  <header><span className="kicker">KOOLO FORTUNE · FREE</span><h3>{t("reading.reportTitle")}</h3><p>{words("從命盤資料看五行、生活主題與人生階段。免費完整閱讀，不需 API Key。","Explore elements, life themes and phases for free. No API key required.")}</p></header>
  <div className="fortune-bazi-pillars" aria-label={words("四柱","Four pillars")}>{[result?.yearPillar,result?.monthPillar,result?.dayPillar,result?.timePillar].map((value:string,i:number)=><div key={i}><small>{[words("年","Year"),words("月","Month"),words("日","Day"),words("時","Hour")][i]}</small><strong>{value||"—"}</strong></div>)}</div>
  <section className="fortune-bazi-elements" aria-label={words("五行分布","Five-element distribution")}>
   <h4>{words("你的五行分布","Your five-element distribution")}</h4>
   <p>{words("依四柱天干與地支表面五行計數；不含藏干、季節權重，也不等於喜用神。","Counts visible stems and branches only; excludes hidden stems and seasonal weighting. Not a favorable-element assessment.")}</p>
   {total>0?<><div className="fortune-bazi-element-bars">{values.map(({name,count})=><div className="fortune-bazi-element-row" key={name}><strong>{name}</strong><div className="fortune-bazi-element-track" role="meter" aria-label={name} aria-valuemin={0} aria-valuemax={total} aria-valuenow={count}><span style={{width:(count/total*100)+"%"}}/></div><span>{count}/{total}</span></div>)}</div><p className="fortune-bazi-element-note">{words("表面五行最多："+strongest.name+"（"+MEANING[strongest.name][0]+"）；最少："+least.name+"。數量少不代表缺陷，也不能單靠此圖判斷吉凶。","Most visible: "+strongest.name+" ("+MEANING[strongest.name][1]+"); fewest: "+least.name+". Lower counts do not imply a deficiency or determine fortune.")}</p></>:<p>{words("暫無可用五行資料。","Element data unavailable.")}</p>}
  </section>
  <div className="fortune-bazi-free-grid">{topics.map((item,i)=><details className="fortune-bazi-free-topic" key={item.id} open={i===0?true:undefined}><summary><strong>{item.title}</strong><span className="fortune-bazi-topic-toggle" aria-hidden="true"/></summary><div className="fortune-bazi-topic-body"><small>{item.evidence}</small><p>{item.body}</p>{item.tip&&<p>{words("另一面值得留意：","Another side to consider: ")}{item.tip}</p>}</div></details>)}</div>
  <small>{t("reading.disclaimer")}</small>
 </section>;
}
