import {useEffect,useState} from "react";
import type {FortuneMode} from "./types";
import {buildLocalReport} from "./report";
import type {FortuneChapter,FortuneChapterId} from "./report";
import {formatFortuneValue} from "./displayNumber";

const primary:FortuneChapterId[]=["overview","personality","career","wealth","relationships","currentCycle"];
const prompt:Record<FortuneChapterId,string>={
 overview:"你的整體底盤",personality:"你如何思考與行動",career:"工作與職涯",wealth:"財務與資源",
 relationships:"感情與人際",family:"家庭與生活",currentCycle:"你目前的人生階段",
 longTerm:"接下來的長期節奏",keyYears:"重要年份",advice:"怎麼運用這份解讀"
};
const focus: {id:FortuneChapterId;label:string;symbol:string}[]=[
 {id:"career",label:"事業與職涯",symbol:"◇"},
 {id:"wealth",label:"財富與資源",symbol:"◈"},
 {id:"relationships",label:"感情與人際",symbol:"♡"}
];
type Metric={label:string;value:string};
function metricsFor(mode:FortuneMode,r:any):Metric[]{
 const raw:Metric[]=mode==="bazi"?
  [{label:"日主",value:[r?.dayMaster,r?.dayMasterElement].filter(Boolean).join(" · ")},{label:"四柱",value:String(r?.fourPillars||"")},{label:"目前大運",value:String(r?.currentLuckPillar?.ganZhi||"")}]:
  mode==="tarot"?
  [{label:"生命道路",value:String(r?.lifePathDisplay||"")},{label:"核心牌",value:String(r?.personalityCardName||"")},{label:"目前個人年",value:r?.personalYear==null?"":String(r.personalYear)}]:
  [{label:"上升",value:String(r?.lagnaSign||"")},{label:"月亮",value:String(r?.moonSign||"")},{label:"主週期",value:String(r?.currentMahadasha?.lord||"")}];
 return raw.filter(item=>item.value.trim().length>0);
}
function preview(text:string,max=110){
 const cleaned=text.replace(/\s+/g," ").trim();
 const end=cleaned.indexOf("。");
 const first=end>=0?cleaned.slice(0,end+1):cleaned;
 return first.length>max?first.slice(0,max).trimEnd()+"…":first;
}
function aiHighlights(ai:string):Array<{title:string;body:string}>{
 const parts=ai.split(/^##[ \t]+/m).map(s=>s.trim()).filter(Boolean);
 const sections=parts.map(part=>{
  const line=part.indexOf("\n");
  return {title:line<0?"":part.slice(0,line).trim(),body:line<0?"":part.slice(line+1).trim()};
 }).filter(x=>x.title&&x.body);
 const wanted=["命盤總覽","事業與職涯","目前人生階段","重要年份與轉折"];
 const selected=wanted.map(title=>sections.find(x=>x.title===title)).filter((x):x is {title:string;body:string}=>Boolean(x));
 return selected.length?selected.slice(0,3):sections.slice(0,3);
}
function TopicSection({chapter,expanded,onToggle,onAsk}:{chapter:FortuneChapter;expanded:boolean;onToggle:()=>void;onAsk?:(id:FortuneChapterId)=>void}){
 const contentId="fortune-topic-content-"+chapter.id;
 return <article className="fortune-reading-chapter" id={"fortune-topic-"+chapter.id} data-expanded={expanded}>
  <button type="button" className="fortune-reading-chapter-trigger" aria-expanded={expanded} aria-controls={contentId} onClick={onToggle}>
   <span className="fortune-reading-chapter-label"><strong>{prompt[chapter.id]||chapter.title}</strong><small>{preview(chapter.text,115)}</small></span>
   <span className="fortune-reading-toggle" aria-hidden="true">{expanded?"−":"+"}</span>
  </button>
  <div className="fortune-reading-chapter-content" id={contentId} hidden={!expanded}>
   <p>{chapter.text}</p>
   {chapter.evidence.length>0&&<details className="fortune-source-details"><summary>這段使用的命盤依據</summary><ul>{chapter.evidence.map((x,i)=><li key={i}>{x}</li>)}</ul></details>}
   {onAsk&&<button type="button" className="fortune-reading-ask" onClick={()=>onAsk(chapter.id)}>請 AI 朋友解釋這個主題 <span aria-hidden="true">→</span></button>}
  </div>
 </article>;
}
export function FortuneReadingOverview({mode,result,ai,onAsk}:{mode:FortuneMode;result:any;ai?:string;onAsk?:(id:FortuneChapterId)=>void}){
 const [active,setActive]=useState<FortuneChapterId|null>(null);
 useEffect(()=>setActive(null),[mode,result]);
 const chapters=buildLocalReport(mode,result);
 if(!chapters.length)return null;
 const main=primary.map(id=>chapters.find(x=>x.id===id)).filter((c):c is FortuneChapter=>Boolean(c));
 const more=chapters.filter(x=>!primary.includes(x.id));
 const aiChapters=ai?aiHighlights(ai):[];
 const facts=metricsFor(mode,result);
 const overview=chapters.find(x=>x.id==="overview");
 const fiveElements=mode==="bazi"?Object.entries(result?.weightedFiveElements||{})
  .filter(([,v])=>Number.isFinite(Number(v))&&Number(v)>=0)
  .map(([label,value])=>({label,value:Number(value)})):[];
 const maxElement=Math.max(0,...fiveElements.map(x=>x.value));
 const jump=(id:FortuneChapterId)=>{
  setActive(id);
  window.requestAnimationFrame(()=>document.getElementById("fortune-topic-"+id)?.scrollIntoView({behavior:"smooth",block:"start"}));
 };
 return <section className="fortune-reading-overview" aria-label="你的命盤白話解讀">
  <header className="fortune-reading-head">
   <span className="kicker">CREW FORTUNE · PERSONAL REPORT</span>
   <h3>你的命盤，從這裡開始看懂</h3>
   {overview&&<p>{preview(overview.text,230)}</p>}
   <small>根據既有出生資料與固定計算整理。傳統命理適合自我反思，不能驗證或保證未來事件。</small>
  </header>
  {facts.length>0&&<div className="fortune-reading-metrics" aria-label="命盤基本資料">{facts.map(metric=><div key={metric.label} className="fortune-reading-metric"><small>{metric.label}</small><strong>{metric.value}</strong></div>)}</div>}
  <div className="fortune-reading-focus-head"><div><span className="kicker">QUICK EXPLORE</span><h4>先從你關心的事開始</h4></div><span>點選主題查看完整解讀</span></div>
  <div className="fortune-reading-focus-grid">{focus.map(item=>{
   const chapter=chapters.find(x=>x.id===item.id);
   if(!chapter)return null;
   return <button type="button" key={item.id} className="fortune-reading-focus-card" onClick={()=>jump(item.id)}>
    <span className="fortune-reading-focus-icon" aria-hidden="true">{item.symbol}</span>
    <strong>{item.label}</strong><small>{preview(chapter.text,88)}</small>
    <span className="fortune-reading-focus-link">查看解讀 <span aria-hidden="true">→</span></span>
   </button>;
  })}</div>
  {fiveElements.length>0&&maxElement>0&&<div className="fortune-reading-elements">
   <div className="fortune-reading-elements-heading"><div><h4>五行分布</h4><p>依命盤已計算的加權五行數值，呈現相對長度，不是命運或性格分數。</p></div><span>八字資料</span></div>
   <div className="fortune-reading-element-list">{fiveElements.map(item=><div className="fortune-reading-element" key={item.label}>
    <span className="fortune-reading-element-name">{item.label}</span><div className="fortune-reading-element-track"><span style={{width:(item.value/maxElement*100)+"%"}}/></div>
    <strong>{formatFortuneValue(item.value,true)}</strong>
   </div>)}</div>
  </div>}
  <div className="fortune-reading-sections-title"><div><span className="kicker">DEEP DIVE</span><h4>逐項探索你的命盤</h4></div><small>點開卡片看完整內容與推算依據</small></div>
  <div className="fortune-reading-chapters">{main.map(chapter=><TopicSection key={chapter.id} chapter={chapter} expanded={active===chapter.id} onToggle={()=>setActive(active===chapter.id?null:chapter.id)} onAsk={onAsk}/>)}</div>
  {more.length>0&&<details className="fortune-reading-more">
   <summary>繼續閱讀其他 {more.length} 個主題：未來節奏、重要年份與建議</summary>
   <div className="fortune-reading-chapters">{more.map(chapter=><TopicSection key={chapter.id} chapter={chapter} expanded={active===chapter.id} onToggle={()=>setActive(active===chapter.id?null:chapter.id)} onAsk={onAsk}/>)}</div>
  </details>}
  {aiChapters.length>0&&<aside className="fortune-reading-ai">
   <h4>Gemini 延伸觀點</h4><p className="fortune-ai-intro">個人化 AI 解讀已完成。先選感興趣的主題，完整內容仍保留在下方「完整解讀」。</p>
   {aiChapters.map(x=><details key={x.title} className="fortune-reading-ai-chapter"><summary>{x.title}</summary><p>{x.body}</p></details>)}
  </aside>}
 </section>;
}