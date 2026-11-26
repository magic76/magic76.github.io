import {Arrow} from "../components/Arrow";
import {useEffect,useMemo,useState} from "react";
import {Link} from "react-router-dom";
import {fetchDay,fetchIndex,rankItems} from "./data";
import {readReviews,updateReview} from "./storage";
import type {BriefingDay,ReviewMap} from "./types";
import {usePublicResearchSeed} from "./PublicResearchContext";

// Build-time SSG and browsers have different Intl/ICU versions. Keep every
// first-paint date string deterministic to prevent React hydration mismatch.
const dateLabel=(date:string)=>{
 const t=Date.parse(date+"T00:00:00Z");if(!Number.isFinite(t))return date;
 const weekdays=["週日","週一","週二","週三","週四","週五","週六"];
 return Number(date.slice(5,7))+"月"+Number(date.slice(8,10))+"日 "+weekdays[new Date(t).getUTCDay()];
};
const sourceDate=(date:string)=>{const t=Date.parse(date);if(!Number.isFinite(t))return "";const d=new Date(t);return (d.getUTCMonth()+1)+"/"+d.getUTCDate()};
const editionDate=(value:string)=>{const time=Date.parse(value);if(!Number.isFinite(time))return "";const iso=new Date(time+8*3600000).toISOString();return iso.slice(0,16).replace("T"," ")+" UTC+8"};
export function BriefingPage(){
 const seed=usePublicResearchSeed();
 const [dates,setDates]=useState<string[]>(seed?.index?.days||[]),[selected,setSelected]=useState(seed?.day?.date||""),[day,setDay]=useState<BriefingDay|null>(seed?.day||null);
 const [busy,setBusy]=useState(!seed?.day),[error,setError]=useState(""),[query,setQuery]=useState(""),[topic,setTopic]=useState("all"),[onlySaved,setOnlySaved]=useState(false);
 const [reviews,setReviews]=useState<ReviewMap>({});
 useEffect(()=>setReviews(readReviews()),[]);
 useEffect(()=>{let alive=true;fetchIndex().then(index=>{if(!alive)return;setDates(index.days);setSelected(index.days[0]||"");setBusy(false)}).catch(e=>{if(alive){setError(String(e));setBusy(false)}});return()=>{alive=false}},[]);
 useEffect(()=>{if(!selected){setDay(null);return}if(day?.date===selected)return;let alive=true;setBusy(true);setError("");setTopic("all");fetchDay(selected).then(data=>{if(alive){setDay(data);setBusy(false)}}).catch(e=>{if(alive){setDay(null);setError(String(e));setBusy(false)}});return()=>{alive=false}},[selected,day?.date]);
 useEffect(()=>{const listener=()=>setReviews(readReviews());window.addEventListener("crew-briefing-updated",listener);return()=>window.removeEventListener("crew-briefing-updated",listener)},[]);
 const topics=useMemo(()=>[...new Set((day?.items||[]).map(item=>item.topic))].sort(),[day]);
 const filtered=useMemo(()=>rankItems(day?.items||[],query,topic,id=>!!reviews[id]?.saved,onlySaved),[day,query,topic,onlySaved,reviews]);
 return <div className="briefing briefing-reader">
  <header className="briefing-head">
   <div><span className="kicker">CREW BRIEFING · 每日 AI 研究</span><h1>每天一份，值得深入的 AI 研究</h1><p>從 Agent、記憶、語音到 AI 產品體驗，挑選值得閱讀、值得驗證的技術方向。</p></div>
   <div className="briefing-head-actions"><a className="btn secondary" href="/articles/">探索文章 <Arrow direction="up-right"/></a><Link className="btn secondary" to="/research/board">我的閱讀清單</Link><a className="btn secondary" href={import.meta.env.BASE_URL+"briefings/feed.xml"} target="_blank" rel="noopener noreferrer">RSS 訂閱 <Arrow direction="up-right"/></a></div>
  </header>
  <div className="briefing-layout">
   <nav className="briefing-side" aria-label="選擇報告日期"><h2>歷史報告</h2>{dates.length?dates.map((date,i)=><button key={date} className={"briefing-date "+(date===selected?"active":"")} aria-current={date===selected?"date":undefined} onClick={()=>setSelected(date)}><strong>{dateLabel(date)}</strong>{i===0&&<small>最新一期</small>}</button>):<p className="meta">目前還沒有報告。</p>}</nav>
   <section className="briefing-main" aria-label="研究精選">
    {busy?<div className="briefing-empty">正在讀取最新研究…</div>:error?<div className="briefing-empty" role="alert">{error}，請重整再試。</div>:!day?<div className="briefing-empty"><h2>新一期研究正在準備中</h2><p>這裡只刊登有公開來源的研究，不會顯示虛構內容。</p></div>:<>
     <div className="briefing-edition"><div><span className="briefing-edition-label">DAILY EDITION</span><h2>{dateLabel(day.date)} · 今日精選</h2></div><small>{day.items.length} 篇研究 · {editionDate(day.generatedAt)} 整理</small></div>
     {day.notes&&<div className="briefing-editor-note"><strong>本期導讀</strong><p>{day.notes}</p></div>}
     <div className="briefing-toolbar">
      <label className="briefing-search"><span aria-hidden="true">⌕</span><input aria-label="搜尋文章" value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜尋研究主題或關鍵字"/></label>
      <select aria-label="依研究主題篩選" value={topic} onChange={e=>setTopic(e.target.value)}><option value="all">所有研究主題</option>{topics.map(value=><option key={value} value={value}>{value}</option>)}</select>
      <label className="briefing-checkbox"><input type="checkbox" checked={onlySaved} onChange={e=>setOnlySaved(e.target.checked)}/>只看收藏</label>
     </div>
     {filtered.length?filtered.map((item,i)=><article key={item.id} className={"briefing-card "+(i===0&&!query&&!onlySaved&&topic==="all"?"featured":"")}>
      <div className="briefing-card-top"><span className="briefing-topic">{item.topic}</span><span className="briefing-score">{sourceDate(item.publishedAt)} 發表 · {item.sources.length} 個來源</span></div>
      <h3><Link to={"/research/"+day.date+"/"+encodeURIComponent(item.id)}>{item.title}</Link></h3><p>{item.summary}</p>
      <div className="briefing-card-bottom"><Link to={"/research/"+day.date+"/"+encodeURIComponent(item.id)} className="briefing-read">閱讀研究 <Arrow/></Link><button className="briefing-icon-button" aria-label={reviews[item.id]?.saved?"取消收藏":"收藏文章"} aria-pressed={!!reviews[item.id]?.saved} onClick={()=>setReviews(updateReview(item.id,{saved:!reviews[item.id]?.saved}))}>{reviews[item.id]?.saved?"★ 已收藏":"☆ 收藏"}</button></div>
     </article>):<div className="briefing-empty"><h2>找不到符合的文章</h2><p>可以換個搜尋詞或取消篩選。</p></div>}
     <p className="briefing-disclaimer">研究摘要是閱讀線索，不代表研究成果已經被 Crew 實測；引用時請以原始來源為準。</p>
    </>}
   </section>
  </div>
 </div>;
}
