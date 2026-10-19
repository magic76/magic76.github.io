import {useState} from "react";
import type {FortuneMode} from "./types";
import {buildYearHighlights} from "./yearHighlights";
import {YearEvidence} from "./result/Common";

export function FortuneYearHighlights({mode,result}:{mode:FortuneMode;result:any}){
 const items=buildYearHighlights(mode,result).slice(0,3);
 const[selected,setSelected]=useState<number|null>(null);
 if(!items.length)return null;
 const related=selected===null?[]:mode==="bazi"
  ?(result.annualTimeline||[]).filter((x:any)=>Number(x.year)===selected)
  :mode==="tarot"?(result.personalYearTimeline||[]).filter((x:any)=>Number(x.year)===selected)
  :[...(result.majorTransitTimeline||[]),...(result.mahadashaTimeline||[])].filter((x:any)=>Number(String(x.date||x.startDate||"").slice(0,4))===selected);
 return <section className="fortune-highlight-section">
  <div className="section-head"><h3>先看這 3 個時間點</h3><small>點選年份可核對命盤依據</small></div>
  <div className="fortune-highlight-grid">{items.map((x,i)=><button type="button" className="fortune-highlight-card fortune-highlight-selectable" aria-pressed={selected===i} onClick={()=>setSelected(selected===i?null:i)} key={i}>
   <span>{x.year}</span><strong>{x.label}</strong><p>{x.summary}</p><small>{x.evidence}</small>
  </button>)}</div>
  {selected!==null&&<div className="fortune-highlight-inspector">
   <h4>{items[selected]?.year} · 對應的計算依據</h4>
   {mode==="vedic"
    ?[...(result.majorTransitTimeline||[]),...(result.mahadashaTimeline||[])].filter((x:any)=>Number(String(x.date||x.startDate||"").slice(0,4))===items[selected]?.year).map((x:any,i:number)=><YearEvidence key={i} mode="vedic" item={x}/>)
    :mode==="bazi"
    ?(result.annualTimeline||[]).filter((x:any)=>Number(x.year)===items[selected]?.year).map((x:any,i:number)=><YearEvidence key={i} mode="bazi" item={x}/>)
    :(result.personalYearTimeline||[]).filter((x:any)=>Number(x.year)===items[selected]?.year).map((x:any,i:number)=><YearEvidence key={i} mode="tarot" item={x}/>)}
   <p className="meta">此處只顯示已計算的年份、行運與週期，不預測具體生活事件。</p>
  </div>}
 </section>;
}