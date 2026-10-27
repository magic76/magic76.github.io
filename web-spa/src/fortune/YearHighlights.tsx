import {useState} from "react";
import {useTranslation} from "react-i18next";
import type {FortuneMode} from "./types";
import {buildTimingHighlights} from "./yearHighlights";
import type {CurrentPhase} from "./currentPhase";
import {YearEvidence} from "./result/Common";
import{formatVedicTerm}from"./fortuneTerminology";
import{useRouteNamespace}from"../i18n/useRouteNamespace";

export function FortuneYearHighlights({mode,result,phase}:{mode:FortuneMode;result:any;phase?:CurrentPhase}){
 const{t,i18n}=useTranslation("fortune");const{t:reportT}=useTranslation("fortuneReport");
 const reportReady=useRouteNamespace("fortuneReport");
 const display=(v:unknown)=>formatVedicTerm(v,i18n.resolvedLanguage||i18n.language);
 const items=buildTimingHighlights(mode,result,phase,reportReady&&i18n.resolvedLanguage!=="zh-TW"?(key,options)=>String(reportT(key,options)):undefined);
 const[selected,setSelected]=useState<number|null>(null);
 if(!items.length)return null;
 return <section className="fortune-highlight-section">
  <div className="section-head"><h3>{t("reading.topic.keyYears")}</h3><small>{t("reading.exploreHint")} · {t("reading.evidence")}</small></div>
  <div className="fortune-highlight-grid">{items.map((x,i)=><button type="button" className="fortune-highlight-card fortune-highlight-selectable" aria-pressed={selected===i} onClick={()=>setSelected(selected===i?null:i)} key={i}>
   <span>{x.year}</span><strong>{display(x.label)}</strong><p>{display(x.summary)}</p><small>{display(x.evidence)}</small>
  </button>)}</div>
  {selected!==null&&<div className="fortune-highlight-inspector">
   <h4>{items[selected]?.year} · {t("reading.evidence")}</h4>
   {mode==="vedic"
    ?[...(result.majorTransitTimeline||[]),...(result.mahadashaTimeline||[])].filter((x:any)=>Number(String(x.date||x.startDate||"").slice(0,4))===items[selected]?.year).map((x:any,i:number)=><YearEvidence key={i} mode="vedic" item={x}/>)
    :mode==="bazi"
    ?(result.annualTimeline||[]).filter((x:any)=>Number(x.year)===items[selected]?.year).map((x:any,i:number)=><YearEvidence key={i} mode="bazi" item={x}/>)
    :(result.personalYearTimeline||[]).filter((x:any)=>Number(x.year)===items[selected]?.year).map((x:any,i:number)=><YearEvidence key={i} mode="tarot" item={x}/>)}

  </div>}
 </section>;
}