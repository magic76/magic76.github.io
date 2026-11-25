/**
 * GA4 Web stream (same Analytics property as Crew Teacher Android).
 * Google tag is loaded on demand only for eligible production visitors.
 * Never transmit app identifiers, arbitrary search params, full referrer URLs, hash, speech or keys.
 */
export const GA4_MEASUREMENT_ID="G-563JSM2X68";
type GaWindow=Window&{dataLayer?:IArguments[]};
let initialized=false;
let enabledState:boolean|null=null;
let lastViewPath="";
let lastViewAt=0;
let landingPath="";
let landingCampaign="";
let pageReferrer="";

// Only explicitly named, compact campaign labels may leave the browser. Exclude
// utm_term (free-text search terms), click IDs, and all arbitrary query values.
const campaignKeys=[
 "utm_source","utm_medium","utm_campaign","utm_id","utm_content","utm_source_platform"
] as const;
const campaignValue=/^[a-zA-Z0-9][a-zA-Z0-9._~-]{0,63}$/;
export function safeGa4CampaignQuery(search:string){
 const params=new URLSearchParams(search);
 const safe=new URLSearchParams();
 for(const key of campaignKeys){
  const values=params.getAll(key);
  if(values.length===1&&campaignValue.test(values[0]))safe.set(key,values[0]);
 }
 const query=safe.toString();
 return query?"?"+query:"";
}

// Restrict referral data to the external site's public hostname. Never send
// its path, search parameters, fragments, credentials, or an internal referrer.
export function safeGa4Referrer(referrer:string,siteOrigin:string){
 try{
  const url=new URL(referrer),site=new URL(siteOrigin);
  if(!["https:","http:"].includes(url.protocol))return "";
  const host=url.hostname.toLowerCase();
  if(host.length>160||!/^(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/.test(host))return "";
  const stripWww=(value:string)=>value.replace(/^www\./,"");
  if(stripWww(host)===stripWww(site.hostname.toLowerCase()))return "";
  return url.protocol+"//"+host+"/";
 }catch{return ""}
}

// Fixed acquisition labels, not raw query strings or conversation text.
export function aiReferralSource(referrer:string,campaign:string){
 const providers:Record<string,string>={
  "chatgpt.com":"chatgpt","chat.openai.com":"chatgpt",
  "perplexity.ai":"perplexity","gemini.google.com":"gemini",
  "copilot.microsoft.com":"copilot","claude.ai":"claude","grok.com":"grok"
 };
 const resolve=(host:string)=>{
  const key=host.toLowerCase().replace(/^www\./,"");
  return Object.hasOwn(providers,key)?providers[key]:"";
 };
 try{
  const host=new URL(referrer).hostname;
  const source=resolve(host);
  if(source)return source;
 }catch{/* referrer unavailable */}
 const source=new URLSearchParams(campaign).get("utm_source")||"";
 return resolve(source);
}
let aiSource="";

const reserved=new Set("en zh zh-tw zh-cn ja ko es fr pt de vi id th teacher friend story fortune research briefing guides ai-english-speaking ai-conversation-partner travel-english-dialogues english-pronunciation gemini-key-for-ai-practice free-english-speaking ai-english-conversation english-interview-practice settings privacy usage timeline compare practice shorts friends roles learn tutor me vocabulary course pronunciation textbook phrasebook reports memory reading-library live shelf create edit physical read history reading board town magic mate souls games nonsense crazy-court werewolf taboo gomoku connect4 reversi 1a2b twenty-questions mystery circle books explore chat orb".split(" "));
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
export function setGa4Enabled(enabled:boolean,landing?:{pathname:string;search:string;referrer:string}){
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
 landingPath=safeGa4Path(landing?.pathname??window.location.pathname);
 landingCampaign=safeGa4CampaignQuery(landing?.search??window.location.search);
 pageReferrer=safeGa4Referrer(landing?.referrer??document.referrer??"",window.location.origin);
 aiSource=aiReferralSource(pageReferrer,landingCampaign);
 command("js",new Date());
 command("consent","default",consent(true));
 command("config",GA4_MEASUREMENT_ID,{
   send_page_view:false,
   allow_google_signals:false,
   allow_ad_personalization_signals:false,
   page_title:"Crew Web",
   page_referrer:pageReferrer,
   page_location:window.location.origin+landingPath+landingCampaign
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
 const initial=!lastViewPath;
 const referral=initial?pageReferrer:window.location.origin+lastViewPath;
 lastViewPath=path;lastViewAt=now;
 command("event","page_view",{
  send_to:GA4_MEASUREMENT_ID,
  page_title:"Crew Web",
  page_referrer:referral,
  page_location:window.location.origin+path+(initial&&path===landingPath?landingCampaign:""),
  page_path:path,
  ...(aiSource?{crew_ai_source:aiSource}:{})
 });
 pageReferrer=referral;
}

export function sendGa4Event(event:string,detail:string,pathname=window.location.pathname){
 if(enabledState===false||!setGa4Enabled(true))return;
 // Event and detail are fixed allowlisted enums from usage.ts.
 const path=safeGa4Path(pathname);
 command("event","crew_"+event,{
  send_to:GA4_MEASUREMENT_ID,
  crew_platform:"web",
  page_title:"Crew Web",
  page_referrer:pageReferrer,
  // Product events can precede the first page_view in the app bootstrap.
  page_location:window.location.origin+path+
   (!lastViewPath&&path===landingPath?landingCampaign:""),
  ...(aiSource?{crew_ai_source:aiSource}:{}),
  ...(detail?{crew_detail:detail}:{})
 });
}
