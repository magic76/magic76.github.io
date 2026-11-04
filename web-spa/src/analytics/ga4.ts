/**
 * GA4 Web stream (same Analytics property as Crew Teacher Android).
 * Google tag is loaded on demand only for eligible production visitors.
 * Never transmit app identifiers, search params, hash, titles, speech or keys.
 */
export const GA4_MEASUREMENT_ID="G-563JSM2X68";
type GaWindow=Window&{dataLayer?:IArguments[]};
let initialized=false;
let enabledState:boolean|null=null;
let lastViewPath="";
let lastViewAt=0;

const reserved=new Set([
 "en","zh","zh-tw","zh-cn","ja","ko","es","fr","pt","de","vi","id","th",
 "teacher","friend","story","fortune","research","briefing","guides","settings","privacy","usage","timeline","compare",
 "practice","shorts","friends","roles","learn","tutor","me","vocabulary","course",
 "pronunciation","textbook","phrasebook","reports","memory","reading-library",
 "voice-lab","live","shelf","create","edit","physical","read","history","reading","board",
 "town","magic","mate","souls","games","nonsense","crazy-court","werewolf","taboo","gomoku","connect4","reversi",
 "1a2b","twenty-questions","mystery","circle","books","explore","chat","learn","me","orb","research",
 "friend","friends","timeline","compare","teacher","vocabulary","shorts","story","fortune"
]);
// Unknown/dynamic slugs could contain personal information; never emit them to Google.
export function safeGa4Path(pathname:string){
 const segments=pathname.split("/").filter(Boolean);
 return "/"+segments.slice(0,4).map(segment=>reserved.has(segment.toLowerCase())?segment.toLowerCase():"item").join("/");
}
function command(...args:unknown[]){
 const target=window as GaWindow;
 // Match Google's gtag() snippet: gtag.js consumes the native Arguments object.
 function enqueue(..._params:unknown[]){
  (target.dataLayer??=[]).push(arguments);
 }
 enqueue(...args);
}
const consent=(enabled:boolean)=>({
 ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied",
 analytics_storage:enabled?"granted":"denied"
});
export function setGa4Enabled(enabled:boolean){
 if(typeof window==="undefined")return false;
 // Google's documented per-property opt-out prevents even cookieless pings.
 (window as unknown as Record<string,unknown>)["ga-disable-"+GA4_MEASUREMENT_ID]=!enabled;
 if(enabledState!==enabled){
  if(initialized)command("consent","update",consent(enabled));
  enabledState=enabled;
 }
 if(!enabled)return false;
 if(initialized)return true;
 initialized=true;
 command("js",new Date());
 command("consent","default",consent(true));
 command("config",GA4_MEASUREMENT_ID,{
   send_page_view:false,
   allow_google_signals:false,
   allow_ad_personalization_signals:false,
   page_title:"Crew Web",
   page_referrer:"",
   page_location:window.location.origin+safeGa4Path(window.location.pathname)
 });
 const script=document.createElement("script");
 script.async=true;
 script.src="https://www.googletagmanager.com/gtag/js?id="+GA4_MEASUREMENT_ID;
 document.head.appendChild(script);
 return true;
}

export function sendGa4PageView(pathname:string){
 if(enabledState===false)return;
 const path=safeGa4Path(pathname),now=Date.now();
 if(!setGa4Enabled(true))return;
 // React.StrictMode may run mount effects twice; real revisits still count.
 if(path===lastViewPath&&now-lastViewAt<1200)return;
 lastViewPath=path;lastViewAt=now;
 command("event","page_view",{
  send_to:GA4_MEASUREMENT_ID,
  page_title:"Crew Web",
  page_referrer:"",
  page_location:window.location.origin+path,
  page_path:path
 });
}
export function sendGa4Event(event:string,detail:string){
 if(enabledState===false||!setGa4Enabled(true))return;
 // Event and detail are fixed allowlisted enums from usage.ts.
 command("event","crew_"+event,{
  send_to:GA4_MEASUREMENT_ID,
  crew_platform:"web",
  page_title:"Crew Web",
  page_referrer:"",
  page_location:window.location.origin+safeGa4Path(window.location.pathname),
  ...(detail?{crew_detail:detail}:{})
 });
}
