import {useEffect,useMemo,useState} from "react";
import {Link} from "react-router-dom";
import {fetchDay,fetchIndex,rankItems} from "./data";
import {readReviews,updateReview} from "./storage";
import {PROJECTS,type BriefingDay,type ReviewMap} from "./types";
const dateLabel=(date:string)=>new Date(date+"T12:00:00").toLocaleDateString("zh-TW",{month:"long",day:"numeric",weekday:"short"});
export function BriefingPage(){
 const[dates,setDates]=useState<string[]>([]),[selected,setSelected]=useState(""),[day,setDay]=useState<BriefingDay|null>(null);
 const[busy,setBusy]=useState(true),[error,setError]=useState(""),[query,setQuery]=useState(""),[project,setProject]=useState("all"),[onlySaved,setOnlySaved]=useState(false),[reviews,setReviews]=useState<ReviewMap>(()=>readReviews());
 useEffect(()=>{let alive=true;fetchIndex().then(index=>{if(!alive)return;setDates(index.days);setSelected(index.days[0]||"");setBusy(false)}).catch(e=>{if(alive){setError(String(e));setBusy(false)}});return()=>{alive=false}},[]);
 useEffect(()=>{if(!selected){setDay(null);return}let alive=true;setBusy(true);setError("");fetchDay(selected).then(data=>{if(alive){setDay(data);setBusy(false)}}).catch(e=>{if(alive){setDay(null);setError(String(e));setBusy(false)}});return()=>{alive=false}},[selected]);
 useEffect(()=>{const onChange=()=>setReviews(readReviews());window.addEventListener("crew-briefing-updated",onChange);return()=>window.removeEventListener("crew-briefing-updated",onChange)},[]);
 const filtered=useMemo(()=>rankItems(day?.items||[],query,project,id=>Boolean(reviews[id]?.saved),onlySaved),[day,query,project,onlySaved,reviews]);
 const total=day?.items.length||0;const saved=day?.items.filter(x=>reviews[x.id]?.saved).length||0;
 return <div className="briefing">
  <section className="briefing-head"><div><span className="kicker">CREW BRIEFING · 每日研發情報</span><h1>今天值得研究什麼？</h1><p>只看值得你花時間的研究。從情報走到專案實驗，不再只是收藏文章。</p></div><div className="briefing-head-actions"><Link to="/briefing/board" className="btn secondary">研究看板 ↗</Link></div></section>
  <section className="briefing-summary">
   <div><b>{total}</b><span>當期研究</span></div><div><b>{saved}</b><span>已收藏</span></div><div><b>{day?.items.filter(x=>x.actions.length>0).length||0}</b><span>可研究方向</span></div>
   <div className="briefing-sync"><span>資料範圍：公開研究來源</span><small>個人標記保存在此瀏覽器</small></div>
  </section>
  <div className="briefing-layout">
   <aside className="briefing-side"><h3>報告日期</h3>{dates.length?dates.map((date,i)=><button key={date} className={"briefing-date "+(selected===date?"active":"")} onClick={()=>setSelected(date)}><strong>{dateLabel(date)}</strong>{i===0&&<small>最新一期</small>}</button>):<p className="meta">尚未發布第一期報告。</p>}<Link to="/briefing/board" className="briefing-side-link">查看所有研究進度 →</Link></aside>
   <div className="briefing-main">
    <div className="briefing-toolbar"><label className="briefing-search"><span aria-hidden="true">⌕</span><input aria-label="搜尋研究報告" value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜尋研究、專案、關鍵字"/></label><select aria-label="依專案篩選" value={project} onChange={e=>setProject(e.target.value)}><option value="all">所有專案</option>{PROJECTS.map(p=><option key={p}>{p}</option>)}</select><label className="briefing-checkbox"><input type="checkbox" checked={onlySaved} onChange={e=>setOnlySaved(e.target.checked)}/>只看收藏</label></div>
    {busy?<div className="briefing-empty">正在讀取報告…</div>:error?<div className="briefing-empty" role="alert">{error}。請稍後重整。</div>:!day?<div className="briefing-empty"><h2>每日研究報告準備中</h2><p>自動排程首次產生報告後，會顯示在這裡；目前沒有假造的研究資料。</p><p>可從 GitHub Actions 手動執行「Crew Briefing daily」來產生第一期。</p></div>:<>
      <div className="briefing-edition"><h2>{dateLabel(day.date)} 的研究精選</h2><small>{day.items.length} 則 · {new Date(day.generatedAt).toLocaleString("zh-TW")} 更新</small></div>
      {filtered.length?filtered.map((item,i)=><article key={item.id} className="briefing-card"><div className="briefing-card-top"><span className="briefing-sequence">{String(i+1).padStart(2,"0")}</span><span className="briefing-topic">{item.topic}</span><span className="briefing-score">相關度 {item.score}</span></div><h3><Link to={"/briefing/"+day.date+"/"+encodeURIComponent(item.id)}>{item.title}</Link></h3><p>{item.summary}</p><div className="briefing-tags">{item.projects.map(p=><span key={p}>{p}</span>)}</div><div className="briefing-card-bottom"><Link to={"/briefing/"+day.date+"/"+encodeURIComponent(item.id)} className="briefing-read">閱讀與研究 →</Link><button className="briefing-icon-button" aria-label={reviews[item.id]?.saved?"取消收藏":"收藏研究"} aria-pressed={!!reviews[item.id]?.saved} onClick={()=>{setReviews(updateReview(item.id,{saved:!reviews[item.id]?.saved}))}}>{reviews[item.id]?.saved?"★ 已收藏":"☆ 收藏"}</button></div></article>):<div className="briefing-empty">沒有符合條件的研究。請調整搜尋或篩選。</div>}
    </>}
   </div>
  </div>
 </div>
}
