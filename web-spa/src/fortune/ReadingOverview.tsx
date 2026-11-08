import{useEffect,useState}from"react";
import{useTranslation}from"react-i18next";
import type{FortuneMode}from"./types";
import type{CurrentPhase}from"./currentPhase";
import{buildLocalReport}from"./report";
import type{FortuneChapter,FortuneChapterId}from"./report";
import{parseAiReading}from"./aiReading";
import{AiPanel}from"./result/Common";
import{formatFortuneValue}from"./displayNumber";
import{formatVedicTerm}from"./fortuneTerminology";
import{useRouteNamespace}from"../i18n/useRouteNamespace";
import{FortuneGlossary}from"./FortuneGlossary";

const primary:FortuneChapterId[]=["personality","career","wealth","relationships","currentCycle"];
type Metric={label:string;value:string};
function metricsFor(mode:FortuneMode,r:any):Metric[]{
 const raw:Metric[]=mode==="bazi"?
  [{label:"dayMaster",value:[r?.dayMaster,r?.dayMasterElement].filter(Boolean).join(" · ")},{label:"fourPillars",value:String(r?.fourPillars||"")},{label:"currentLuck",value:String(r?.currentLuckPillar?.ganZhi||"")}]:
  mode==="tarot"?
  [{label:"lifePath",value:String(r?.lifePathDisplay||"")},{label:"coreCard",value:String(r?.personalityCardName||"")},{label:"personalYear",value:r?.personalYear==null?"":String(r.personalYear)}]:
  [{label:"ascendant",value:String(r?.lagnaSign||"")},{label:"moon",value:String(r?.moonSign||"")},{label:"mainCycle",value:String(r?.currentMahadasha?.lord||"")}];
 return raw.filter(item=>item.value.trim().length>0);
}
function TopicSection({chapter,expanded,onToggle}:{chapter:FortuneChapter;expanded:boolean;onToggle:()=>void}){
 const{t,i18n}=useTranslation("fortune"),contentId="fortune-topic-content-"+chapter.id;
 return <article className="fortune-reading-chapter" id={"fortune-topic-"+chapter.id} data-expanded={expanded}>
  <button type="button" className="fortune-reading-chapter-trigger" aria-expanded={expanded} aria-controls={contentId} onClick={onToggle}>
   <span className="fortune-reading-chapter-label"><strong>{t("reading.topic."+chapter.id)}</strong><small>{t("reading.tapDetails")}</small></span>
   <span className="fortune-reading-toggle" aria-hidden="true">{expanded?"−":"+"}</span>
  </button>
  <div className="fortune-reading-chapter-content" id={contentId} hidden={!expanded}>
   <p>{formatVedicTerm(chapter.text,i18n.resolvedLanguage||i18n.language)}</p>
   {chapter.evidence.length>0&&<details className="fortune-source-details"><summary>{t("reading.evidence")}</summary><ul>{chapter.evidence.map((x,i)=><li key={i}>{formatVedicTerm(x,i18n.resolvedLanguage||i18n.language)}</li>)}</ul></details>}
  </div>
 </article>;
}
export function FortuneReadingOverview({mode,result,phase,ai}:{mode:FortuneMode;result:any;phase?:CurrentPhase;ai?:string}){
 const{t,i18n}=useTranslation("fortune");
 const{t:reportT}=useTranslation("fortuneReport");
 const reportReady=useRouteNamespace("fortuneReport");
 const[active,setActive]=useState<FortuneChapterId|null>("personality");
 useEffect(()=>setActive("personality"),[mode,result]);
 const chapters=buildLocalReport(mode,result,reportReady&&i18n.resolvedLanguage!=="zh-TW"?(key,options)=>String(reportT(key,options)):undefined,phase);
 if(!chapters.length)return null;
 const parsed=parseAiReading(ai||""),ready=Boolean(parsed.summary)&&!parsed.legacy;
 const aiText:Partial<Record<FortuneChapterId,string>>=ready?{
  personality:parsed.self,career:parsed.work,wealth:parsed.wealth,relationships:parsed.love,currentCycle:parsed.turning
 }:{};
 const main=primary.map(id=>chapters.find(x=>x.id===id)).filter((c):c is FortuneChapter=>Boolean(c))
  .map(chapter=>aiText[chapter.id]?{...chapter,text:aiText[chapter.id]!}:chapter);
 const more=chapters.filter(x=>!primary.includes(x.id));
 const facts=metricsFor(mode,result);
 const fiveElements=mode==="bazi"?Object.entries(result?.weightedFiveElements||{})
  .filter(([,v])=>Number.isFinite(Number(v))&&Number(v)>=0)
  .map(([label,value])=>({label,value:Number(value)})):[];
 const maxElement=Math.max(0,...fiveElements.map(x=>x.value));
 return <section className="fortune-reading-overview" id="fortune-reading-report" tabIndex={-1} aria-label={t("reading.reportTitle")}>
  <header className="fortune-reading-head">
   <span className="kicker">CREW FORTUNE · PERSONAL REPORT</span>
   <h3>{t("reading.reportTitle")}</h3>
  </header>
  <div className="fortune-reading-focus-head"><div><h4>{t("reading.exploreTitle")}</h4></div></div>
  <div className="fortune-reading-chapters">{main.map(chapter=><TopicSection key={chapter.id} chapter={chapter} expanded={active===chapter.id} onToggle={()=>setActive(active===chapter.id?null:chapter.id)}/>)}</div>
  {ready?<details className="fortune-reading-more fortune-local-collapse"><summary>{t("reading.fixedVersion")}</summary>
   <div className="fortune-reading-chapters">{chapters.map(chapter=><TopicSection key={chapter.id} chapter={chapter} expanded={active===chapter.id} onToggle={()=>setActive(active===chapter.id?null:chapter.id)}/>)}</div></details>:
   more.length>0&&<details className="fortune-reading-more"><summary>{t("reading.moreTopics")}</summary>
    <div className="fortune-reading-chapters">{more.map(chapter=><TopicSection key={chapter.id} chapter={chapter} expanded={active===chapter.id} onToggle={()=>setActive(active===chapter.id?null:chapter.id)}/>)}</div>
   </details>}
  {parsed.legacy&&<details className="fortune-reading-more"><summary>{t("reading.aiExisting")}</summary><AiPanel mode={mode} result={result} ai={ai||""}/></details>}
  <details className="fortune-reading-more fortune-reading-data"><summary>{t("reading.chartBasis")}</summary>
  {facts.length>0&&<div className="fortune-reading-metrics" aria-label={t("reading.chartBasis")}>{facts.map(metric=><div key={metric.label} className="fortune-reading-metric"><small>{t("reading.metric."+metric.label)}</small><strong>{metric.value}</strong></div>)}</div>}
  {fiveElements.length>0&&maxElement>0&&<div className="fortune-reading-elements">
   <div className="fortune-reading-elements-heading"><div><h4>{t("reading.fiveElements")}</h4><p>{t("reading.fiveDesc")}</p></div><span>{t("reading.baziData")}</span></div>
   <div className="fortune-reading-element-list">{fiveElements.map(item=><div className="fortune-reading-element" key={item.label}>
    <span className="fortune-reading-element-name">{item.label}</span><div className="fortune-reading-element-track"><span style={{width:(item.value/maxElement*100)+"%"}}/></div>
    <strong>{formatFortuneValue(item.value,true)}</strong>
   </div>)}</div>
  </div>}
  <FortuneGlossary mode={mode} result={result}/></details><small className="fortune-reading-disclaimer">{t("reading.disclaimer")}</small>
 </section>;
}
