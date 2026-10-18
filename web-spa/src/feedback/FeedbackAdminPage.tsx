import {useCallback,useEffect,useState} from "react";
import "./feedback.css";
type Status="new"|"reviewed"|"closed";
type Item={id:string;kind:string;rating:number|null;reason:string;message:string;product:string;platform:string;
 page:string;roleId:string;model:string;errorCode:string;locale:string;buildVersion:string;status:Status;createdAt:string};
type Report={items:Item[];total:number;offset:number};
export function FeedbackAdminPage(){
 const [status,setStatus]=useState<"all"|Status>("new"),[offset,setOffset]=useState(0);
 const [report,setReport]=useState<Report|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const load=useCallback(async(signal?:AbortSignal)=>{
  setBusy(true);setError("");
  try{
   const reply=await fetch("/api/feedback/admin?status="+status+"&offset="+offset,{credentials:"same-origin",cache:"no-store",signal});
   if(!reply.ok)throw Error(reply.status===403?"未通過 Cloudflare Access 管理員驗證":"載入失敗（"+reply.status+"）");
   const value=await reply.json() as Report;if(!Array.isArray(value.items))throw Error("資料格式錯誤");
   if(!signal?.aborted)setReport(value);
  }catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:"載入失敗")}
  finally{if(!signal?.aborted)setBusy(false)}
 },[status,offset]);
 useEffect(()=>{const controller=new AbortController();void load(controller.signal);return()=>controller.abort()},[load]);
 useEffect(()=>{const tag=document.createElement("meta");tag.name="robots";tag.content="noindex,nofollow";document.head.appendChild(tag);return()=>tag.remove()},[]);
 async function update(item:Item,next:Status){
  setBusy(true);setError("");
  try{
   const reply=await fetch("/api/feedback/admin",{method:"PATCH",credentials:"same-origin",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({id:item.id,status:next})});
   if(!reply.ok)throw Error("更新失敗（"+reply.status+"）");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"更新失敗")}finally{setBusy(false)}
 }
 return <main className="crew-feedback-admin shell page">
  <header className="hero"><span className="kicker">CREW / PRIVATE</span><h1>Feedback Inbox</h1><p>匿名意見、問題回報與體驗評分。只有通過 Cloudflare Access 的管理員可查看。</p></header>
  <div className="crew-feedback-admin-filter"><label>狀態 <select value={status} onChange={e=>{setStatus(e.target.value as "all"|Status);setOffset(0)}}>
   <option value="new">未處理</option><option value="reviewed">已查看</option><option value="closed">已結案</option><option value="all">全部</option>
  </select></label><button type="button" onClick={()=>{void load()}} disabled={busy}>重新整理</button></div>
  {error?<p role="alert" className="crew-feedback-error">{error}</p>:null}
  {busy&&!report?<p role="status">載入中…</p>:null}
  {report?<><p className="meta">共 {report.total} 筆 · 第 {report.total?offset+1:0}–{Math.min(offset+report.items.length,report.total)} 筆</p>
   {report.items.length===0?<section className="panel section">目前沒有回饋。</section>:null}
   <div className="crew-feedback-inbox">{report.items.map(item=><article key={item.id} className="panel crew-feedback-item">
    <div className="crew-feedback-item-title"><strong>{item.kind==="rating"?(item.rating===5?"正面評價":"需要改善"):item.kind==="bug"?"問題回報":item.kind==="idea"?"功能建議":"其他意見"}</strong>
     <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("zh-TW")}</time></div>
    <div className="crew-feedback-tags"><span>{item.product}</span><span>{item.platform}</span><span>{item.reason||"無分類"}</span></div>
    <p className="crew-feedback-message">{item.message||"（未填說明）"}</p>
    {item.page||item.roleId||item.model||item.errorCode?<details><summary>附加診斷資訊</summary>
     <p className="meta">頁面：{item.page||"—"}　角色：{item.roleId||"—"}　模型：{item.model||"—"}　錯誤：{item.errorCode||"—"}　介面語言：{item.locale||"—"}</p>
    </details>:null}
    <div className="crew-feedback-item-actions">{(["new","reviewed","closed"] as const).map(next=>
     <button type="button" key={next} disabled={busy||item.status===next} onClick={()=>{void update(item,next)}}>
      {next==="new"?"未處理":next==="reviewed"?"已查看":"已結案"}</button>)}</div>
   </article>)}</div>
   <nav className="crew-feedback-pages"><button type="button" disabled={busy||offset===0} onClick={()=>setOffset(x=>Math.max(0,x-50))}>上一頁</button>
    <button type="button" disabled={busy||offset+50>=report.total} onClick={()=>setOffset(x=>x+50)}>下一頁</button></nav>
  </>:null}
 </main>;
}
