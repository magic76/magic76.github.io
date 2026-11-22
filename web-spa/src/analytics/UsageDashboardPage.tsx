import {useEffect,useMemo,useState} from "react";
import {AccountStatsPanel} from "./AccountStatsPanel";
import {MembershipDiagnosticsPanel} from "./MembershipDiagnosticsPanel";
import {UsageOverviewCards} from "./UsageOverviewCards";
import {FortuneUsagePanel} from "./FortuneUsagePanel";
import {PlatformUsagePanel,type PlatformUsage} from "./PlatformUsagePanel";
import "./usage-dashboard.css";
import {UsageJourneySection,type JourneyCounts} from "./UsageJourneySection";
import {RetentionUsagePanel,type RetentionSummary} from "./RetentionUsagePanel";
import {SoulsUsagePanel} from "./SoulsUsagePanel";
import {names,categories,games,eventRatio,chatStart,chatSpeech,chatReply,chatEffective,type Category} from "./usageDashboardDefinitions";
import {UsageExportControls} from "./UsageExportControls";
import {num,total,totalMany,type Row,type EventUsers} from "./usageExport";

type Report={
 days:number;activeUsers:number;chatUsers:number;platformBreakdown?:PlatformUsage[];
 previousActiveUsers:number;previousChatUsers:number;
 eventUsers:EventUsers[];rows:Row[];generatedAt:string;
 magicDiagnostics?:{entrySessions:number};
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
  <a href="#fortune-usage" className="usage-jump">命理成效</a>
  <a href="#guest-trial-stats" className="usage-jump">免費試用統計</a>
  <a href="/usage/feedback" className="usage-jump">意見回饋管理</a>
  <a href="/fortune/report-lab" className="usage-jump usage-report-lab-link" aria-label="開啟專屬命書私人驗收台">專屬命書驗收</a>
  <UsageExportControls data={data} days={days} category={selected} bars={bars} categoryEventTotal={totalMany(rows,selected.events)} disabled={loading||!!error||!data||data.days!==days}/>
  <span className="usage-source">資料來源：Cloudflare Web 事件（Android Firebase 另計）</span>
 </div>
</section>
{loading?<section className="panel section" role="status">正在讀取匿名使用事件…</section>:
 error?<section className="panel section" role="alert"><strong>無法讀取使用資料</strong><p>{error}</p><p className="meta">請確認 Cloudflare Access、Analytics Engine Binding 與唯讀 Token，參考 docs/CREW_USAGE.md。</p></section>:
 data&&<>
  <UsageOverviewCards data={data} rows={rows}/>
  <FortuneUsagePanel rows={rows} eventUsers={data.eventUsers}/>
  <RetentionUsagePanel retention={data.retention} returned={data.journey?.returned||0} engagedReturned={unique("user_returned_engaged")} days={days}/>
  <AccountStatsPanel/>
  <MembershipDiagnosticsPanel/>
  <PlatformUsagePanel rows={data.platformBreakdown}/>
  <UsageJourneySection days={days} journey={data.journey}/>
  <SoulsUsagePanel rows={rows} unique={unique}/>
  <section className="panel section" aria-label="Magic 事件診斷">
   <div className="section-head"><h2>Magic 事件診斷</h2><small>同一統計期間 · 不含個人識別資料</small></div>
   <div className="usage-feature-list">
    <div className="usage-feature"><span>頁面進入事件（加權）</span><strong>{num(total(rows,"magic_enter"))} 次</strong></div>
    <div className="usage-feature"><span>進入過的不同瀏覽器</span><strong>{num(unique("magic_enter"))} 個</strong></div>
    <div className="usage-feature"><span>進入過的不同工作階段</span><strong>{data.magicDiagnostics?num(data.magicDiagnostics.entrySessions)+" 個":"—"}</strong></div>
    <div className="usage-feature"><span>施法／語音連線成功</span><strong>{num(total(rows,"magic_spell"))} / {num(total(rows,"magic_voice_connected"))} 次</strong></div>
    <div className="usage-feature"><span>3D 降級</span><strong>{num(total(rows,"magic_3d_fallback"))} 次</strong></div>
   </div>
   <p className="usage-explain">進入事件在 Magic 頁面載入時送出，不代表已開始遊玩。次數使用 Analytics Engine 取樣加權；不同瀏覽器與工作階段是去重計數，不能直接視為真人數。正式站自動化瀏覽也可能計入。</p>
  </section>
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
  <section id="guest-trial-stats" className="panel section">
   <div className="section-head"><h2>免費體驗（5 分鐘）</h2><small>匿名使用率統計 · 老師／朋友</small></div>
   <div className="usage-guest-overview" aria-label="免費試用成效摘要">
    {[
     {label:"看到可用入口",event:"guest_trial_entry_view",hint:"約 "+num(unique("guest_trial_entry_view"))+" 個瀏覽器"},
     {label:"按下開始",event:"guest_trial_start_click",hint:"相對入口曝光 "+eventRatio(total(rows,"guest_trial_start_click"),total(rows,"guest_trial_entry_view"))},
     {label:"取得語音憑證",event:"guest_trial_token_issued",hint:"相對開始次數 "+eventRatio(total(rows,"guest_trial_token_issued"),total(rows,"guest_trial_start_click"))},
     {label:"成功語音連線",event:"guest_trial_connected",hint:"相對發證次數 "+eventRatio(total(rows,"guest_trial_connected"),total(rows,"guest_trial_token_issued"))}
    ].map(x=><article key={x.event} className="usage-guest-metric"><small>{x.label}</small><strong>{num(total(rows,x.event))}</strong><span>{x.hint}</span></article>)}
   </div>
   <p className="usage-explain">以上百分比只比較事件總次數，不是同一批訪客的精準轉換率；瀏覽器停用統計、重試或遺失事件都會影響結果。</p>
   <div className="usage-funnel">
    {[
     {label:"看見免費試用",event:"guest_trial_entry_view"},
     {label:"按下開始",event:"guest_trial_start_click"},
     {label:"成功取得短效憑證",event:"guest_trial_token_issued"},
     {label:"真正連上語音",event:"guest_trial_connected"},
     {label:"對話結束",event:"guest_trial_ended"}
    ].map((step,i)=>{
     const value=total(rows,step.event),base=Math.max(1,total(rows,"guest_trial_entry_view"));
     return <div key={step.event} className="usage-funnel-step"><div><span>{i+1}. {step.label}</span><strong>{num(value)} 次</strong></div>
      <div className="usage-funnel-track"><span style={{width:Math.min(100,value/base*100)+"%"}}/></div>
     </div>;
    })}
   </div>
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
    <div className="usage-feature"><span>實際對話時長</span>
     <strong>不到 15 秒 {num(total(rows,"guest_trial_ended","under_15s"))} · 15–45 秒 {num(total(rows,"guest_trial_ended","from_15_to_45s"))} · 45–60 秒 {num(total(rows,"guest_trial_ended","from_45_to_60s"))} · 1–2 分鐘 {num(total(rows,"guest_trial_ended","from_60_to_120s"))} · 2–3 分鐘 {num(total(rows,"guest_trial_ended","from_120_to_180s"))} · 3–5 分鐘 {num(total(rows,"guest_trial_ended","from_180_to_300s"))}</strong>
    </div>
   </div>
   <p className="usage-explain">這是尊重隱私設定的瀏覽器端事件，並非 Worker 實際發證總數。若停用統計、頁面突然關閉或多次重試，前後階段數量可能不一致；無法拿來限制每位使用者的試用次數。登入與每人計數留待第三階段。</p>
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
  <div className="usage-panels">
   <section className="panel section">
    <div className="section-head"><h2>Crew Town 3D</h2><small>使用深度與 3D 相容性</small></div>
    <div className="usage-feature-list">
     {[["進入小鎮","town_enter"],["選擇角色或街區","town_interaction"],["轉入 Live 聊天","town_chat_click"],["3D 自動降級","town_3d_fallback"]].map(([label,event])=><div className="usage-feature" key={event}><span>{label}</span><strong>{num(total(rows,event))} 次</strong></div>)}
    </div>
    <p className="usage-explain">3D 降級含不支援與繪製失敗，手動切換另計；轉入聊天不代表已成功建立連線。</p>
   </section>
   <section className="panel section">
    <div className="section-head"><h2>Crew Magic</h2><small>施法、互動與 Live</small></div>
    <div className="usage-feature-list">
     {[["進入 Magic","magic_enter"],["施法成功","magic_spell"],["回答魔法挑戰","magic_challenge_answer"],["互動卡選擇","magic_panel_choice"],["語音連線成功","magic_voice_connected"],["語音連線失敗","magic_voice_failed"],["3D 自動降級","magic_3d_fallback"],["重新創造世界","magic_world_reset"]].map(([label,event])=><div className="usage-feature" key={event}><span>{label}</span><strong>{num(total(rows,event))} 次</strong></div>)}
    </div>
   </section>
  </div>
  <div className="usage-panels">
   <section className="panel section">
    <div className="section-head"><h2>Crew Mate</h2><small>交代到完成</small></div>
    <div className="usage-feature-list">
     {[["進入 Mate","mate_open"],["整理交代成功","mate_briefing_ready"],["交接連線成功","mate_handoff_started"],["任務完成","mate_handoff_completed"],["交接連線失敗","mate_handoff_failed"]].map(([label,event])=><div className="usage-feature" key={event}><span>{label}</span><strong>{num(total(rows,event))} 次</strong></div>)}
    </div>
   </section>
   <section className="panel section">
    <div className="section-head"><h2>Briefing / 交流圈</h2><small>閱讀與有效參與</small></div>
    <div className="usage-feature-list">
     {[["研究文章開啟","research_article_open"],["研究收藏","research_article_saved"],["研究已讀完","research_article_completed"],["研究原始來源","research_source_open"],["交流圈留言展開","circle_thread_open"],["交流圈貼文發布","circle_post_published"],["交流圈留言發送","circle_comment_posted"]].map(([label,event])=><div className="usage-feature" key={event}><span>{label}</span><strong>{num(total(rows,event))} 次</strong></div>)}
    </div>
    <p className="usage-explain">交流圈同時含示範與正式操作；示範互動不代表實際發佈到群組。</p>
   </section>
  </div>
  <section className="panel section">
   <div className="section-head"><h2>首頁與探索入口</h2><small>入口點擊次數，不等於實際有效使用</small></div>
   <div className="usage-feature-list">
    {["learn","story","fortune","timeline","play","briefing","town","magic","mate","shorts","circle"].map(detail=><div className="usage-feature" key={detail}><span>{detail}</span><strong>首頁 {num(total(rows,"home_entry_click",detail))} · 探索 {num(total(rows,"explore_entry_click",detail))}</strong></div>)}
   </div>
  </section>
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
  <p className="usage-note">這是匿名瀏覽器統計，不是可識別的真人數，也不包含 Android Firebase 的原生事件。無法區分同一人在不同裝置的瀏覽器，亦不會記錄已選擇退出或使用 GPC／DNT 的訪客。Cloudflare Analytics Engine 可能抽樣，去重數為近似值。過去缺失的事件不會回填；資料最長保留約三個月。更新：{new Date(data.generatedAt).toLocaleString("zh-TW")}。</p>
 </>}
 </main>;
}
