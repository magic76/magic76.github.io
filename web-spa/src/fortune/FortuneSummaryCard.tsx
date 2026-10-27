import{useTranslation}from"react-i18next";
import{buildYearHighlights}from"./yearHighlights";
import{parseAiReading}from"./aiReading";
import type{CurrentPhase}from"./currentPhase";
import type{FortuneMode}from"./types";

export function FortuneSummaryCard({mode,result,phase,ai,loading}:{
 mode:FortuneMode;result:any;phase:CurrentPhase;ai:string;loading:boolean;
}){
 const{t}=useTranslation("fortune");
 const parsed=parseAiReading(ai||"");
 const ready=Boolean(parsed.summary)&&!parsed.legacy;
 const highlights=buildYearHighlights(mode,result).slice(0,3);
 return <section className="fortune-summary-card" aria-label={t("reading.summaryTitle")}>
  <div className="fortune-summary-top"><span className="kicker">{t("reading.summaryTitle")}</span>
   {loading&&<span className="fortune-summary-loading" role="status">{t("reading.aiLoading")}</span>}</div>
  <h3>{ready?parsed.summary:t("reading.phaseNow",{current:phase.current||t("reading.phaseUnknown"),next:phase.next||t("reading.phaseUnknown")})}</h3>
  <h4>{t("reading.next12Title")}</h4>
  {ready?<ul>{parsed.next12.slice(0,3).map((line,i)=><li key={i}>{line}</li>)}</ul>
   :<ul>{highlights.map((x,i)=><li key={i}><strong>{x.year}</strong> · {x.label} — {x.summary}</li>)}</ul>}
  {ready&&parsed.turning&&<p className="fortune-summary-turning"><strong>{t("reading.turningTitle")}：</strong>{parsed.turning}</p>}
  {loading&&<div className="fortune-summary-skeleton" aria-hidden="true"><span/><span/><span/></div>}
 </section>;
}
