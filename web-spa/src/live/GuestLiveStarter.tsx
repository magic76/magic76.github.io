import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {ensureLive} from "../lib/runtime";
import {trackUsageEvent} from "../analytics/usage";
import {fetchGuestTrialConfig,guestTrialDiscoveryEnabled,GUEST_TOKEN_ENDPOINT,type GuestTrialGrant} from "../lib/guestTrial";

type WidgetApi={
 render:(el:HTMLElement,options:{sitekey:string;action:string;callback:(token:string)=>void;"expired-callback":()=>void;"error-callback":()=>void})=>string;
 remove:(id:string)=>void;
};
const turnstile=()=> (window as Window&{turnstile?:WidgetApi}).turnstile;
/** Guest start gate in the normal Teacher/Friend UI. Never persists credentials. */
export function GuestLiveStarter({onGrant,role,focusStartOnVerified=false}:{onGrant:(grant:GuestTrialGrant)=>Promise<void>;role:"teacher"|"friend";focusStartOnVerified?:boolean}){
 const {t}=useTranslation("common");
 const [siteKey,setSiteKey]=useState("");
 const [signinRequired,setSigninRequired]=useState(false);
 const [memberSignedIn,setMemberSignedIn]=useState(false);
 const [phase,setPhase]=useState<"checking"|"ready"|"login"|"exhausted"|"full"|"unavailable"|"starting"|"error">("checking");
 const [challenge,setChallenge]=useState("");
 const [message,setMessage]=useState("");
 const [remaining,setRemaining]=useState<number|null>(null);
 const [quotaLimit,setQuotaLimit]=useState<number|null>(null);
 const [quotaRefresh,setQuotaRefresh]=useState(0);
 const host=useRef<HTMLDivElement|null>(null);
 const startButton=useRef<HTMLButtonElement|null>(null);
 const widget=useRef<string|null>(null);
 const busy=useRef(false);
 const active=useRef(true);
 useEffect(()=>{
  const now=Date.now(),dayMs=86400000,offsetMs=8*3600000;
  const next=Math.floor((now+offsetMs)/dayMs+1)*dayMs-offsetMs;
  const timer=window.setTimeout(()=>setQuotaRefresh(count=>count+1),next-now+1000);
  return()=>window.clearTimeout(timer);
 },[quotaRefresh]);
 useEffect(()=>{
  active.current=true;
  void fetchGuestTrialConfig().then(async config=>{
   if(!active.current)return;
   if(!config.enabled||!config.siteKey){
    if(guestTrialDiscoveryEnabled())trackUsageEvent("guest_trial_unavailable",role);
    setPhase("unavailable");return;
   }
   setSigninRequired(Boolean(config.signinRequired));
   let signedIn=false;
   if(config.trial){setRemaining(config.trial.limit-config.trial.used);setQuotaLimit(config.trial.limit)}
   if(config.memberMetering||config.signinRequired){
    try{
     const r=await fetch("/api/auth/session",{credentials:"same-origin",cache:"no-store"});
     if(!r.ok)throw Error("Session unavailable");
     const session=await r.json();
     if(!active.current)return;
     const isSignedIn=typeof session?.user?.id==="string"&&Boolean(session.user.id);
     signedIn=isSignedIn;setMemberSignedIn(isSignedIn);
     // A signed-in member must never inherit the anonymous device quota count.
     if(isSignedIn){setRemaining(null);setQuotaLimit(null)}
     if(config.signinRequired&&!isSignedIn){setPhase("login");return}
     // Only a hint to spare users another Turnstile. The Worker remains the
     // authority and rejects concurrent or already-consumed account grants.
     const quota=session?.trial as {used?:unknown;limit?:unknown}|undefined;
     const used=quota?.used,limit=quota?.limit;
     if(isSignedIn&&typeof used==="number"&&typeof limit==="number"&&Number.isFinite(used)&&Number.isFinite(limit)&&limit>0&&used>=0&&used<=limit){setRemaining(limit-used);setQuotaLimit(limit)}
     if(isSignedIn&&typeof used==="number"&&typeof limit==="number"
        &&Number.isFinite(used)&&Number.isFinite(limit)&&limit>0&&used>=limit){
      setPhase("exhausted");return;
     }
    }catch{
     if(config.signinRequired){if(active.current)setPhase("unavailable");return}
     // Anonymous access remains allowed when metering is optional.
    }
   }
   if(!active.current)return;
   // Anonymous GET claims are authoritative even with optional member metering.
   if(!signedIn&&!config.signinRequired&&config.trial&&config.trial.used>=config.trial.limit){setPhase("exhausted");return}
   trackUsageEvent("guest_trial_entry_view",role);setSiteKey(config.siteKey);setPhase("ready");
  }).catch(()=>{if(active.current){if(guestTrialDiscoveryEnabled())trackUsageEvent("guest_trial_unavailable",role);setPhase("unavailable")}});
  return()=>{active.current=false};
 },[quotaRefresh]);
 useEffect(()=>{
  if(!siteKey||phase!=="ready")return;
  let cancelled=false;
  const render=()=>{
   if(cancelled||!host.current||widget.current!==null)return;
   const api=turnstile();if(!api)return;
   widget.current=api.render(host.current,{
    sitekey:siteKey,action:"crew-guest-trial",
    callback:token=>{
     if(!active.current)return;
     setChallenge(token);
     // Load code only after human verification; no microphone, token or paid
     // request runs until the visitor explicitly presses Start.
     void ensureLive().catch(()=>{/* begin() surfaces retryable load errors. */});
    },
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
 useEffect(()=>{if(focusStartOnVerified&&phase==="ready"&&challenge)startButton.current?.focus({preventScroll:true})},[focusStartOnVerified,phase,challenge]);
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
   let authTicket="";
   if(signinRequired||memberSignedIn){
    const ticketResponse=await fetch("/api/auth/guest-ticket",{
     method:"POST",credentials:"same-origin",cache:"no-store",
     headers:{"content-type":"application/json"},body:"{}"
    });
    if(!ticketResponse.ok){
     trackUsageEvent("guest_trial_token_failed",role);
     if(active.current){
      if(ticketResponse.status===401)setPhase("login");
      else{setMessage(t("guestTrial.tempUnavailable"));setPhase("error")}
     }
     return;
    }
    const proof=await ticketResponse.json() as {ticket?:string};
    if(typeof proof.ticket!=="string"||!proof.ticket)throw Error("Ticket unavailable");
    authTicket=proof.ticket;
   }
   tokenRequested=true;
   const res=await fetch(GUEST_TOKEN_ENDPOINT,{method:"POST",cache:"no-store",
    headers:{"content-type":"application/json"},body:JSON.stringify({challengeToken:challenge,...(authTicket?{authTicket}:{})})});
   if(!res.headers.get("content-type")?.includes("application/json"))throw Error("invalid response");
   const data=await res.json() as GuestTrialGrant&{code?:string};
   if(!res.ok||!data.token||!data.model||data.seconds!==300){
    trackUsageEvent("guest_trial_token_failed",role);
    if(active.current){
     if(data.code==="SIGNIN_REQUIRED")setPhase("login");
     else if(data.code==="ALREADY_USED")setPhase("exhausted");
     else if(data.code==="DAILY_LIMIT")setPhase("full");
     else{setMessage(t("guestTrial.tempUnavailable"));setPhase("error")}
    }
    return;
   }
   if(active.current){trackUsageEvent("guest_trial_token_issued",role);window.dispatchEvent(new Event("crew:guest-trial-used"));await onGrant(data)}
  }catch(error){
   if(!tokenRequested&&error instanceof DOMException&&error.name==="NotAllowedError")trackUsageEvent("guest_trial_mic_denied",role);
   else trackUsageEvent(tokenRequested?"guest_trial_token_failed":"guest_trial_setup_failed",role);
   if(active.current){setMessage(error instanceof DOMException&&error.name==="NotAllowedError"
    ?t("guestTrial.micDenied"):t("guestTrial.serviceUnavailable"));setPhase("error")}
  }finally{busy.current=false}
 }
 return <div className="notice guest-live-entry" role="region" aria-label={phase==="full"?t("guestTrial.limit"):phase==="exhausted"?t("guestTrial.usedUpTitle"):t("guestTrial.homeTitle")}>
  <div style={{display:"grid",gap:10,width:"100%"}}>
   {phase!=="exhausted"&&phase!=="full"&&<><strong>{t("guestTrial.homeTitle")}</strong>
    <p>{t("guestTrial.homeDesc")}</p>
    {remaining!==null&&<p role="status">{t(memberSignedIn?"guestTrial.memberRemaining":"guestTrial.remaining",{count:remaining,limit:quotaLimit})}</p>}</>}
   {phase==="checking"&&<p role="status">{t("guestTrial.checking")}</p>}
   {phase==="ready"&&<><div ref={host} aria-label="Turnstile verification"/>
    <button ref={startButton} type="button" className="btn" disabled={!challenge} onClick={()=>void begin()}>{t("guestTrial.start")}</button></>}
   {phase==="starting"&&<p role="status">{t("guestTrial.connecting")}</p>}
   {phase==="login"&&<><p role="status">{t("guestTrial.signInToTry")}</p>
    <Link className="btn" to="/account">{t("guestTrial.signInAction")}</Link></>}
   {phase==="exhausted"&&<><strong>{t("guestTrial.usedUpTitle")}</strong><p role="status">{memberSignedIn?(quotaLimit!==null?t("guestTrial.usedMember",{limit:quotaLimit}):t("guestTrial.usedMemberNoCount")):t("guestTrial.used")}</p></>}
   {phase==="full"&&<p role="status">{t("guestTrial.limit")}</p>}
   {(phase==="exhausted"||phase==="full")&&<>
    <Link className="btn" to="/account#settings-gemini">{t("guestTrial.continueKey")}</Link>
    <Link className="btn secondary" to="/games/1a2b">{t("guestTrial.free1a2b")}</Link></>}
   {(phase==="error"||phase==="unavailable")&&<p role="status">{message||t("guestTrial.unavailable")}</p>}
   {phase==="error"&&<button className="btn secondary" type="button" onClick={()=>{setChallenge("");setPhase("ready")}}>{t("guestTrial.retry")}</button>}
   {(phase==="error"||phase==="unavailable")&&<Link className="btn secondary small" to="/account#settings-gemini">{t("guestTrial.setupKey")}</Link>}
  </div>
 </div>;
}
