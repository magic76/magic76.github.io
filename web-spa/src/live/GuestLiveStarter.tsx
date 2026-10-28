import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {ensureLive} from "../lib/runtime";
import {trackUsageEvent} from "../analytics/usage";
import {fetchGuestTrialConfig,GUEST_TOKEN_ENDPOINT,type GuestTrialGrant} from "../lib/guestTrial";

type WidgetApi={
 render:(el:HTMLElement,options:{sitekey:string;action:string;callback:(token:string)=>void;"expired-callback":()=>void;"error-callback":()=>void})=>string;
 remove:(id:string)=>void;
};
const turnstile=()=> (window as Window&{turnstile?:WidgetApi}).turnstile;
/** Guest start gate in the normal Teacher/Friend UI. Never persists credentials. */
export function GuestLiveStarter({onGrant,role}:{onGrant:(grant:GuestTrialGrant)=>Promise<void>;role:"teacher"|"friend"}){
 const {t}=useTranslation("common");
 const [siteKey,setSiteKey]=useState("");
 const [phase,setPhase]=useState<"checking"|"ready"|"unavailable"|"starting"|"error">("checking");
 const [challenge,setChallenge]=useState("");
 const [message,setMessage]=useState("");
 const host=useRef<HTMLDivElement|null>(null);
 const widget=useRef<string|null>(null);
 const busy=useRef(false);
 const active=useRef(true);
 useEffect(()=>{
  active.current=true;
  void fetchGuestTrialConfig().then(config=>{
   if(!active.current)return;
   if(config.enabled&&config.siteKey){trackUsageEvent("guest_trial_entry_view",role);setSiteKey(config.siteKey);setPhase("ready")}
   else setPhase("unavailable");
  }).catch(()=>{if(active.current)setPhase("unavailable")});
  return()=>{active.current=false};
 },[]);
 useEffect(()=>{
  if(!siteKey||phase!=="ready")return;
  let cancelled=false;
  const render=()=>{
   if(cancelled||!host.current||widget.current!==null)return;
   const api=turnstile();if(!api)return;
   widget.current=api.render(host.current,{
    sitekey:siteKey,action:"crew-guest-trial",
    callback:token=>{if(active.current)setChallenge(token)},
    "expired-callback":()=>{if(active.current)setChallenge("")},
    "error-callback":()=>{if(active.current)setChallenge("")}
   });
  };
  let script=document.getElementById("crew-guest-turnstile");
  if(!script){
   const el=document.createElement("script");el.id="crew-guest-turnstile";
   el.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
   el.async=true;el.defer=true;document.head.appendChild(el);script=el;
  }
  if(turnstile())render();else script.addEventListener("load",render);
  return()=>{
   cancelled=true;script?.removeEventListener("load",render);
   if(widget.current!==null){try{turnstile()?.remove(widget.current)}catch{}widget.current=null}
  };
 },[siteKey,phase]);
 async function begin(){
  if(busy.current||phase!=="ready"||!challenge)return;
  busy.current=true;setPhase("starting");setMessage("");
  trackUsageEvent("guest_trial_start_click",role);
  let tokenRequested=false;
  try{
   await ensureLive();
   if(!navigator.mediaDevices?.getUserMedia)throw new Error("microphone unavailable");
   const mic=await navigator.mediaDevices.getUserMedia({audio:true});
   mic.getTracks().forEach(track=>track.stop());
   if(!active.current)return;
   tokenRequested=true;
   const res=await fetch(GUEST_TOKEN_ENDPOINT,{method:"POST",cache:"no-store",
    headers:{"content-type":"application/json"},body:JSON.stringify({challengeToken:challenge})});
   if(!res.headers.get("content-type")?.includes("application/json"))throw Error("invalid response");
   const data=await res.json() as GuestTrialGrant&{code?:string};
   if(!res.ok||!data.token||!data.model||data.seconds!==60){
    trackUsageEvent("guest_trial_token_failed",role);
    if(active.current){setMessage(data.code==="DAILY_LIMIT"?t("guestTrial.limit"):t("guestTrial.tempUnavailable"));setPhase("error")}
    return;
   }
   if(active.current){trackUsageEvent("guest_trial_token_issued",role);await onGrant(data)}
  }catch(error){
   if(!tokenRequested&&error instanceof DOMException&&error.name==="NotAllowedError")trackUsageEvent("guest_trial_mic_denied",role);
   else trackUsageEvent(tokenRequested?"guest_trial_token_failed":"guest_trial_setup_failed",role);
   if(active.current){setMessage(error instanceof DOMException&&error.name==="NotAllowedError"
    ?t("guestTrial.micDenied"):t("guestTrial.serviceUnavailable"));setPhase("error")}
  }finally{busy.current=false}
 }
 return <div className="notice guest-live-entry" role="region" aria-label={t("guestTrial.homeTitle")}>
  <div style={{display:"grid",gap:10,width:"100%"}}>
   <strong>{t("guestTrial.homeTitle")}</strong>
   <p>{t("guestTrial.homeDesc")}</p>
   {phase==="checking"&&<p role="status">{t("guestTrial.checking")}</p>}
   {phase==="ready"&&<><div ref={host} aria-label="Turnstile verification"/>
    <button type="button" className="btn" disabled={!challenge} onClick={()=>void begin()}>{t("guestTrial.start")}</button></>}
   {phase==="starting"&&<p role="status">{t("guestTrial.connecting")}</p>}
   {(phase==="error"||phase==="unavailable")&&<p role="status">{message||t("guestTrial.unavailable")}</p>}
   {phase==="error"&&<button className="btn secondary" type="button" onClick={()=>{setChallenge("");setPhase("ready")}}>{t("guestTrial.retry")}</button>}
   <Link className="btn secondary small" to="/settings#settings-gemini">{t("guestTrial.setupKey")}</Link>
  </div>
 </div>;
}
