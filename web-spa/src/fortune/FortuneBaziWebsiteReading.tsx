import {useState} from "react";
import {buildBaziWebsiteReading} from "./baziWebsiteReading";
import "./fortunePriceInterest.css";
export function FortuneBaziWebsiteReading({result,zh}:{result:any;zh:boolean}){
 const {topics,cycles,years,current}=buildBaziWebsiteReading(result,new Date().getFullYear());
 const c=(z:string,e:string)=>zh?z:e;
 const pick=(p:[string,string])=>p[zh?0:1];
 const [selected,setSelected]=useState(0);
 const active=topics[selected];
 return <section className="fortune-website-reading" aria-label={c("完整人生解析","Full life reading")}>
 <header><span className="fortune-price-interest-eyebrow">{c("你的個人八字命盤","Your personal BaZi chart")}</span><h3>{c("完整人生解析","Full life reading")}</h3><p>{c("8 大主題 · 24 個解析細項 · 未來五年逐年閱讀","8 topics · 24 insights · five individual years")}</p><small>{c("依你的命盤計算資料即時整理，為傳統象徵解讀，不是 AI 命書或確定的事件預測。","Based on your calculated chart; traditional symbolic interpretation, not an AI book or certain prediction.")}</small></header>
 <nav className="fortune-website-topics" aria-label={c("解析目錄","Reading contents")}>{topics.map((t,i)=><button key={t.id} type="button" aria-pressed={selected===i} onClick={()=>setSelected(i)}><small>{String(i+1).padStart(2,"0")}</small>{pick(t.title)}</button>)}</nav>
 <article className="fortune-website-chapter" aria-live="polite"><h4>{pick(active.title)}</h4>{active.sections.map((s,i)=><section key={i}><h5>{pick(s.title)}</h5><p>{pick(s.body)}</p></section>)}
 {active.id==="life"&&<div className="fortune-website-timeline">{cycles.map(x=><div key={x.startYear} data-current={current?.startYear===x.startYear}><strong>{x.ganZhi}</strong><span>{x.startYear}–{x.endYear}</span>{current?.startYear===x.startYear&&<small>{c("目前","Current")}</small>}</div>)}{!cycles.length&&<p>{c("尚無大運資料","No cycle data")}</p>}</div>}
 {active.id==="years"&&<div className="fortune-website-years">{years.map(y=><section key={y.year}><h5>{y.year} · {y.ganZhi}</h5>{y.available&&<small>{pick(y.theme)} · {c("大運","Cycle")} {y.cycle}</small>}<p>{pick(y.body)}</p></section>)}</div>}
 </article>
 <div className="fortune-website-pagination"><button type="button" className="btn secondary" disabled={selected===0} onClick={()=>setSelected(x=>x-1)}>{c("上一章","Previous")}</button><span>{selected+1} / {topics.length}</span><button type="button" className="btn secondary" disabled={selected===topics.length-1} onClick={()=>setSelected(x=>x+1)}>{c("下一章","Next")}</button></div>
 </section>
}
