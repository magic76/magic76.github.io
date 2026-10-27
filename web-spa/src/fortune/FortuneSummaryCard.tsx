import{useTranslation}from"react-i18next";
import{buildTimingHighlights}from"./yearHighlights";
import{parseAiReading}from"./aiReading";
import{formatVedicTerm}from"./fortuneTerminology";
import{useRouteNamespace}from"../i18n/useRouteNamespace";
import type{CurrentPhase}from"./currentPhase";
import type{FortuneMode}from"./types";

export function FortuneSummaryCard({mode,result,phase,ai,loading}:{
 mode:FortuneMode;result:any;phase:CurrentPhase;ai:string;loading:boolean;
}){
 const{t,i18n}=useTranslation("fortune");const{t:reportT}=useTranslation("fortuneReport");
 const reportReady=useRouteNamespace("fortuneReport");
 const display=(v:unknown)=>formatVedicTerm(v,i18n.resolvedLanguage||i18n.language);
 const parsed=parseAiReading(ai||"");
 const ready=Boolean(parsed.summary)&&!parsed.legacy;
 const highlights=buildTimingHighlights(mode,result,phase,reportReady&&i18n.resolvedLanguage!=="zh-TW"?(key,options)=>String(reportT(key,options)):undefined);
 const focus=mode==="bazi"?Object.entries(result?.weightedFiveElements||{}).sort((a,b)=>Number(b[1])-Number(a[1]))[0]?.[0]||"—":mode==="tarot"?String(result?.personalYear||"—"):display(result?.currentMahadasha?.lord||"—");
 const headline=reportReady?reportT("headline."+mode,{current:display(phase.current||t("reading.phaseUnknown")),next:display(phase.next||t("reading.phaseUnknown")),year:phase.transitionYear||"—",focus}):"";
 const fallbackSummary=mode==="tarot"?t("reading.phaseTarot",{current:phase.current||t("reading.phaseUnknown"),next:phase.next||t("reading.phaseUnknown"),year:phase.transitionYear||t("reading.phaseUnknown")}):t("reading.phaseNow",{current:(phase.current||t("reading.phaseUnknown"))+(phase.remainingYears!==undefined?" · "+t("reading.yearsLeft",{count:phase.remainingYears}):""),next:(phase.transitionYear?phase.transitionYear+" · ":"")+(phase.next||t("reading.phaseUnknown"))});
 return <section className="fortune-summary-card" aria-label={t("reading.summaryTitle")}>
  <div className="fortune-summary-top"><span className="kicker">{t("reading.summaryTitle")}</span>
   {loading&&<span className="fortune-summary-loading" role="status">{t("reading.aiLoading")}</span>}</div>
  <h3>{ready?parsed.summary:headline||fallbackSummary}</h3>
  <h4>{t(ready?"reading.next12Title":"reading.topic.keyYears")}</h4>
  {ready?<ul>{parsed.next12.slice(0,3).map((line,i)=><li key={i}>{line}</li>)}</ul>
   :<ul>{highlights.map((x,i)=><li key={i}><strong>{x.year}</strong> · {display(x.label)} — {display(x.summary)}</li>)}</ul>}
  {ready&&parsed.turning&&<p className="fortune-summary-turning"><strong>{t("reading.turningTitle")}：</strong>{parsed.turning}</p>}
  {loading&&<div className="fortune-summary-skeleton" aria-hidden="true"><span/><span/><span/></div>}
 </section>;
}
