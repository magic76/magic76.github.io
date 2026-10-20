import {useEffect,useMemo,useState} from "react";
import "./usage-dashboard.css";

type Row={day:string;event:string;detail?:string;count:number;users:number};
type EventUsers={event:string;users:number};
type Report={
 days:number;activeUsers:number;chatUsers:number;
 previousActiveUsers:number;previousChatUsers:number;
 eventUsers:EventUsers[];rows:Row[];generatedAt:string
};
type Category="all"|"chat"|"timeline"|"shorts"|"games"|"learning"|"story"|"fortune";

const names:Record<string,string>={
 app_opened:"開啟網站",visitor_first_seen:"首次造訪瀏覽器",user_returned:"跨日回訪事件",
 teacher_conversation:"老師有效雙向對話",friend_conversation:"朋友有效雙向對話",
 timeline_conversation:"Timeline 有效雙向對話",
 teacher_conversation_start:"老師連線成功",friend_conversation_start:"朋友連線成功",
 timeline_conversation_start:"Timeline 連線成功",
 teacher_user_spoke:"老師 · 使用者開口",friend_user_spoke:"朋友 · 使用者開口",timeline_user_spoke:"Timeline · 使用者開口",
 teacher_ai_replied:"老師 · AI 已回覆",friend_ai_replied:"朋友 · AI 已回覆",timeline_ai_replied:"Timeline · AI 已回覆",
 timeline_view:"Timeline 人生探索",
 shorts_view:"Shorts 瀏覽",shorts_chat_click:"Shorts 點擊聊天",shorts_conversation:"Shorts 有效聊天",
 game_open:"遊戲頁面開啟",game_started:"開始遊戲",game_completed:"完成遊戲",
 vocabulary_practice:"單字作答",textbook_study:"教材語音開始",textbook_open:"教材陪讀開啟",
 story_reading:"故事閱讀",story_narration:"語音說故事",story_created:"故事創作",
 fortune_calculated:"命盤計算",fortune_ai_interpreted:"AI 命理解讀",
 gemini_key_missing:"缺少 Gemini Key",gemini_key_verified:"Gemini Key 驗證成功"
};
const categories:{id:Category;label:string;events:string[]}[]=[
 {id:"all",label:"所有有效互動",events:["teacher_conversation","friend_conversation","timeline_conversation","game_completed","vocabulary_practice","textbook_study","story_reading","story_narration","story_created","fortune_calculated","fortune_ai_interpreted"]},
 {id:"chat",label:"老師／朋友聊天",events:["teacher_conversation","friend_conversation","timeline_conversation"]},
 {id:"timeline",label:"Timeline",events:["timeline_view","timeline_conversation_start","timeline_conversation"]},
 {id:"shorts",label:"Shorts",events:["shorts_view","shorts_chat_click","shorts_conversation"]},
 {id:"games",label:"遊戲",events:["game_open","game_started","game_completed"]},
 {id:"learning",label:"學習",events:["vocabulary_practice","textbook_study"]},
 {id:"story",label:"故事",events:["story_reading","story_narration","story_created"]},
 {id:"fortune",label:"命理",events:["fortune_calculated","fortune_ai_interpreted"]}
];
const games:{id:string;label:string}[]=[
 {id:"taboo",label:"Taboo 描述猜詞"},{id:"1a2b",label:"1A2B 猜數字"},
 {id:"gomoku",label:"五子棋"},{id:"connect4",label:"四子棋"},
 {id:"reversi",label:"黑白棋"},{id:"twenty-questions",label:"20 Questions"},{id:"mystery",label:"海龜湯"}
];
const num=(n:number)=>Math.round(n).toLocaleString("zh-TW");
const total=(rows:Row[],name:string,detail?:string)=>rows.filter(r=>r.event===name&&(detail===undefined||r.detail===detail)).reduce((sum,r)=>sum+r.count,0);
const totalMany=(rows:Row[],events:string[])=>events.reduce((sum,event)=>sum+total(rows,event),0);
const comparison=(current:number,previous:number)=>previous===0
 ? "前一期尚無可比較的使用紀錄"
 : `較前一期 ${current>=previous?"+":""}${num(current-previous)}（${current>=previous?"+":""}${Math.round((current-previous)/previous*100)}%）`;
const chatStart=["teacher_conversation_start","friend_conversation_start","timeline_conversation_start"];
const chatSpeech=["teacher_user_spoke","friend_user_spoke","timeline_user_spoke"];
const chatReply=["teacher_ai_replied","friend_ai_replied","timeline_ai_replied"];
const chatEffective=["teacher_conversation","friend_conversation","timeline_conversation"];

export function UsageDashboardPage(){
 const[days,setDays]=useState<7|30>(7),[category,setCategory]=useState<Category>("all");
 const[data,setData]=useState<Report|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 useEffect(()=>{
  let cancelled=false;setLoading(true);setError("");setData(null);
  void fetch("/api/usage/report?days="+days,{credentials:"same-origin",cache:"no-store"})
   .then(async reply=>{
    if(!reply.ok)throw new Error(reply.status===403?"尚未通過 Cloudflare Access 驗證，或管理員身分設定不完整。":"查詢失敗（HTTP "+reply.status+"）");
    const result=await reply.json() as Report;
    if(!Array.isArray(result.rows)||!Array.isArray(result.eventUsers))throw new Error("報表格式尚未更新，請重新部署 Cloudflare Pages。");
    return result;
   })
   .then(value=>{if(!cancelled)setData(value)})
   .catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:"無法查詢使用統計")})
   .finally(()=>{if(!cancelled)setLoading(false)});
  return()=>{cancelled=true};
 },[days]);
 const rows=data?.rows||[];
 const unique=(event:string)=>data?.eventUsers.find(item=>item.event===event)?.users||0;
 const selected=categories.find(item=>item.id===category)||categories[0];
 const bars=useMemo(()=>{
  const today=new Date();
  return Array.from({length:days},(_,i)=>{
   const date=new Date(today);date.setUTCDate(date.getUTCDate()-(days-1-i));
   const day=date.toISOString().slice(0,10);
   return{day,count:(data?.rows||[]).filter(row=>row.day===day&&selected.events.includes(row.event)).reduce((n,row)=>n+row.count,0)};
  });
 },[data,days,category]);
 const max=Math.max(1,...bars.map(item=>item.count));
 const statEvents=categories[0].events;
 const stats=[
  {name:"老師",start:"teacher_conversation_start",spoke:"teacher_user_spoke",reply:"teacher_ai_replied",success:"teacher_conversation"},
  {name:"朋友",start:"friend_conversation_start",spoke:"friend_user_spoke",reply:"friend_ai_replied",success:"friend_conversation"},
  {name:"Timeline",start:"timeline_conversation_start",spoke:"timeline_user_spoke",reply:"timeline_ai_replied",success:"timeline_conversation"}
 ];
 return <main className="usage-dashboard">
  <section className="hero">
   <span className="kicker">CREW / PRIVATE ANALYTICS</span>
   <h1>Crew Usage</h1>
   <p>看有多少瀏覽器真正互動、完成對話，以及哪些功能值得持續投入。</p>
   <div className="usage-toolbar" role="group" aria-label="統計期間">
    <button type="button" aria-pressed={days===7} onClick={()=>setDays(7)}>最近 7 天</button>
    <button type="button" aria-pressed={days===30} onClick={()=>setDays(30)}>最近 30 天</button>
    <span className="usage-source">資料來源：Web · Cloudflare（不含 Android）</span>
   </div>
  </section>
  {loading?<section className="panel section" role="status">正在讀取匿名使用事件…</section>:
   error?<section className="panel section" role="alert"><strong>無法讀取使用資料</strong><p>{error}</p><p className="meta">請確認 Cloudflare Access、Analytics Engine Binding 與唯讀 Token，參考 docs/CREW_USAGE.md。</p></section>:
   data&&<>
    <section className="usage-cards" aria-label="主要指標">
     <article className="panel"><small>有效使用瀏覽器</small><strong>{num(data.activeUsers)}</strong><span>{comparison(data.activeUsers,data.previousActiveUsers)}</span></article>
     <article className="panel"><small>真的聊過天的瀏覽器</small><strong>{num(data.chatUsers)}</strong><span>{comparison(data.chatUsers,data.previousChatUsers)}</span></article>
     <article className="panel"><small>有效對話次數</small><strong>{num(totalMany(rows,chatEffective))}</strong><span>老師＋朋友＋Timeline，兩方都有說話</span></article>
     <article className="panel"><small>網站開啟次數</small><strong>{num(total(rows,"app_opened"))}</strong><span>每分頁工作階段最多一次，不是獨立人數</span></article>
    </section>
    <section className="panel section">
     <div className="section-head"><h2>每天實際發生了什麼</h2><small>UTC 日期 · 下方統計的是事件次數</small></div>
     <div className="usage-filter" role="group" aria-label="篩選產品類別">
      {categories.map(group=><button key={group.id} type="button" aria-pressed={category===group.id} onClick={()=>setCategory(group.id)}>{group.label}</button>)}
     </div>
     <div className="usage-bars" role="img" aria-label={selected.label+"每日事件次數"}>
      {bars.map(item=><div key={item.day} className="usage-bar-column" title={item.day+"："+num(item.count)}>
       <div className="usage-bar-value">{item.count?num(item.count):""}</div>
       <div className="usage-bar-track"><div className="usage-bar" style={{height:item.count/max*100+"%"}}/></div>
       {days===7&&<small>{item.day.slice(5)}</small>}
      </div>)}
     </div>
     <p className="usage-explain">目前篩選：{selected.label} · {num(totalMany(rows,selected.events))} 次事件。各階段的事件可能來自同一個瀏覽器，不應視為不同使用者。</p>
    </section>
    <section className="panel section">
     <div className="section-head"><h2>聊天互動漏斗</h2><small>事件次數 · 非同一批人的精準轉換率</small></div>
     <div className="usage-funnel">
      {[
       {label:"成功建立語音連線",events:chatStart},
       {label:"使用者真正發話",events:chatSpeech},
       {label:"AI 在發話後回覆",events:chatReply},
       {label:"完成有效雙向對話",events:chatEffective}
      ].map((stage,i)=>{
       const value=totalMany(rows,stage.events);
       const denominator=Math.max(1,totalMany(rows,chatStart));
       return <div key={stage.label} className="usage-funnel-step">
        <div><span>{i+1}. {stage.label}</span><strong>{num(value)} 次</strong></div>
        <div className="usage-funnel-track"><span style={{width:Math.min(100,value/denominator*100)+"%"}}/></div>
       </div>;
      })}
     </div>
     <p className="usage-explain">漏斗並非使用者追蹤：分開統計事件，再比較數量；不同日期、重連或多角色可能影響前後段關係。新事件從更新後才有資料。</p>
     <div className="usage-feature-list usage-role-list">
      {stats.map(item=><div className="usage-feature" key={item.name}><span><strong>{item.name}</strong><small>有效對話去重瀏覽器 {num(unique(item.success))}</small></span>
       <span>連線 {num(total(rows,item.start))} · 發話 {num(total(rows,item.spoke))} · 回覆 {num(total(rows,item.reply))} · <b>有效 {num(total(rows,item.success))}</b></span></div>)}
     </div>
    </section>
    <div className="usage-panels">
     <section className="panel section">
      <div className="section-head"><h2>Timeline</h2><small>人生角色互動</small></div>
      <div className="usage-feature-list">
       {[
        {label:"瀏覽人生",event:"timeline_view"},
        {label:"連線開始聊天",event:"timeline_conversation_start"},
        {label:"真正完成雙向對話",event:"timeline_conversation"}
       ].map(x=><div className="usage-feature" key={x.event}><span>{x.label}</span><strong>{num(total(rows,x.event))} 次</strong></div>)}
      </div>
      <p className="usage-explain">人物探索分布：{["mira","ethan","hana"].map(id=>id.toUpperCase()+" "+num(total(rows,"timeline_view",id))).join(" · ")}</p>
     </section>
     <section className="panel section">
      <div className="section-head"><h2>Crew Shorts</h2><small>動態有沒有帶動聊天</small></div>
      <div className="usage-feature-list">
       {[
        {label:"瀏覽 Shorts",event:"shorts_view"},
        {label:"點擊聊天入口",event:"shorts_chat_click"},
        {label:"真正聊成功",event:"shorts_conversation"}
       ].map(x=><div className="usage-feature" key={x.event}><span>{x.label}</span><strong>{num(total(rows,x.event))} 次</strong></div>)}
      </div>
      <p className="usage-explain">此處為各步驟總次數，不等於同一篇動態的逐人轉換率。</p>
     </section>
    </div>
    <section className="panel section">
     <div className="section-head"><h2>Crew Games</h2><small>開啟、實際開始、完成局數</small></div>
     <div className="usage-feature-list">
      {games.map(item=><div className="usage-feature" key={item.id}>
       <span>{item.label}</span><strong>開啟 {num(total(rows,"game_open",item.id))} · 開始 {num(total(rows,"game_started",item.id))} · 完成 {num(total(rows,"game_completed",item.id))}</strong>
      </div>)}
     </div>
    </section>
    <div className="usage-panels">
     <section className="panel section">
      <div className="section-head"><h2>其他有效功能</h2><small>去重瀏覽器為整段期間計算</small></div>
      <div className="usage-feature-list">
       {statEvents.filter(name=>!chatEffective.includes(name)&&name!=="game_completed").map(event=><div className="usage-feature" key={event}>
        <span>{names[event]||event}<small>{num(unique(event))} 個瀏覽器</small></span><strong>{num(total(rows,event))} 次</strong>
       </div>)}
      </div>
     </section>
     <section className="panel section">
      <div className="section-head"><h2>進站、回訪與 API Key</h2></div>
      <div className="usage-feature-list">
       {["visitor_first_seen","user_returned","gemini_key_missing","gemini_key_verified","textbook_open"].map(event=><div className="usage-feature" key={event}>
        <span>{names[event]}</span><strong>{num(total(rows,event))} 次</strong>
       </div>)}
      </div>
      <p className="usage-explain">跨日回訪數是事件次數，並非整段期間的回訪人數。缺少 Key 不代表聊天失敗。</p>
     </section>
    </div>
    <p className="usage-note">這是匿名瀏覽器統計，不是可識別的真人數，也不包含 Android Firebase 的使用者。無法區分同一人在不同裝置的瀏覽器，亦不會記錄已選擇退出或使用 GPC／DNT 的訪客。Cloudflare Analytics Engine 可能抽樣，去重數為近似值。過去缺失的事件不會回填；資料最長保留約三個月。更新：{new Date(data.generatedAt).toLocaleString("zh-TW")}。</p>
   </>}
 </main>;
}
