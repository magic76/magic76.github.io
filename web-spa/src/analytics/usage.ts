/**
 * Minimal first-party analytics. Never send user speech, prompts, Gemini keys,
 * story titles, birth details, profile IDs, or full URLs.
 */
export type UsageEvent=
  |"app_opened"|"visitor_first_seen"|"user_returned"
  |"teacher_conversation"|"friend_conversation"
  |"story_reading"|"story_narration"|"story_created"
  |"fortune_calculated"|"fortune_ai_interpreted"
  |"gemini_key_missing"|"gemini_key_verified";
type Detail=""|"bazi"|"tarot"|"vedic";
const KEY="crew_usage_visitor_v1",SESSION="crew_usage_session_v1",
      LAST="crew_usage_last_day_v1",OPT_OUT="crew_usage_opt_out_v1",
      DEV="crew_usage_dev_mode_v1";
let recent=new Map<string,number>();
const local=(key:string)=>{try{return localStorage.getItem(key)}catch{return null}};
const store=(key:string,value:string)=>{try{localStorage.setItem(key,value)}catch{/* storage blocked */}};
const id=()=>crypto.randomUUID();
const production=()=>typeof window!=="undefined"&&location.hostname==="www.3sssi.com";
const globalPrivacy=()=>Boolean((navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl)||navigator.doNotTrack==="1";
export const usageDisabled=()=>local(OPT_OUT)==="1";
export const developerUsageMode=()=>local(DEV)==="1";
export function setUsageDisabled(value:boolean){
 if(value){store(OPT_OUT,"1");try{[KEY,SESSION,LAST].forEach(k=>localStorage.removeItem(k))}catch{/* blocked */}}
 else{try{localStorage.removeItem(OPT_OUT)}catch{/* blocked */}}
}
export function setDeveloperUsageMode(value:boolean){
 if(value)store(DEV,"1");
 else{try{localStorage.removeItem(DEV)}catch{/* blocked */}}
}
const allowed=()=>production()&&!globalPrivacy()&&!usageDisabled()&&!developerUsageMode();
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
 if(!allowed())return;
 const key=event+":"+detail,now=Date.now();
 // Protect against React strict-mode effects and accidental rapid duplicate calls.
 if(now-(recent.get(key)||0)<2000)return;
 recent.set(key,now);
 const payload={event,detail,visitorId:visitor(),sessionId:session()};
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
