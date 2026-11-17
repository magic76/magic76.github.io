/** Pure, strict projection of private /usage aggregates. Never serialize API objects. */
export type Row={day:string;event:string;detail?:string;count:number;users:number};
export type EventUsers={event:string;users:number};
export type PlatformUsage={platform:"web"|"pwa"|"android_shell";opened:number;active:number;chat:number;returned:number;gamesCompleted:number};
export type UsageReport={
 days:number;activeUsers:number;chatUsers:number;
 previousActiveUsers:number;previousChatUsers:number;
 eventUsers:EventUsers[];rows:Row[];generatedAt:string;platformBreakdown?:PlatformUsage[];
 journey?:{opened:number;clicked:number;started:number;engaged:number;returned:number};
};
export type UsageBar={day:string;count:number};
export type UsageCategory={id:string;label:string};

// The already-tracked usage.ts event/detail vocabulary, not new analytics events.
const SAFE_EVENTS=new Set<string>(["app_opened","visitor_first_seen","user_returned","teacher_conversation","friend_conversation","teacher_conversation_start","friend_conversation_start","timeline_conversation_start","teacher_user_spoke","friend_user_spoke","timeline_user_spoke","teacher_ai_replied","friend_ai_replied","timeline_ai_replied","timeline_view","timeline_conversation","timeline_session_end","game_open","game_started","game_completed","game_route_loaded","game_route_stalled","game_route_asset_error","teacher_session_end","friend_session_end","vocabulary_practice","textbook_open","textbook_study","shorts_view","shorts_chat_click","shorts_conversation","shorts_hook_click","shorts_story_followup","story_reading","story_narration","story_created","fortune_calculated","fortune_ai_interpreted","fortune_identity_shared","fortune_identity_feedback","fortune_identity_copy_link","gemini_key_missing","gemini_key_verified","guest_trial_entry_view","guest_trial_unavailable","guest_trial_start_click","guest_trial_mic_denied","guest_trial_setup_failed","guest_trial_token_issued","guest_trial_token_failed","guest_trial_connected","guest_trial_connect_failed","guest_trial_ended","home_entry_click","explore_entry_click","menu_open","menu_item_click","route_load_error","pwa_install_view","pwa_install_click","pwa_install_dismiss","pwa_install_success","home_live_bubble_view","home_live_bubble_click","home_live_bubble_connected","home_live_bubble_conversation","home_gift_view","home_gift_open","home_gift_result","home_gift_go","home_gift_minimize","souls_open","souls_photo_ready","souls_created","souls_live_attempt","souls_live_connected","souls_live_failed","souls_user_input","souls_ai_replied","souls_conversation","souls_mask_repaired","town_enter","town_interaction","town_chat_click","town_3d_fallback","magic_enter","magic_spell","magic_challenge_answer","magic_panel_choice","magic_voice_connected","magic_voice_failed","magic_3d_fallback","magic_world_reset","mate_open","mate_briefing_ready","mate_handoff_started","mate_handoff_completed","mate_handoff_failed","research_article_open","research_article_saved","research_article_completed","research_source_open","circle_thread_open","circle_post_published","circle_comment_posted"]);
const SAFE_DETAILS=new Set<string>(["","bazi","tarot","vedic","bazi_yes","bazi_partly","bazi_no","tarot_yes","tarot_partly","tarot_no","vedic_yes","vedic_partly","vedic_no","shorts_home","shorts_feed","under_1m","from_1_to_3m","from_3_to_10m","over_10m","under_1s","from_1_to_3s","from_3_to_8s","over_8s","teacher","friend","under_15s","from_15_to_45s","from_45_to_60s","from_60_to_120s","from_120_to_180s","from_180_to_300s","nonsense","crazy-court","mira","ethan","hana","settings","learn","story","fortune","timeline","play","briefing","town","magic","mate","souls","shorts","circle","discover","me","footer","menu","nudge","native","asset","runtime","android_app_google_play","voice","demo","live","person","object","place","manual","render_error","unsupported","taboo","1a2b","number-bomb","memory","gomoku","connect4","reversi","twenty-questions","mystery","crazy-court","werewolf"]);
const CATEGORY_LABELS:Record<string,string>={
 all:"所有有效互動",guest:"免費試用",chat:"老師／朋友／Souls 聊天",timeline:"Timeline",
 shorts:"Shorts",games:"遊戲",learning:"學習",story:"故事",fortune:"命理",
 worlds:"Town / Magic",mate:"Mate",souls:"Souls",research:"Briefing",circle:"交流圈"
};
const CHAT_START=["teacher_conversation_start","friend_conversation_start","timeline_conversation_start","souls_live_connected"];
const CHAT_SPEECH=["teacher_user_spoke","friend_user_spoke","timeline_user_spoke","souls_user_input"];
const CHAT_REPLY=["teacher_ai_replied","friend_ai_replied","timeline_ai_replied","souls_ai_replied"];
const CHAT_EFFECTIVE=["teacher_conversation","friend_conversation","timeline_conversation","souls_conversation"];
const JOURNEY_STAGES=["opened","clicked","started","engaged","returned"] as const;

export const USAGE_CAVEATS=[
 "統計是匿名瀏覽器的去重估計，不是可識別真人數或跨裝置獨立人數。",
 "Android App 只計 Crew WebView 的 Web 事件，不含 Android Firebase；選擇退出瀏覽器統計的訪客不會計入。",
 "平台分布僅含新版追蹤上線後資料，舊紀錄不回填；跨平台瀏覽器不能相加成真人數。CSV 保持原始事件彙總格式，平台分類請使用 JSON 或複製摘要。",
 "Cloudflare Analytics Engine 可能抽樣，去重數為近似值；不可把每日 users 加總當成期間使用者數。",
 "類別篩選只影響每日長條；主卡、journey、聊天漏斗和 rows 都是所選期間的完整聚合。",
 "語音 vs 打字的完成對話未分開追蹤。home_entry_click 的 voice 是入口點擊，friend 混含文字和語音入口，不是兩種聊天模式的使用量或完成數對照。",
 "聊天漏斗與 chatUsers 主要反映語音 Live／已追蹤對話；一般文字聊天多數未計入 conversation。"
] as const;

const count=(value:unknown)=>typeof value==="number"&&Number.isFinite(value)&&value>=0?value:0;
const safeDay=(value:unknown)=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)?value:"";
const safeInstant=(value:unknown)=>{
 if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value))return "";
 const date=new Date(value);
 return Number.isNaN(date.getTime())?"":date.toISOString();
};
export const num=(n:number)=>Math.round(n).toLocaleString("zh-TW");
export const total=(rows:Row[],event:string,detail?:string)=>rows.filter(r=>r.event===event&&(detail===undefined||r.detail===detail)).reduce((sum,r)=>sum+r.count,0);
export const totalMany=(rows:Row[],events:string[])=>events.reduce((sum,event)=>sum+total(rows,event),0);
export const comparison=(current:number,previous:number)=>previous===0
 ? "前一期尚無可比較的使用紀錄"
 : `較前一期 ${current>=previous?"+":""}${num(current-previous)}（${current>=previous?"+":""}${Math.round((current-previous)/previous*100)}%）`;

/** Reject unexpected keys AND unexpected string values, even on a compromised API response. */
function safeRows(rows:Row[]):Row[]{
 return rows.filter(row=>row&&safeDay(row.day)&&SAFE_EVENTS.has(row.event)&&SAFE_DETAILS.has(row.detail??""))
  .map(row=>({day:row.day,event:row.event,detail:row.detail??"",count:count(row.count),users:count(row.users)}));
}
function sum(rows:Row[],event:string){return rows.reduce((acc,row)=>acc+(row.event===event?row.count:0),0)}
function sumMany(rows:Row[],events:string[]){return events.reduce((acc,event)=>acc+sum(rows,event),0)}

/** Only fields listed in FACTS §5 are projected. No object spreading or generic JSON stringify. */
export function buildUsageExport(data:UsageReport,days:7|30,category:UsageCategory,bars:UsageBar[],categoryEventTotal:number,now=new Date()){
 const rows=safeRows(data.rows);
 const entryClicks:Record<string,number>=Object.create(null);
 entryClicks.voice=0;entryClicks.friend=0;
 for(const row of rows){
  if(row.event==="home_entry_click")entryClicks[row.detail??""]=(entryClicks[row.detail??""]||0)+row.count;
 }
 const chatFunnel=[
  {label:"成功建立語音連線",events:CHAT_START,count:sumMany(rows,CHAT_START)},
  {label:"使用者真正發話",events:CHAT_SPEECH,count:sumMany(rows,CHAT_SPEECH)},
  {label:"AI 在發話後回覆",events:CHAT_REPLY,count:sumMany(rows,CHAT_REPLY)},
  {label:"完成有效雙向對話",events:CHAT_EFFECTIVE,count:sumMany(rows,CHAT_EFFECTIVE)}
 ];
 const journey=Object.fromEntries(JOURNEY_STAGES.map(stage=>[stage,count(data.journey?.[stage])])) as Record<typeof JOURNEY_STAGES[number],number>;
 const categoryId=Object.prototype.hasOwnProperty.call(CATEGORY_LABELS,category.id)?category.id:"all";
 const eventUsers=data.eventUsers.filter(item=>item&&SAFE_EVENTS.has(item.event))
  .map(item=>({event:item.event,users:count(item.users)}));
 return {
  exportedAt:now.toISOString(),source:"https://koolo.app/usage",days,
  category:{id:categoryId,label:CATEGORY_LABELS[categoryId]},generatedAt:safeInstant(data.generatedAt),
  headlines:{
   activeUsers:count(data.activeUsers),previousActiveUsers:count(data.previousActiveUsers),
   chatUsers:count(data.chatUsers),previousChatUsers:count(data.previousChatUsers),
   effectiveConversations:sumMany(rows,CHAT_EFFECTIVE),appOpened:sum(rows,"app_opened")
  },
  journey,
  platforms:(data.platformBreakdown||[]).filter(row=>row&&
   ["web","pwa","android_shell"].includes(row.platform)).map(row=>({
   platform:row.platform,opened:count(row.opened),active:count(row.active),
   chat:count(row.chat),returned:count(row.returned),gamesCompleted:count(row.gamesCompleted)
  })),
  chatFunnel,
  entryClicks:{home_entry_click:Object.fromEntries(Object.entries(entryClicks).sort(([a],[b])=>a.localeCompare(b)))},
  categoryBars:bars.filter(item=>safeDay(item.day)).map(item=>({day:item.day,count:count(item.count)})),
  categoryEventTotal:count(categoryEventTotal),eventUsers,rows,caveats:[...USAGE_CAVEATS]
 };
}

/** Uses the user's Taiwan calendar day, not the browser timezone or report UTC day. */
export function usageExportFilename(extension:"json"|"csv",now=new Date()){
 const parts=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Taipei",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
 const value=(key:string)=>parts.find(part=>part.type===key)?.value||"";
 return `crew-usage-${value("year")}-${value("month")}-${value("day")}.${extension}`;
}
const csvCell=(value:string|number)=>'"'+String(value).replace(/"/g,'""')+'"';
/** CSV exports all period rows, because category affects bars only, not rows. */
export function usageExportCsv(payload:ReturnType<typeof buildUsageExport>){
 return "\uFEFFday,event,detail,count,users\r\n"+payload.rows.map(row=>
  [row.day,row.event,row.detail??"",row.count,row.users].map(csvCell).join(",")
 ).join("\r\n")+(payload.rows.length?"\r\n":"");
}
/** Small text suitable for pasting into a chat; no raw rows or identifiers. */
export function usageExportSummary(payload:ReturnType<typeof buildUsageExport>){
 const h=payload.headlines;
 return [
  `Crew Usage｜最近 ${payload.days} 天｜類別：${payload.category.label}（${payload.category.id}）`,
  `產生時間：${payload.generatedAt||"未提供"}｜匯出時間：${payload.exportedAt}`,
  `有效使用瀏覽器：${h.activeUsers}（前期 ${h.previousActiveUsers}）；真的聊過天：${h.chatUsers}（前期 ${h.previousChatUsers}）`,
  `有效對話次數：${h.effectiveConversations}；網站開啟次數：${h.appOpened}`,
  `Journey：${JOURNEY_STAGES.map(stage=>`${stage}=${payload.journey[stage]}`).join("、")}`,
  `平台分布（新版 Web 事件）：${payload.platforms.length?payload.platforms.map(row=>`${row.platform}: 開啟 ${row.opened}／有效 ${row.active}／聊天 ${row.chat}／遊戲 ${row.gamesCompleted}／回訪 ${row.returned}`).join("；"):"尚無可辨識的新資料"}`,
  `聊天漏斗：${payload.chatFunnel.map(stage=>`${stage.label}=${stage.count}`).join("、")}`,
  `home_entry_click：${Object.entries(payload.entryClicks.home_entry_click).map(([detail,value])=>`${detail||"(空白)"}=${value}`).join("、")}`,
  `篩選類別每日長條：${payload.categoryBars.map(bar=>`${bar.day}:${bar.count}`).join("、")}；總計 ${payload.categoryEventTotal} 次`,
  "限制："+payload.caveats.join(" ")
 ].join("\n");
}
