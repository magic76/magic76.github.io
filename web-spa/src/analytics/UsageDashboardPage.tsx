import {useEffect,useMemo,useState} from "react";
import "./usage-dashboard.css";
import {UsageJourneySection,type JourneyCounts} from "./UsageJourneySection";
import {SoulsUsagePanel,SOULS_USAGE_EVENTS,SOULS_USAGE_NAMES} from "./SoulsUsagePanel";
import {UsageExportControls} from "./UsageExportControls";
import {num,total,totalMany,comparison,type Row,type EventUsers} from "./usageExport";

type Report={
 days:number;activeUsers:number;chatUsers:number;
 previousActiveUsers:number;previousChatUsers:number;
 eventUsers:EventUsers[];rows:Row[];generatedAt:string;
 journey?:JourneyCounts
};
type Category="all"|"guest"|"chat"|"timeline"|"shorts"|"games"|"learning"|"story"|"fortune"|"worlds"|"mate"|"souls"|"research"|"circle";

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
 game_route_loaded:"遊戲頁面載入完成",game_route_stalled:"遊戲載入超過 8 秒",game_route_asset_error:"遊戲資源載入失敗",
 vocabulary_practice:"單字作答",textbook_study:"教材語音開始",textbook_open:"教材陪讀開啟",
 story_reading:"故事閱讀",story_narration:"語音說故事",story_created:"故事創作",
 fortune_calculated:"命盤計算",fortune_ai_interpreted:"AI 命理解讀",
 fortune_identity_shared:"命格卡分享",fortune_identity_feedback:"命格卡回饋",fortune_identity_copy_link:"命格卡邀請連結複製",
 gemini_key_missing:"缺少 Gemini Key",gemini_key_verified:"Gemini Key 驗證成功",
 guest_trial_entry_view:"免費試用入口曝光",guest_trial_unavailable:"免費試用入口不可用",guest_trial_start_click:"點擊開始免費試用",guest_trial_mic_denied:"免費試用麥克風拒絕",guest_trial_setup_failed:"免費試用準備失敗",
 guest_trial_token_issued:"免費試用取得憑證",guest_trial_token_failed:"免費試用憑證失敗",guest_trial_connected:"免費試用連線成功",guest_trial_connect_failed:"免費試用連線失敗",guest_trial_ended:"免費試用結束",
 home_entry_click:"首頁入口點擊",explore_entry_click:"探索入口點擊",menu_open:"全部功能選單開啟",menu_item_click:"全部功能選單點擊",
 home_live_bubble_view:"Zoe 聊天泡泡曝光",home_live_bubble_click:"Zoe 聊天泡泡點擊",home_live_bubble_connected:"Zoe 泡泡成功連線",home_live_bubble_conversation:"Zoe 泡泡有效對話",
 home_gift_view:"盲盒曝光",home_gift_open:"盲盒開啟",home_gift_result:"盲盒抽中類別",home_gift_go:"盲盒進入體驗",home_gift_minimize:"盲盒縮小",
 ...SOULS_USAGE_NAMES,
 town_enter:"進入 Town 3D",town_interaction:"Town 互動",town_chat_click:"Town 轉入聊天",town_3d_fallback:"Town 3D 降級",
 magic_enter:"進入 Magic",magic_spell:"Magic 施法",magic_challenge_answer:"Magic 解謎",magic_panel_choice:"Magic 互動卡選擇",
 magic_voice_connected:"Magic 語音連線成功",magic_voice_failed:"Magic 語音連線失敗",magic_3d_fallback:"Magic 3D 降級",magic_world_reset:"Magic 世界重置",
 mate_open:"進入 Mate",mate_briefing_ready:"Mate 交代整理成功",mate_handoff_started:"Mate 交接連線成功",mate_handoff_completed:"Mate 完成任務",mate_handoff_failed:"Mate 交接連線失敗",
 research_article_open:"研究文章開啟",research_article_saved:"研究文章收藏",research_article_completed:"研究文章標記已讀",research_source_open:"研究原始來源開啟",
 circle_thread_open:"交流圈留言展開",circle_post_published:"交流圈發布貼文",circle_comment_posted:"交流圈送出留言"
};
const categories:{id:Category;label:string;events:string[]}[]=[
 {id:"all",label:"所有有效互動",events:["teacher_conversation","friend_conversation","timeline_conversation","game_completed","vocabulary_practice","textbook_study","story_reading","story_narration","story_created","fortune_calculated","fortune_ai_interpreted","town_interaction","magic_spell","magic_challenge_answer","magic_panel_choice","magic_voice_connected","mate_briefing_ready","mate_handoff_started","mate_handoff_completed","souls_created","souls_conversation","research_article_completed","circle_post_published","circle_comment_posted"]},
 {id:"guest",label:"免費試用",events:["guest_trial_entry_view","guest_trial_unavailable","guest_trial_start_click","guest_trial_mic_denied","guest_trial_setup_failed","guest_trial_token_issued","guest_trial_token_failed","guest_trial_connected","guest_trial_connect_failed","guest_trial_ended"]},
 {id:"chat",label:"老師／朋友／Souls 聊天",events:["teacher_conversation","friend_conversation","timeline_conversation","souls_conversation","home_live_bubble_view","home_live_bubble_click","home_live_bubble_connected","home_live_bubble_conversation"]},
 {id:"timeline",label:"Timeline",events:["timeline_view","timeline_conversation_start","timeline_conversation"]},
 {id:"shorts",label:"Shorts",events:["shorts_view","shorts_chat_click","shorts_conversation"]},
 {id:"games",label:"遊戲",events:["game_open","game_started","game_completed","game_route_loaded","game_route_stalled","game_route_asset_error"]},
 {id:"learning",label:"學習",events:["vocabulary_practice","textbook_study"]},
 {id:"story",label:"故事",events:["story_reading","story_narration","story_created"]},
 {id:"fortune",label:"命理",events:["fortune_calculated","fortune_ai_interpreted"]},
 {id:"worlds",label:"Town / Magic",events:["town_enter","town_interaction","town_chat_click","magic_enter","magic_spell","magic_challenge_answer","magic_panel_choice","magic_voice_connected"]},
 {id:"mate",label:"Mate",events:["mate_open","mate_briefing_ready","mate_handoff_started","mate_handoff_completed"]},
 {id:"souls",label:"Souls",events:SOULS_USAGE_EVENTS},
 {id:"research",label:"Briefing",events:["research_article_open","research_article_saved","research_article_completed"]},
 {id:"circle",label:"交流圈",events:["circle_thread_open","circle_post_published","circle_comment_posted"]}
];
const games:{id:string;label:string}[]=[
 {id:"taboo",label:"Taboo 描述猜詞"},{id:"1a2b",label:"1A2B 猜數字"},
 {id:"number-bomb",label:"終極密碼"},{id:"memory",label:"翻牌記憶"},
 {id:"gomoku",label:"五子棋"},{id:"connect4",label:"四子棋"},
 {id:"reversi",label:"黑白棋"},{id:"nonsense",label:"荒謬新聞直播 / 胡說大賽"},{id:"crazy-court",label:"荒謬法庭"},{id:"werewolf",label:"狼人殺"},{id:"twenty-questions",label:"20 Questions"},{id:"mystery",label:"海龜湯"}
];
const eventRatio=(value:number,previous:number)=>previous>0?(value/previous*100).toFixed(1)+"%":"—";
const chatStart=["teacher_conversation_start","friend_conversation_start","timeline_conversation_start","souls_live_connected"];
const chatSpeech=["teacher_user_spoke","friend_user_spoke","timeline_user_spoke","souls_user_input"];
const chatReply=["teacher_ai_replied","friend_ai_replied","timeline_ai_replied","souls_ai_replied"];
const chatEffective=["teacher_conversation","friend_conversation","timeline_conversation","souls_conversation"];

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
    <a href="#guest-trial-stats" className="usage-jump">免費試用統計</a>
    <UsageExportControls data={data} days={days} category={selected} bars={bars} categoryEventTotal={totalMany(rows,selected.events)} disabled={loading||!!error||!data||data.days!==days}/>
    <span className="usage-source">資料來源：Web · Cloudflare（不含 Android）</span>
   </div>
  </section>
  {loading?<section className="panel section" role="status">正在讀取匿名使用事件…</section>:
   error?<section className="panel section" role="alert"><strong>無法讀取使用資料</strong><p>{error}</p><p className="meta">請確認 Cloudflare Access、Analytics Engine Binding 與唯讀 Token，參考 docs/CREW_USAGE.md。</p></section>:
   data&&<>
    <section className="usage-cards" aria-label="主要指標">
     <article className="panel"><small>有效使用瀏覽器</small><strong>{num(data.activeUsers)}</strong><span>{comparison(data.activeUsers,data.previousActiveUsers)}</span></article>
     <article className="panel"><small>真的聊過天的瀏覽器</small><strong>{num(data.chatUsers)}</strong><span>{comparison(data.chatUsers,data.previousChatUsers)}</span></article>
     <article className="panel"><small>有效對話次數</small><strong>{num(totalMany(rows,chatEffective))}</strong><span>老師＋朋友＋Timeline＋Souls，雙方都有發言</span></article>
     <article className="panel"><small>網站開啟次數</small><strong>{num(total(rows,"app_opened"))}</strong><span>每分頁工作階段最多一次，不是獨立人數</span></article>
    </section>
    <UsageJourneySection days={days} journey={data.journey}/>
    <SoulsUsagePanel rows={rows} unique={unique}/>
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
    <p className="usage-note">這是匿名瀏覽器統計，不是可識別的真人數，也不包含 Android Firebase 的使用者。無法區分同一人在不同裝置的瀏覽器，亦不會記錄已選擇退出或使用 GPC／DNT 的訪客。Cloudflare Analytics Engine 可能抽樣，去重數為近似值。過去缺失的事件不會回填；資料最長保留約三個月。更新：{new Date(data.generatedAt).toLocaleString("zh-TW")}。</p>
   </>}
 </main>;
}
