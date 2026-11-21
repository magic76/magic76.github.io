import {Arrow} from "../components/Arrow";
import {useEffect,useMemo,useState} from "react";
import {Link} from "react-router-dom";
import {fetchDay,fetchIndex} from "./data";
import {downloadText,getStatus,importReviews,readReviews,updateReview} from "./storage";
import type {BriefingItem,ReviewMap} from "./types";
type Entry={date:string;item:BriefingItem};
type Tab="saved"|"reading"|"finished";
const dateLabel=(date:string)=>new Date(date+"T12:00:00").toLocaleDateString("zh-TW",{month:"long",day:"numeric"});
export function BriefingBoardPage(){
 const [entries,setEntries]=useState<Entry[]>([]),[reviews,setReviews]=useState<ReviewMap>(()=>readReviews());
 const [busy,setBusy]=useState(true),[error,setError]=useState(""),[note,setNote]=useState(""),[tab,setTab]=useState<Tab>("saved");
 useEffect(()=>{
  let active=true;
  fetchIndex().then(async index=>{
   const result=await Promise.allSettled(index.days.slice(0,35).map(date=>fetchDay(date)));
   if(!active)return;
   setEntries(result.flatMap(v=>v.status==="fulfilled"?v.value.items.map(item=>({date:v.value.date,item})):[]));setBusy(false);
  }).catch(e=>{if(active){setError(e instanceof Error?e.message:"資料載入失敗");setBusy(false)}});
  const onChange=()=>setReviews(readReviews());
  window.addEventListener("crew-briefing-updated",onChange);
  return()=>{active=false;window.removeEventListener("crew-briefing-updated",onChange)};
 },[]);
 const matches=(entry:Entry,view:Tab)=>{
  const review=reviews[entry.item.id];const status=getStatus(review);
  return view==="saved"?!!review?.saved:view==="reading"?["reading","researching","delegated"].includes(status):["finished","adopted"].includes(status);
 };
 const items=useMemo(()=>entries.filter(entry=>matches(entry,tab)),[entries,reviews,tab]);
 const counts=({saved:entries.filter(x=>matches(x,"saved")).length,reading:entries.filter(x=>matches(x,"reading")).length,finished:entries.filter(x=>matches(x,"finished")).length});
 const exportReviews=()=>downloadText("crew-briefing-reviews.json",JSON.stringify({version:1,exportedAt:new Date().toISOString(),reviews},null,2),"application/json");
 return <div className="briefing briefing-reading-list">
  <header className="briefing-head"><div><Link className="briefing-back-link" to="/research"><Arrow direction="left"/> 每日研究</Link><h1>我的閱讀清單</h1><p>把值得回頭看的文章放在一起。收藏與閱讀紀錄只存在這台裝置。</p></div></header>
  <div className="briefing-reading-tabs" role="group" aria-label="閱讀清單分類">
   {([["saved","已收藏"],["reading","閱讀中"],["finished","已讀完"]] as const).map(([key,title])=><button key={key} className={tab===key?"active":""} aria-pressed={tab===key} onClick={()=>setTab(key)}>{title}<small>{counts[key]}</small></button>)}
  </div>
  {busy?<div className="briefing-empty">正在載入閱讀清單…</div>:error?<div className="briefing-empty" role="alert">{error}</div>:items.length?
   <div className="briefing-reading-items">{items.map(({item,date})=><article key={item.id} className="briefing-reading-item">
    <div><span className="briefing-topic">{item.topic}</span><small>{dateLabel(date)}</small></div>
    <h2><Link to={"/research/"+date+"/"+encodeURIComponent(item.id)}>{item.title}</Link></h2>
    <p>{item.summary}</p>
    <div className="briefing-reading-item-actions"><Link to={"/research/"+date+"/"+encodeURIComponent(item.id)}>繼續閱讀 <Arrow/></Link>
     {tab==="saved"&&<button onClick={()=>setReviews(updateReview(item.id,{saved:false}))}>移出收藏</button>}
     {tab==="reading"&&<button onClick={()=>setReviews(updateReview(item.id,{status:"finished"}))}>標為已讀完</button>}
    </div>
   </article>)}</div>:
   <div className="briefing-empty"><h2>{tab==="saved"?"還沒有收藏的文章":tab==="reading"?"目前沒有閱讀中的文章":"還沒有完成閱讀的文章"}</h2><p>閱讀報告時可以點選收藏或標記已讀完。</p><Link className="btn secondary" to="/research">探索每日研究</Link></div>}
  <details className="briefing-backup"><summary>匯出／匯入閱讀紀錄</summary><p className="meta">更換瀏覽器時可使用備份檔；備份可能包含你的私人筆記，請自行保管。</p>
   <div className="briefing-actions"><button className="btn secondary" onClick={exportReviews}>匯出備份</button><label className="btn secondary" style={{cursor:"pointer"}}>匯入備份<input hidden type="file" accept=".json,application/json" onChange={async e=>{const file=e.target.files?.[0];e.currentTarget.value="";if(!file)return;try{const n=importReviews(await file.text());setReviews(readReviews());setNote("已匯入 "+n+" 筆閱讀紀錄")}catch(err){setNote(err instanceof Error?err.message:"匯入失敗")}}}/></label></div>{note&&<p className="meta" role="status">{note}</p>}</details>
 </div>;
}
