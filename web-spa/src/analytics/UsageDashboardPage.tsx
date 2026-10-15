import {useEffect,useMemo,useState} from "react";
import "./usage-dashboard.css";

type Row={day:string;event:string;count:number;users:number};
type Report={days:number;activeUsers:number;rows:Row[];generatedAt:string};
const meaning:Record<string,string>={
 app_opened:"開啟 Crew Web",visitor_first_seen:"新瀏覽器",user_returned:"跨日回訪",
 teacher_conversation:"老師有效對話",friend_conversation:"朋友有效對話",
 story_reading:"故事閱讀",story_narration:"語音說故事",story_created:"故事創作",
 fortune_calculated:"命盤計算",fortune_ai_interpreted:"AI 命理解讀",
 gemini_key_missing:"進入語音但缺少 Key",gemini_key_verified:"Key 驗證成功"
};
const productEvents=[
 "teacher_conversation","friend_conversation","story_reading",
 "story_narration","story_created","fortune_calculated","fortune_ai_interpreted"
];
const sum=(rows:Row[],name:string)=>rows.filter(row=>row.event===name).reduce((n,row)=>n+row.count,0);
const num=(n:number)=>n.toLocaleString("zh-TW",{maximumFractionDigits:0});

export function UsageDashboardPage(){
 const[days,setDays]=useState<7|30>(7),[data,setData]=useState<Report|null>(null);
 const[error,setError]=useState(""),[loading,setLoading]=useState(true);
 useEffect(()=>{
  let cancelled=false;
  setLoading(true);setError("");setData(null);
  void fetch("/api/usage/report?days="+days,{credentials:"same-origin",cache:"no-store"})
   .then(async reply=>{
    if(!reply.ok)throw new Error(reply.status===403?
     "尚未通過 Cloudflare Access 驗證，或 Access／管理員身分尚未設定。":"查詢失敗（HTTP "+reply.status+"）");
    const result=await reply.json() as Report;
    if(!Array.isArray(result.rows))throw new Error("伺服器回傳格式不正確");
    return result;
   })
   .then(value=>{if(!cancelled)setData(value)})
   .catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:"無法查詢使用統計")})
   .finally(()=>{if(!cancelled)setLoading(false)});
  return()=>{cancelled=true};
 },[days]);
 const daysList=useMemo(()=>{
  const today=new Date();
  return Array.from({length:days},(_,i)=>{
   const date=new Date(today);date.setUTCDate(date.getUTCDate()-(days-1-i));
   const day=date.toISOString().slice(0,10);
   const count=(data?.rows||[]).filter(row=>row.day===day&&productEvents.includes(row.event)).reduce((a,b)=>a+b.count,0);
   return{day,count};
  });
 },[data,days]);
 const max=Math.max(1,...daysList.map(row=>row.count));
 const features=productEvents.map(event=>({
  event,count:sum(data?.rows||[],event),
  // Unique browsers per event; do not add these values together to produce DAU.
  unique:(data?.rows||[]).filter(row=>row.event===event).reduce((a,b)=>a+b.users,0)
 }));
 const opened=sum(data?.rows||[],"app_opened");
 const successful=features.reduce((n,item)=>n+item.count,0);
 return <main className="usage-dashboard">
  <section className="hero"><span className="kicker">CREW / PRIVATE ANALYTICS</span>
   <h1>Crew Usage</h1>
   <p>有多少瀏覽器真的使用功能，而不只是打開網站。僅統計匿名產品事件。</p>
   <div className="usage-toolbar" role="group" aria-label="統計期間">
    <button type="button" aria-pressed={days===7} onClick={()=>setDays(7)}>最近 7 天</button>
    <button type="button" aria-pressed={days===30} onClick={()=>setDays(30)}>最近 30 天</button>
   </div>
  </section>
  {loading?<section className="panel section" role="status">正在讀取匿名使用事件…</section>:
   error?<section className="panel section" role="alert"><strong>無法讀取使用資料</strong><p>{error}</p><p className="meta">需要 Cloudflare Access、Analytics Engine Binding 及唯讀 API Token；請參考 docs/CREW_USAGE.md。</p></section>:
   data&&<><section className="usage-cards" aria-label="主要使用指標">
    <article className="panel"><small>有效使用瀏覽器（不重複）</small><strong>{num(data.activeUsers)}</strong><span>Teacher / Friend / Story / Fortune 成功事件的匿名識別碼數</span></article>
    <article className="panel"><small>成功功能事件</small><strong>{num(successful)}</strong><span>跨功能成功次數；同一人可有多筆</span></article>
    <article className="panel"><small>開啟 Web App</small><strong>{num(opened)}</strong><span>每個分頁工作階段最多記一次</span></article>
    <article className="panel"><small>跨日回訪</small><strong>{num(sum(data.rows,"user_returned"))}</strong><span>跨日開啟次數，不等於不同真人數</span></article>
   </section>
   <section className="panel section">
    <div className="section-head"><h2>每日成功使用事件</h2><small>UTC 日期 · 僅成功操作</small></div>
    <div className="usage-bars" role="img" aria-label="每日成功使用事件長條圖">
     {daysList.map(item=><div key={item.day} className="usage-bar-column" title={item.day+": "+num(item.count)}>
      <div className="usage-bar-value">{item.count||""}</div>
      <div className="usage-bar-track"><div className="usage-bar" style={{height:Math.max(0,item.count/max*100)+"%"}}/></div>
      {days===7&&<small>{item.day.slice(5)}</small>}
     </div>)}
    </div>
   </section>
   <section className="panel section">
    <div className="section-head"><h2>功能使用排行</h2><small>次數及每日去重瀏覽器（跨日不可相加成總用戶）</small></div>
    <div className="usage-feature-list">{features.sort((a,b)=>b.count-a.count).map(item=><div className="usage-feature" key={item.event}>
     <span>{meaning[item.event]}</span><strong>{num(item.count)} 次</strong>
    </div>)}</div>
   </section>
   <section className="panel section">
    <div className="section-head"><h2>設定流程與回訪訊號</h2></div>
    <div className="usage-feature-list">{["visitor_first_seen","user_returned","gemini_key_missing","gemini_key_verified"].map(event=><div className="usage-feature" key={event}><span>{meaning[event]}</span><strong>{num(sum(data.rows,event))} 次</strong></div>)}</div>
   </section>
   <p className="usage-note">這不是精準真人數：同一人在不同裝置／清除儲存會重複計數，阻擋追蹤或 GPC/DNT 的訪客不會記錄；瀏覽器可匿名關閉統計。資料最多保留約三個月，不能回填過去流量。更新時間：{new Date(data.generatedAt).toLocaleString("zh-TW")}。</p></>}
 </main>;
}
