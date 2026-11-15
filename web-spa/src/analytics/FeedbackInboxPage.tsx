import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import "./feedback-inbox.css";

type Kind="all"|"bug"|"idea"|"other";
type Status="all"|"new"|"working"|"done";
type Row={id:number;kind:Exclude<Kind,"all">;status:Exclude<Status,"all">;message:string;contact:string;page:string;created_at:string;reviewed_at:string|null};
type Summary={total:number;new:number;working:number;done:number};
type Result={items:Row[];hasMore:boolean;summary:Summary};
const kinds:{key:Kind;label:string}[]=[
 {key:"all",label:"全部類別"},{key:"bug",label:"問題回報"},{key:"idea",label:"功能建議"},{key:"other",label:"其他意見"}
];
const statuses:{key:Status;label:string}[]=[
 {key:"all",label:"所有狀態"},{key:"new",label:"待處理"},{key:"working",label:"處理中"},{key:"done",label:"已完成"}
];
const statusName=(key:Row["status"])=>statuses.find(item=>item.key===key)?.label||"待處理";
const categoryName=(key:Row["kind"])=>kinds.find(item=>item.key===key)?.label||"其他意見";
function time(value:string){
 const date=new Date(value.replace(" ","T")+(value.endsWith("Z")?"":"Z"));
 return Number.isFinite(date.getTime())?date.toLocaleString("zh-TW",{
  timeZone:"Asia/Taipei",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false
 }):value;
}
const messageForStatus=(status:number)=>status===403
 ?"無權限讀取回饋。請先透過 Cloudflare Access 登入管理員帳號，並確認 /usage 的驗證設定。"
 :status===503?"Cloudflare 尚未綁定 CREW_FEEDBACK_DB，請檢查 Production D1 Binding。"
 :"回饋資料暫時無法讀取或更新（HTTP "+status+"）。";

export function FeedbackInboxPage(){
 const [kind,setKind]=useState<Kind>("all"),[status,setStatus]=useState<Status>("all"),[refresh,setRefresh]=useState(0);
 const [items,setItems]=useState<Row[]>([]),[summary,setSummary]=useState<Summary|null>(null),[hasMore,setHasMore]=useState(false);
 const [loading,setLoading]=useState(true),[loadingMore,setLoadingMore]=useState(false),[savingId,setSavingId]=useState<number|null>(null);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const epoch=useRef(0);
 useEffect(()=>{
  let active=true;const run=++epoch.current;
  setLoading(true);setItems([]);setHasMore(false);setError("");
  const params=new URLSearchParams({view:"feedback",kind,status});
  void fetch("/api/usage/report?"+params.toString(),{credentials:"same-origin",cache:"no-store"})
   .then(async response=>{
    if(!response.ok)throw Error(messageForStatus(response.status));
    return response.json() as Promise<Result>;
   }).then(value=>{
    if(!active||run!==epoch.current)return;
    if(!Array.isArray(value.items)||!value.summary)throw Error("回饋管理服務回傳格式不正確。");
    setItems(value.items);setSummary(value.summary);setHasMore(value.hasMore===true);
   }).catch(e=>{if(active&&run===epoch.current)setError(e instanceof Error?e.message:"無法載入回饋")})
   .finally(()=>{if(active&&run===epoch.current)setLoading(false)});
  return()=>{active=false};
 },[kind,status,refresh]);
 async function loadMore(){
  const before=items.at(-1)?.id;
  if(!before||!hasMore||loadingMore)return;
  const run=epoch.current;
  setLoadingMore(true);setError("");
  try{
   const params=new URLSearchParams({view:"feedback",kind,status,before:String(before)});
   const response=await fetch("/api/usage/report?"+params.toString(),{credentials:"same-origin",cache:"no-store"});
   if(!response.ok)throw Error(messageForStatus(response.status));
   const result=await response.json() as Result;
   if(run!==epoch.current)return;
   if(!Array.isArray(result.items))throw Error("回傳格式不正確。");
   setItems(old=>[...old,...result.items.filter(item=>!old.some(existing=>existing.id===item.id))]);
   setHasMore(result.hasMore===true);
  }catch(e){if(run===epoch.current)setError(e instanceof Error?e.message:"無法載入更多回饋")}
  finally{if(run===epoch.current)setLoadingMore(false)}
 }
 async function changeStatus(id:number,next:Row["status"]){
  if(savingId!==null)return;
  setSavingId(id);setError("");setNotice("");
  try{
   const response=await fetch("/api/usage/report?view=feedback",{
    method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({id,status:next})
   });
   if(!response.ok)throw Error(messageForStatus(response.status));
   const result=await response.json() as {ok?:boolean;id?:number;status?:string};
   if(!result.ok||result.id!==id||result.status!==next)throw Error("更新回應格式不正確。");
   setNotice("FB-"+id+" 已標記為「"+statusName(next)+"」。");
   // Refresh counts and filtered pages from D1; do not treat a failed write as completed.
   setRefresh(n=>n+1);
  }catch(e){setError(e instanceof Error?e.message:"更新失敗，請重試")}
  finally{setSavingId(null)}
 }
 return <main className="crew-feedback-inbox">
  <header className="hero crew-inbox-heading">
   <span className="kicker">CREW / PRIVATE INBOX</span>
   <h1>使用者意見回饋</h1>
   <p>從 Cloudflare D1 讀取回饋，依類別與處理狀態整理。只有通過既有管理員驗證才能查看內容。</p>
   <nav className="crew-inbox-links" aria-label="私人管理頁導覽">
    <Link to="/usage">使用統計</Link>
    <button type="button" onClick={()=>setRefresh(n=>n+1)}>重新整理</button>
   </nav>
  </header>
  {summary&&<section className="crew-inbox-stats" aria-label="回饋統計">
   {([["總計",summary.total],["待處理",summary.new],["處理中",summary.working],["已完成",summary.done]] as const).map(([label,value])=>
    <div className="panel" key={label}><small>{label}</small><strong>{value.toLocaleString("zh-TW")}</strong></div>)}
  </section>}
  <section className="panel section crew-inbox-filters" aria-label="篩選回饋">
   <label>類別
    <select value={kind} onChange={e=>{setNotice("");setKind(e.target.value as Kind)}}>
     {kinds.map(option=><option key={option.key} value={option.key}>{option.label}</option>)}
    </select>
   </label>
   <label>處理狀態
    <select value={status} onChange={e=>{setNotice("");setStatus(e.target.value as Status)}}>
     {statuses.map(option=><option key={option.key} value={option.key}>{option.label}</option>)}
    </select>
   </label>
   <small>最新優先 · 每次顯示 30 則 · 時間為台灣時間</small>
  </section>
  {error&&<p className="crew-inbox-error" role="alert">{error}</p>}
  {loading?<section className="panel section" role="status">正在載入私人回饋…</section>:<>
   {notice&&<p className="crew-inbox-notice" role="status">{notice}</p>}
   {!items.length&&!error?<section className="panel section crew-inbox-empty">目前沒有符合條件的回饋。</section>:null}
   <div className="crew-inbox-list">
    {items.map(item=><article key={item.id} className="panel crew-inbox-card">
     <div className="crew-inbox-card-head">
      <div className="crew-inbox-tags"><strong>FB-{item.id}</strong>
       <span>{categoryName(item.kind)}</span>
       <span className={"crew-inbox-status crew-inbox-status--"+item.status}>{statusName(item.status)}</span>
      </div>
      <time dateTime={item.created_at}>{time(item.created_at)}</time>
     </div>
     <p className="crew-inbox-message">{item.message}</p>
     <div className="crew-inbox-meta">
      {item.page&&<span>來源：{item.page}</span>}
      {item.contact&&<span>聯絡：{item.contact}</span>}
     </div>
     <div className="crew-inbox-actions" role="group" aria-label={"設定 FB-"+item.id+" 處理狀態"}>
      {statuses.filter(option=>option.key!=="all").map(option=><button key={option.key} type="button"
       aria-pressed={item.status===option.key} disabled={savingId!==null||item.status===option.key}
       onClick={()=>void changeStatus(item.id,option.key as Row["status"])}>
       {savingId===item.id?"處理中…":option.label}
      </button>)}
     </div>
    </article>)}
   </div>
   {hasMore&&<div className="crew-inbox-more"><button type="button" disabled={loadingMore}
    onClick={()=>void loadMore()}>{loadingMore?"載入中…":"載入更多回饋"}</button></div>}
  </>}
 </main>;
}
