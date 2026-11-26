import {useEffect,useMemo,useState} from "react";
import {AccountStatsPanel} from "./AccountStatsPanel";
import {MembershipDiagnosticsPanel} from "./MembershipDiagnosticsPanel";
import {FreeQuotaPanel} from "./FreeQuotaPanel";
import {UsageOverviewCards} from "./UsageOverviewCards";
import {FortuneUsagePanel} from "./FortuneUsagePanel";
import {PlatformUsagePanel,type PlatformUsage} from "./PlatformUsagePanel";
import "./usage-dashboard.css";
import {UsageJourneySection,type JourneyCounts} from "./UsageJourneySection";
import {RetentionUsagePanel,type RetentionSummary} from "./RetentionUsagePanel";
import {SoulsUsagePanel} from "./SoulsUsagePanel";
import {categories,games,eventRatio,chatStart,chatSpeech,chatReply,chatEffective,type Category} from "./usageDashboardDefinitions";
import {UsageExportControls} from "./UsageExportControls";
import {num,total,totalMany,type Row,type EventUsers} from "./usageExport";

type Report={
 days:number;activeUsers:number;chatUsers:number;platformBreakdown?:PlatformUsage[];
 previousActiveUsers:number;previousChatUsers:number;
 eventUsers:EventUsers[];rows:Row[];generatedAt:string;
 journey?:JourneyCounts;retention?:RetentionSummary
};
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
const today=new Date(Date.now()+8*3600000);
return Array.from({length:days},(_,i)=>{
 const date=new Date(today);date.setUTCDate(date.getUTCDate()-(days-1-i));
 const day=date.toISOString().slice(0,10);
 return{day,count:(data?.rows||[]).filter(row=>row.day===day&&selected.events.includes(row.event)).reduce((n,row)=>n+row.count,0)};
});
 },[data,days,category]);
 const max=Math.max(1,...bars.map(item=>item.count));
 const stats=[
{name:"老師",start:"teacher_conversation_start",spoke:"teacher_user_spoke",reply:"teacher_ai_replied",success:"teacher_conversation"},
{name:"朋友",start:"friend_conversation_start",spoke:"friend_user_spoke",reply:"friend_ai_replied",success:"friend_conversation"},
{name:"Timeline",start:"timeline_conversation_start",spoke:"timeline_user_spoke",reply:"timeline_ai_replied",success:"timeline_conversation"}
 ];
 return <main className="usage-dashboard">
<section className="hero">
 <span className="kicker hero-context">KOOLO / PRIVATE ANALYTICS</span>
 <h1>Koolo Usage</h1>
 <p>追蹤成長、聊天、學習、命理與免費用量。</p>
 <div className="usage-toolbar" role="group" aria-label="統計期間">
  <button type="button" aria-pressed={days===7} onClick={()=>setDays(7)}>最近 7 天</button>
  <button type="button" aria-pressed={days===30} onClick={()=>setDays(30)}>最近 30 天</button>
  <a href="#usage-chat" className="usage-jump">聊天</a>
  <a href="#usage-learning" className="usage-jump">學習</a>
  <a href="#fortune-usage" className="usage-jump">命理成效</a>
  <a href="#free-quota" className="usage-jump">免費額度管理</a>
  <a href="/usage/feedback" className="usage-jump">意見回饋管理</a>
  <UsageExportControls data={data} days={days} category={selected} bars={bars} categoryEventTotal={totalMany(rows,selected.events)} disabled={loading||!!error||!data||data.days!==days}/>
  <span className="usage-source">資料來源：Cloudflare Web 事件（Android Firebase 另計）</span>
 </div>
</section>
{loading?<section className="panel section" role="status">正在讀取匿名使用事件…</section>:
 error?<section className="panel section" role="alert"><strong>無法讀取使用資料</strong><p>{error}</p><p className="meta">請確認 Cloudflare Access、Analytics Engine Binding 與唯讀 Token，參考 docs/CREW_USAGE.md。</p></section>:
 data&&<>
  <UsageOverviewCards data={data} rows={rows}/>
  <AccountStatsPanel/>
  <RetentionUsagePanel retention={data.retention} returned={data.journey?.returned||0} engagedReturned={unique("user_returned_engaged")} days={days}/>
  <section className="panel section">
   <div className="section-head"><h2>每天實際發生了什麼</h2><small>台灣日期 · 下方統計的是事件次數</small></div>
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
  <section id="usage-chat" className="panel section">
   <div className="section-head"><h2>AI 聊天</h2><small>事件次數 · 非同一批人的精準轉換率</small></div>
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
   <p className="usage-explain">漏斗並非使用者追蹤：分開統計事件，再比較數量；不同日期、重連或多角色可能影響前後段關係。主要反映語音 Live 與已追蹤對話；一般文字聊天多數未計入。</p>
   <div className="usage-feature-list usage-role-list">
    {stats.map(item=><div className="usage-feature" key={item.name}><span><strong>{item.name}</strong><small>有效對話去重瀏覽器 {num(unique(item.success))}</small></span>
     <span>連線 {num(total(rows,item.start))} · 發話 {num(total(rows,item.spoke))} · 回覆 {num(total(rows,item.reply))} · <b>有效 {num(total(rows,item.success))}</b></span></div>)}
   </div>
  </section>
  <section id="usage-learning" className="panel section">
   <div className="section-head"><h2>語言學習</h2><small>已追蹤的學習事件</small></div>
   <div className="usage-feature-list">
    {[
     ["老師有效對話","teacher_conversation"],["單字作答","vocabulary_practice"],
     ["教材陪讀開啟","textbook_open"],["教材語音開始","textbook_study"],
     ["SEO 教材完成","seo_quiz_completed"]
    ].map(([label,event])=><div className="usage-feature" key={event}><span>{label}<small>{num(unique(event))} 個瀏覽器</small></span><strong>{num(total(rows,event))} 次</strong></div>)}
   </div>
   <p className="usage-explain">片語、情境課程與互動白板尚未有獨立統計，不以零次代替缺少的資料。</p>
  </section>
  <FortuneUsagePanel rows={rows} eventUsers={data.eventUsers}/>
  <section className="panel section" id="usage-ranking">
   <div className="section-head"><h2>功能使用排行榜</h2><small>依代表性事件次數排序</small></div>
   <div className="usage-feature-list">
    {[
     ["AI 老師","有效對話","teacher_conversation"],["AI 朋友","有效對話","friend_conversation"],
     ["語言學習","單字作答","vocabulary_practice"],["教材","語音開始","textbook_study"],
     ["命理","命盤計算","fortune_calculated"],["遊戲","完成局數","game_completed"],
     ["故事","閱讀","story_reading"],["Timeline","有效對話","timeline_conversation"],
     ["Shorts","有效聊天","shorts_conversation"],["Souls","有效對話","souls_conversation"],
     ["研究情報","文章開啟","research_article_open"],["Town 3D","互動","town_interaction"],
     ["Mate","完成任務","mate_handoff_completed"]
    ].map(([label,metric,event])=>({label,metric,event,count:total(rows,event)})).sort((a,b)=>b.count-a.count).map(item=><div className="usage-feature" key={item.event}><span>{item.label}<small>{item.metric} · 約 {num(unique(item.event))} 個瀏覽器</small></span><strong>{num(item.count)} 次</strong></div>)}
   </div>
   <p className="usage-explain">不同功能的代表事件不等價，僅供使用頻率參考；不是獨立使用者排名或完整的功能互動總數。</p>
  </section>
  <section id="guest-trial-stats" className="panel section">
   <div className="section-head"><h2>免費語音體驗</h2><small>匿名語音事件 · 老師／朋友</small></div>
   <div className="usage-guest-overview" aria-label="免費試用成效摘要">
    {[
     {label:"看到可用入口",event:"guest_trial_entry_view",hint:"約 "+num(unique("guest_trial_entry_view"))+" 個瀏覽器"},
     {label:"按下開始",event:"guest_trial_start_click",hint:"相對入口曝光 "+eventRatio(total(rows,"guest_trial_start_click"),total(rows,"guest_trial_entry_view"))},
     {label:"取得語音憑證",event:"guest_trial_token_issued",hint:"相對開始次數 "+eventRatio(total(rows,"guest_trial_token_issued"),total(rows,"guest_trial_start_click"))},
     {label:"成功語音連線",event:"guest_trial_connected",hint:"相對發證次數 "+eventRatio(total(rows,"guest_trial_connected"),total(rows,"guest_trial_token_issued"))}
    ].map(x=><article key={x.event} className="usage-guest-metric"><small>{x.label}</small><strong>{num(total(rows,x.event))}</strong><span>{x.hint}</span></article>)}
   </div>
   <p className="usage-explain">以上百分比只比較事件總次數，不是同一批訪客的精準轉換率；瀏覽器停用統計、重試或遺失事件都會影響結果。</p>
   <details className="usage-fold usage-inline-fold"><summary>角色、失敗原因與對話時長</summary>
   <div className="usage-feature-list">
    {(["teacher","friend"] as const).map(role=><div className="usage-feature" key={role}>
     <span>{role==="teacher"?"AI 老師":"AI 朋友"}</span>
     <strong>曝光 {num(total(rows,"guest_trial_entry_view",role))} · 點擊 {num(total(rows,"guest_trial_start_click",role))} · 發證 {num(total(rows,"guest_trial_token_issued",role))} · 連線 {num(total(rows,"guest_trial_connected",role))}</strong>
    </div>)}
    <div className="usage-feature"><span>試用入口不可用</span><strong>{num(total(rows,"guest_trial_unavailable"))} 次</strong></div>
    <div className="usage-feature"><span>憑證失敗</span><strong>{num(total(rows,"guest_trial_token_failed"))} 次</strong></div>
    <div className="usage-feature"><span>連線失敗</span><strong>{num(total(rows,"guest_trial_connect_failed"))} 次</strong></div>
    <div className="usage-feature"><span>麥克風未授權</span><strong>{num(total(rows,"guest_trial_mic_denied"))} 次</strong></div>
    <div className="usage-feature"><span>其他準備失敗</span><strong>{num(total(rows,"guest_trial_setup_failed"))} 次</strong></div>
    <div className="usage-feature"><span>對話結束</span><strong>{num(total(rows,"guest_trial_ended"))} 次</strong></div>
    <div className="usage-feature"><span>實際對話時長</span>
     <strong>不到 15 秒 {num(total(rows,"guest_trial_ended","under_15s"))} · 15–45 秒 {num(total(rows,"guest_trial_ended","from_15_to_45s"))} · 45–60 秒 {num(total(rows,"guest_trial_ended","from_45_to_60s"))} · 1–2 分鐘 {num(total(rows,"guest_trial_ended","from_60_to_120s"))} · 2–3 分鐘 {num(total(rows,"guest_trial_ended","from_120_to_180s"))} · 3–5 分鐘 {num(total(rows,"guest_trial_ended","from_180_to_300s"))}</strong>
    </div>
   </div>
   </details>
   <p className="usage-explain">這是尊重隱私設定的瀏覽器端事件，並非 Worker 實際發證總數。若停用統計、頁面突然關閉或多次重試，前後階段數量可能不一致；無法拿來限制每位使用者的試用次數。現行額度以免費額度管理的伺服器資料為準。</p>
  </section>
  <details className="usage-fold panel section"><summary>進階分析（平台、旅程、遊戲與入口）</summary>
   <PlatformUsagePanel rows={data.platformBreakdown}/>
   <UsageJourneySection days={days} journey={data.journey} rows={rows}/>
   <SoulsUsagePanel rows={rows} unique={unique}/>
   <section className="panel section">
    <div className="section-head"><h2>Shorts 聊天轉換</h2></div>
    <div className="usage-feature-list">
     {[
      ["瀏覽 Shorts","shorts_view"],["點擊聊天入口","shorts_chat_click"],["有效聊天","shorts_conversation"]
     ].map(([label,event])=><div className="usage-feature" key={event}><span>{label}</span><strong>{num(total(rows,event))} 次</strong></div>)}
    </div>
    <p className="usage-explain">各階段事件總數，非逐人轉換率。</p>
   </section>
   <section className="panel section">
    <div className="section-head"><h2>首頁與探索入口</h2><small>入口點擊，不等於有效使用</small></div>
    <div className="usage-feature-list">
     {["learn","story","fortune","timeline","play","briefing","souls","shorts"].map(detail=><div className="usage-feature" key={detail}><span>{detail}</span><strong>首頁 {num(total(rows,"home_entry_click",detail))} · 探索 {num(total(rows,"explore_entry_click",detail))}</strong></div>)}
    </div>
   </section>
   <section className="panel section">
    <div className="section-head"><h2>遊戲明細</h2><small>依完成局數排序</small></div>
    <div className="usage-feature-list">
     {[...games].sort((a,b)=>total(rows,"game_completed",b.id)-total(rows,"game_completed",a.id)).map(item=><div className="usage-feature" key={item.id}><span>{item.label}</span><strong>開啟 {num(total(rows,"game_open",item.id))} · 開始 {num(total(rows,"game_started",item.id))} · 完成 {num(total(rows,"game_completed",item.id))}</strong></div>)}
    </div>
   </section>
   <section className="panel section">
    <div className="section-head"><h2>Gemini 自備 Key</h2></div>
    <div className="usage-feature-list">
     <div className="usage-feature"><span>缺少 Key</span><strong>{num(total(rows,"gemini_key_missing"))} 次</strong></div>
     <div className="usage-feature"><span>Key 驗證成功</span><strong>{num(total(rows,"gemini_key_verified"))} 次</strong></div>
    </div>
    <p className="usage-explain">驗證事件不是 BYOK 使用者占比；缺少 Key 不代表聊天失敗。</p>
   </section>
  </details>
  <p className="usage-note">這是匿名瀏覽器統計，不是可識別的真人數，也不包含 Android Firebase 的原生事件。無法區分同一人在不同裝置的瀏覽器，亦不會記錄已選擇退出或使用 GPC／DNT 的訪客。Cloudflare Analytics Engine 可能抽樣，去重數為近似值。過去缺失的事件不會回填；資料最長保留約三個月。更新：{new Date(data.generatedAt).toLocaleString("zh-TW")}。</p>
 </>}
 <FreeQuotaPanel/>
 <details className="usage-fold panel section">
  <summary>進階開發工具</summary>
  <div className="usage-toolbar" aria-label="開發工具">
   {data&&<a href="/sandbox-lab" className="usage-jump">即時互動沙盒</a>}
   <a href="/fortune/report-lab" className="usage-jump usage-report-lab-link" aria-label="開啟專屬命書私人驗收台">專屬命書驗收</a>
   <a href="https://koolo.app/admin/payment-test" className="usage-jump">正式金流驗證</a>
  </div>
  {data&&<MembershipDiagnosticsPanel/>}
 </details>
 </main>;
}
