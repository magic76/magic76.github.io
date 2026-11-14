import {useEffect,useState} from "react";
import {trackUsageEvent} from "../analytics/usage";
import {Link,useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {fetchDay} from "./data";
import {getStatus,readReviews,updateReview} from "./storage";
import type {BriefingItem,LocalReview} from "./types";
import {usePublicResearchSeed,type RelatedResearch} from "./PublicResearchContext";
import {ResearchDiscovery} from "./ResearchDiscovery";

function safeSource(url:string){
 try{const u=new URL(url);return u.protocol==="https:"?u.href:null}catch{return null}
}
function sourceDate(value:string){const t=Date.parse(value);return Number.isFinite(t)?(()=>{const d=new Date(t);return d.getUTCFullYear()+"年"+(d.getUTCMonth()+1)+"月"+d.getUTCDate()+"日"})():""}
export function BriefingDetailPage(){
 const {t}=useTranslation("friends");
 const {date="",id=""}=useParams();
 const seed=usePublicResearchSeed();
 const initial=seed?.day?.date===date&&seed.article?.id===id?seed.article:null;
 const [item,setItem]=useState<BriefingItem|null>(initial),[loading,setLoading]=useState(!initial),[error,setError]=useState("");
 // Review state is private to the browser and must not enter build-time HTML.
 const [review,setReview]=useState<LocalReview>({});
 const [related,setRelated]=useState<RelatedResearch[]>(initial?seed?.related||[]:[]);
 useEffect(()=>{
  if(initial){setRelated(seed?.related||[]);return}
  const controller=new AbortController();
  setRelated([]);
  const root=import.meta.env.BASE_URL.endsWith("/")?import.meta.env.BASE_URL:import.meta.env.BASE_URL+"/";
  fetch(root+"briefings/discovery.json",{signal:controller.signal})
   .then(response=>{if(!response.ok)throw Error("Related research unavailable");return response.json()})
   .then((catalog:Record<string,RelatedResearch[]>)=>{
    const list=catalog["/research/"+date+"/"+id+"/"];
    if(!controller.signal.aborted)setRelated(Array.isArray(list)?list:[]);
   }).catch(()=>{if(!controller.signal.aborted)setRelated([])});
  return()=>controller.abort();
 },[date,id,initial,seed?.related]);

 useEffect(()=>{
  let alive=true;
  const previous=readReviews()[id]||{};setReview(previous);
  if(initial){
   setItem(initial);setLoading(false);setError("");
   if(getStatus(previous)==="unread")setReview(updateReview(id,{status:"reading"})[id]);
   return()=>{alive=false};
  }
  setLoading(true);setError("");setItem(null);
  fetchDay(date).then(day=>{
   if(!alive)return;
   const found=day.items.find(value=>value.id===id);if(!found)throw Error("找不到這篇文章");
   setItem(found);setLoading(false);
   if(getStatus(previous)==="unread")setReview(updateReview(id,{status:"reading"})[id]);
  }).catch(e=>{if(alive){setError(e instanceof Error?e.message:"讀取失敗");setLoading(false)}});
  return()=>{alive=false};
 },[date,id,initial]);
 useEffect(()=>{if(item?.id===id)trackUsageEvent("research_article_open")},[date,id,item?.id]);
 function change(patch:Partial<LocalReview>){setReview(updateReview(id,patch)[id])}
 if(loading)return <div className="briefing briefing-empty">正在載入文章…</div>;
 if(!item||item.id!==id)return <div className="briefing briefing-empty"><p>{error||"找不到文章"}</p><Link to="/research">返回每日研究</Link></div>;
 const done=getStatus(review)==="finished"||getStatus(review)==="adopted";
 return <article className="briefing briefing-detail">
  <nav className="briefing-breadcrumb" aria-label="返回"><Link to="/research">← 返回每日研究</Link></nav>
  <header className="briefing-detail-head">
   <div className="briefing-detail-meta"><span className="briefing-topic">{item.topic}</span><span>{sourceDate(item.publishedAt)}</span><span>{item.sources.length} 個來源</span></div>
   <h1>{item.title}</h1>
   <p>{item.summary}</p>
   <div className="briefing-tags" aria-label="可能的應用領域">{item.projects.map(p=><span key={p}>{p}</span>)}</div>
  </header>
  <div className="briefing-detail-grid"><main>
   {item.body&&<section className="briefing-section briefing-article-copy"><h2>研究重點</h2>{item.body.split(/\n\n+/).map((paragraph,i)=><p key={i}>{paragraph}</p>)}</section>}
   <section className="briefing-section"><h2>為什麼值得關注</h2><p>{item.relevance}</p></section>
   {item.actions.length>0&&<section className="briefing-section"><h2>可以進一步驗證什麼？</h2><ol>{item.actions.map((action,i)=><li key={i}>{action}</li>)}</ol></section>}
   <section className="briefing-section"><h2>參考資料</h2><p className="meta">研究報告會保留來源與發表日期；引用的論點及數據仍應以原文為準。</p>
    {item.sources.length?item.sources.map((source,i)=>{
     const href=safeSource(source.url);
     return <div className="briefing-source" key={i}>{href?<a href={href} target="_blank" rel="noopener noreferrer" onClick={()=>trackUsageEvent("research_source_open")}>{source.title} ↗</a>:<span>{source.title}</span>}<small>{source.publishedAt||""}{source.kind?" · "+source.kind:""}</small></div>
    }):<p className="meta">目前沒有可驗證的原始來源。</p>}
   </section>
   <section className="briefing-section briefing-content-chat">
    <div className="briefing-content-chat-actions">
     <Link className="briefing-content-chat-primary" to="/friend/live?id=zoe&chat=text&topic=research-article">{t("contentChat.articleText")}</Link>
     <Link className="briefing-content-chat-secondary" to="/fortune?daily=1">{t("contentChat.todayFortune")}</Link>
    </div>
   </section>
   <ResearchDiscovery item={item} related={related}/>
  </main>
  <aside className="briefing-detail-aside" aria-label="閱讀工具">
   <div className="briefing-action-panel">
    <span className="briefing-side-eyebrow">我的閱讀清單</span><h3>這篇文章</h3>
    <button className="btn" onClick={()=>{if(!review.saved)trackUsageEvent("research_article_saved");change({saved:!review.saved})}}>{review.saved?"★ 已收藏 · 取消收藏":"☆ 收藏文章"}</button>
    <button className="btn secondary" onClick={()=>{if(!done)trackUsageEvent("research_article_completed");change({status:done?"reading":"finished"})}}>{done?"✓ 已讀完 · 標為未讀完":"標記已讀完"}</button>
    <p className="meta">收藏與閱讀紀錄只儲存在目前這個瀏覽器。</p>
    <details className="briefing-notes"><summary>我的筆記（選填）</summary>
      <textarea aria-label="我的研究筆記" value={review.notes||""} onChange={e=>change({notes:e.target.value})} placeholder="記下值得回頭看的想法…" rows={4}/>
    </details>
    <Link className="briefing-side-link" to="/research/board">前往我的閱讀清單 →</Link>
   </div>
  </aside></div>
 </article>;
}
