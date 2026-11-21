import {usagePlatform} from "./usagePlatform";

/**
 * Minimal first-party analytics. Never send user speech, prompts, Gemini keys,
 * story titles, birth details, profile IDs, or full URLs.
 */
export type UsageEvent=
  |"app_opened"|"visitor_first_seen"|"user_returned"
  |"teacher_conversation"|"friend_conversation"
  |"teacher_conversation_start"|"friend_conversation_start"|"timeline_conversation_start"
  |"teacher_user_spoke"|"friend_user_spoke"|"timeline_user_spoke"
  |"teacher_ai_replied"|"friend_ai_replied"|"timeline_ai_replied"
  |"timeline_view"|"timeline_conversation"|"timeline_session_end"
  |"game_open"|"game_started"|"game_completed"
  |"game_route_loaded"|"game_route_stalled"|"game_route_asset_error"
  |"teacher_session_end"|"friend_session_end"
  |"vocabulary_practice"|"textbook_open"|"textbook_study"
  |"shorts_view"|"shorts_chat_click"|"shorts_conversation"|"shorts_hook_click"|"shorts_story_followup"
  |"story_reading"|"story_narration"|"story_created"
  |"fortune_calculated"|"fortune_ai_interpreted"|"fortune_price_view"|"fortune_price_interest"|"fortune_identity_shared"|"fortune_identity_feedback"|"fortune_identity_copy_link"
  |"gemini_key_missing"|"gemini_key_verified"
  |"guest_trial_entry_view"|"guest_trial_unavailable"|"guest_trial_start_click"|"guest_trial_mic_denied"|"guest_trial_setup_failed"
  |"guest_trial_token_issued"|"guest_trial_token_failed"|"guest_trial_connected"|"guest_trial_connect_failed"|"guest_trial_ended"
  |"home_entry_click"|"explore_entry_click"|"menu_open"|"menu_item_click"|"route_load_error"
  |"pwa_install_view"|"pwa_install_click"|"pwa_install_dismiss"|"pwa_install_success"
  |"home_live_bubble_view"|"home_live_bubble_click"|"home_live_bubble_connected"|"home_live_bubble_conversation"
  |"home_gift_view"|"home_gift_open"|"home_gift_result"|"home_gift_go"|"home_gift_minimize"
  |"souls_open"|"souls_photo_ready"|"souls_created"|"souls_live_attempt"|"souls_live_connected"|"souls_live_failed"|"souls_user_input"|"souls_ai_replied"|"souls_conversation"|"souls_mask_repaired"
  |"town_enter"|"town_interaction"|"town_chat_click"|"town_3d_fallback"
  |"magic_enter"|"magic_spell"|"magic_challenge_answer"|"magic_panel_choice"|"magic_voice_connected"|"magic_voice_failed"|"magic_3d_fallback"|"magic_world_reset"
  |"mate_open"|"mate_briefing_ready"|"mate_handoff_started"|"mate_handoff_completed"|"mate_handoff_failed"
  |"research_article_open"|"research_article_saved"|"research_article_completed"|"research_source_open"
  |"circle_thread_open"|"circle_post_published"|"circle_comment_posted";
type Detail=""|"bazi"|"tarot"|"vedic"|"bazi_yes"|"bazi_partly"|"bazi_no"|"tarot_yes"|"tarot_partly"|"tarot_no"|"vedic_yes"|"vedic_partly"|"vedic_no"|"shorts_home"|"shorts_feed"
  |"under_1m"|"from_1_to_3m"|"from_3_to_10m"|"over_10m"
  |"under_1s"|"from_1_to_3s"|"from_3_to_8s"|"over_8s"
  |"teacher"|"friend"|"under_15s"|"from_15_to_45s"|"from_45_to_60s"|"from_60_to_120s"|"from_120_to_180s"|"from_180_to_300s"
  |"nonsense"|"crazy-court"
  |"mira"|"ethan"|"hana"
  |"settings"|"learn"|"story"|"fortune"|"timeline"|"play"|"briefing"|"town"|"magic"|"mate"|"souls"|"shorts"|"circle"
  |"discover"|"me"|"footer"|"menu"|"nudge"|"native"|"asset"|"runtime"
  |"android_app_google_play"
  |"voice"|"demo"|"live"|"person"|"object"|"place"|"manual"|"render_error"|"unsupported"
  |"taboo"|"1a2b"|"number-bomb"|"memory"|"gomoku"|"connect4"|"reversi"|"twenty-questions"|"mystery"|"crazy-court"|"werewolf";
export function sessionDurationDetail(durationMs:number):Detail{
 if(durationMs<60000)return "under_1m";
 if(durationMs<180000)return "from_1_to_3m";
 if(durationMs<600000)return "from_3_to_10m";
 return "over_10m";
}

const KEY="crew_usage_visitor_v1",SESSION="crew_usage_session_v1",
      LAST="crew_usage_last_day_v1",OPT_OUT="crew_usage_opt_out_v1",
      DEV="crew_usage_dev_mode_v1";
let recent=new Map<string,number>();
const local=(key:string)=>{try{return localStorage.getItem(key)}catch{return null}};
const store=(key:string,value:string)=>{try{localStorage.setItem(key,value)}catch{/* storage blocked */}};
const id=()=>crypto.randomUUID();
const production=()=>typeof window!=="undefined"&&["www.3sssi.com","3sssi.com","koolo.app"].includes(location.hostname);
const globalPrivacy=()=>Boolean((navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl)||navigator.doNotTrack==="1";
export const usageDisabled=()=>local(OPT_OUT)==="1";
export const developerUsageMode=()=>local(DEV)==="1";
export function setUsageDisabled(value:boolean){
 if(value){store(OPT_OUT,"1");try{[KEY,SESSION,LAST].forEach(k=>localStorage.removeItem(k))}catch{/* blocked */}}
 else{try{localStorage.removeItem(OPT_OUT)}catch{/* blocked */}}
 updateGa4State();
}
export function setDeveloperUsageMode(value:boolean){
 if(value)store(DEV,"1");
 else{try{localStorage.removeItem(DEV)}catch{/* blocked */}}
 updateGa4State();
}
const allowed=()=>production()&&!globalPrivacy()&&!usageDisabled()&&!developerUsageMode();
// Third-party analytics is optional: load its code only when collection is allowed.
// Capture the original landing URL before the async chunk can finish loading.
type Ga4Module=typeof import("./ga4");
let ga4Promise:Promise<Ga4Module>|null=null;
let landing:{pathname:string;search:string;referrer:string}|null=null;
function loadGa4(){
 landing??={pathname:location.pathname,search:location.search,referrer:document.referrer};
 return ga4Promise??=import("./ga4");
}
function withGa4(send:(ga:Ga4Module)=>void){
 if(!allowed())return;
 void loadGa4().then(ga=>{
  if(!allowed())return; // An opt-out during module loading must win.
  ga.setGa4Enabled(true,landing??undefined);
  send(ga);
 }).catch(()=>{/* Analytics never interrupts Crew functions. */});
}
function updateGa4State(){
 if(!allowed()){
  if(ga4Promise)void ga4Promise.then(ga=>ga.setGa4Enabled(false)).catch(()=>{});
  return;
 }
 const pathname=location.pathname;
 withGa4(ga=>ga.sendGa4PageView(pathname));
}
function visitor(){
 let value=local(KEY);
 if(!value){value=id();store(KEY,value)}
 return value;
}
function session(){
 let value:string|null=null;try{value=sessionStorage.getItem(SESSION)}catch{/* blocked */}
 if(!value){value=id();try{sessionStorage.setItem(SESSION,value)}catch{/* blocked */}}
 return value;
}
export function trackUsageEvent(event:UsageEvent,detail:Detail=""){
 // UX eligibility is independent of analytics consent and stores no chat content.
 if(event==="friend_conversation"||event==="teacher_conversation"||event==="game_completed"||
    event==="story_created"||event==="fortune_calculated"||event==="mate_handoff_completed"){
  try{
   if(localStorage.getItem("crew_pwa_engaged_v1")!=="1"){
    localStorage.setItem("crew_pwa_engaged_v1","1");
    window.dispatchEvent(new Event("crew-pwa-engaged"));
   }
  }catch{/* Optional local-only state. */}
 }
 if(!allowed())return;
 const key=event+":"+detail,now=Date.now();
 // Protect against React strict-mode effects and accidental rapid duplicate calls.
 const dedupeMs=event.startsWith("home_gift_")?300:2000;
 if(now-(recent.get(key)||0)<dedupeMs)return;
 recent.set(key,now);
 const pathname=location.pathname;
 withGa4(ga=>ga.sendGa4Event(event,detail,pathname));
 const payload={event,detail,visitorId:visitor(),sessionId:session(),platform:usagePlatform()};
 try{void fetch("/api/usage/event",{
   method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify(payload),keepalive:true,credentials:"same-origin"
 }).catch(()=>{/* Analytics never interrupts Crew functions. */})}catch{/* best effort */}
}
export function trackAppOpen(){
 if(!allowed())return;
 try{if(sessionStorage.getItem("crew_usage_opened_v1")==="1")return;
   sessionStorage.setItem("crew_usage_opened_v1","1")}catch{/* blocked */}
 const isNew=!local(KEY),day=new Date().toISOString().slice(0,10),previous=local(LAST);
 if(isNew)trackUsageEvent("visitor_first_seen");
 else if(previous&&previous!==day)trackUsageEvent("user_returned");
 store(LAST,day);
 trackUsageEvent("app_opened");
}

/** Manual GA4 pageviews for React Router navigation (only safe campaign labels). */
export function trackPageView(pathname:string){
 withGa4(ga=>ga.sendGa4PageView(pathname));
}
