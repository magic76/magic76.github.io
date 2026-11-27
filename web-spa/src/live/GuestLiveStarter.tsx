import {useEffect,useRef,useState} from "react";
import {Link,useLocation} from "react-router-dom";
import {canRetryGuestMicrophone,isGuestVoiceVerificationExpired,guestStartDeadline,guestStartRequest} from "./guestMicRetry";
import {clearGuestChallengeHandoff,offerGuestChallengeToken} from "./guestTextChallenge";
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
export function GuestLiveStarter({onGrant,onTextGrant,role,precall=false,focusStartOnVerified=false,textEntry=false,autoTextOnVerified=false,onVerificationChange,textFallback,linksInNewTab=false,friendMemory=false,learningFeedback=false}:{onGrant:(grant:GuestTrialGrant)=>Promise<void>;onTextGrant?:(grant:GuestTrialGrant)=>Promise<void>;role:"teacher"|"friend";precall?:boolean;focusStartOnVerified?:boolean;textEntry?:boolean;autoTextOnVerified?:boolean;onVerificationChange?:(verified:boolean)=>void;textFallback?:{href:string;name:string};linksInNewTab?:boolean;friendMemory?:boolean;learningFeedback?:boolean}){
 const {t}=useTranslation(["common","voice"]);
 const location=useLocation();
 const keySetupTo="/account?returnTo="+encodeURIComponent(location.pathname+location.search)+"#settings-gemini";
 const linkTarget=linksInNewTab?{target:"_blank",rel:"noopener noreferrer"}:{};
 const [micUnavailable,setMicUnavailable]=useState(false);
 const [micPermissionDenied,setMicPermissionDenied]=useState(false);
 const microphoneHelp=()=>t(window.matchMedia?.("(display-mode: standalone)").matches?"guestTrial.micHelpGeneric":"guestTrial.micSitePermission");
 const [siteKey,setSiteKey]=useState("");
 const [signinRequired,setSigninRequired]=useState(false);
 const [dailyQuota,setDailyQuota]=useState(false);
 const [memberSignedIn,setMemberSignedIn]=useState(false);
 const [phase,setPhase]=useState<"checking"|"ready"|"login"|"exhausted"|"full"|"unavailable"|"starting"|"error">("checking");
 const [startStage,setStartStage]=useState<"microphone"|"runtime"|"ticket"|"token"|"session">("microphone");
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
   setSigninRequired(Boolean(config.signinRequired));setDailyQuota(Boolean(config.dailyQuota));
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
     setChallenge(token);onVerificationChange?.(true);
     // Preload code only after human verification. A token is issued only
     // after an explicit Start or a previously submitted text message.
     void ensureLive().catch(()=>{/* begin() surfaces retryable load errors. */});
    },
    "expired-callback":()=>{if(active.current){setChallenge("");onVerificationChange?.(false)}},
    "error-callback":()=>{if(active.current){setChallenge("");onVerificationChange?.(false)}}
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
 useEffect(()=>{
  if(textEntry&&autoTextOnVerified&&phase==="ready"&&challenge&&!busy.current)void begin(true);
 },[textEntry,autoTextOnVerified,phase,challenge]);
 async function begin(textOnly=false){
  if(busy.current||!challenge||(phase!=="ready"&&!canRetryGuestMicrophone(phase,micUnavailable,challenge)))return;
  busy.current=true;setMicPermissionDenied(false);setMicUnavailable(false);setPhase("starting");setMessage("");
  trackUsageEvent("guest_trial_start_click",role);
  let tokenRequested=false;
  let stage:"microphone"|"runtime"|"ticket"|"token"|"session"=textOnly?"runtime":"microphone";
  setStartStage(stage);
  try{
   // Request permission within the actual Start click, before any awaited work.
   // Never consume a trial grant until microphone and runtime are ready.
   if(!textOnly){
    if(!navigator.mediaDevices?.getUserMedia)throw new Error("microphone unavailable");
    const stopMic=(mic:MediaStream)=>mic.getTracks().forEach(track=>track.stop());
    const mic=await guestStartDeadline(navigator.mediaDevices.getUserMedia({audio:true}),30_000,"microphone",stopMic);
    stopMic(mic);
   }
   if(!active.current)return;
   stage="runtime";setStartStage(stage);
   await guestStartDeadline(ensureLive(),45_000,stage);
   if(!active.current)return;
   let authTicket="";
   if(signinRequired||memberSignedIn){
    stage="ticket";setStartStage(stage);
    const {ticketResponse,proof}=await guestStartRequest(async signal=>{
     const ticketResponse=await fetch("/api/auth/guest-ticket",{
      method:"POST",credentials:"same-origin",cache:"no-store",signal,
      headers:{"content-type":"application/json"},body:"{}"
     });
     const proof=ticketResponse.ok?await ticketResponse.json() as {ticket?:string}:{};
     return {ticketResponse,proof};
    },stage);
    if(!active.current)return;
    if(!ticketResponse.ok){
     trackUsageEvent("guest_trial_token_failed",role);
     if(active.current){
      if(ticketResponse.status===401)setPhase("login");
      else{setMessage(t("guestTrial.tempUnavailable"));setPhase("error")}
     }
     return;
    }
    if(typeof proof.ticket!=="string"||!proof.ticket)throw Error("Ticket unavailable");
    authTicket=proof.ticket;
   }
   stage="token";setStartStage(stage);tokenRequested=true;
   const {res,data}=await guestStartRequest(async signal=>{
    const res=await fetch(GUEST_TOKEN_ENDPOINT,{method:"POST",cache:"no-store",signal,
     headers:{"content-type":"application/json"},body:JSON.stringify({challengeToken:challenge,...(role==="friend"&&friendMemory?{role:"friend",friendMemory:true}:{}),...(learningFeedback?{role,learningFeedback:true}:{}),...(authTicket?{authTicket}:{})})});
    if(!res.headers.get("content-type")?.includes("application/json"))throw Error("invalid response");
    const data=await res.json() as GuestTrialGrant&{code?:string;error?:string};
    return {res,data};
   },stage);
   if(!active.current)return;
   if(!res.ok||!data.token||!data.model||data.seconds!==300){
    trackUsageEvent("guest_trial_token_failed",role);
    if(active.current){
     if(isGuestVoiceVerificationExpired(res.status,data)){setChallenge("");onVerificationChange?.(false);setPhase("ready")}
     else if(data.code==="SIGNIN_REQUIRED")setPhase("login");
     else if(data.code==="ALREADY_USED")setPhase("exhausted");
     else if(data.code==="DAILY_LIMIT")setPhase("full");
     else{setMessage(t("guestTrial.tempUnavailable"));setPhase("error")}
    }
    return;
   }
   if(active.current){stage="session";setStartStage(stage);trackUsageEvent("guest_trial_token_issued",role);window.dispatchEvent(new Event("crew:guest-trial-used"));await (textOnly&&onTextGrant?onTextGrant:onGrant)(data)}
  }catch(error){
   if(!active.current)return;
   // Diagnostic metadata only; never log the challenge, token, or raw errors.
   console.warn("[Koolo guest voice startup]",{stage,standalone:window.matchMedia?.("(display-mode: standalone)").matches===true});
   const micTimeout=stage==="microphone"&&error instanceof Error&&error.name==="MicrophoneTimeoutError";
   const denied=stage==="microphone"&&error instanceof DOMException&&error.name==="NotAllowedError";
   const blocked=denied||(stage==="microphone"&&error instanceof DOMException&&error.name==="SecurityError");
   const noMicrophone=stage==="microphone"&&((error instanceof DOMException&&error.name==="NotFoundError")
    ||(error instanceof Error&&error.name==="Error"&&error.message==="microphone unavailable"));
   const micFailed=blocked||noMicrophone||micTimeout;
   if(!tokenRequested&&denied)trackUsageEvent("guest_trial_mic_denied",role);
   else trackUsageEvent(tokenRequested?"guest_trial_token_failed":"guest_trial_setup_failed",role);
   if(micFailed)setMicUnavailable(true);
   if(denied){
    setMicPermissionDenied(true);
    if(active.current){setMessage(t("guestTrial.micDenied"));if(textFallback)setMessage(t("guestTrial.micTextFallback",{name:textFallback.name}));setPhase("error")}
   }else if(active.current){
    if(blocked||micTimeout)setMicPermissionDenied(true);
    setMessage(micTimeout?t("guestTrial.micHelpGeneric"):micFailed?(textFallback?t("guestTrial.micTextFallback",{name:textFallback.name}):t(noMicrophone?"guestTrial.micNotFound":"guestTrial.micDenied")):t("guestTrial.serviceUnavailable"));
    setPhase("error");
   }
  }finally{busy.current=false}
 }
 return <div className="notice guest-live-entry" role="region" aria-label={textEntry?t("voice:friendLive.textChat"):phase==="full"?t("guestTrial.limit"):phase==="exhausted"?t("guestTrial.usedUpTitle"):t("guestTrial.homeTitle")}>
  {precall&&!textEntry&&(phase==="checking"||phase==="ready"||phase==="starting")&&<p className="friend-precall-steps">{t("voice:friendLive.preCallSteps")}</p>}
  <div style={{display:"grid",gap:10,width:"100%"}}>
   {!textEntry&&phase!=="exhausted"&&phase!=="full"&&<><strong>{phase==="error"&&micUnavailable&&textFallback?t("guestTrial.micTextTitle"):t("guestTrial.homeTitle")}</strong>
    <p>{phase==="error"&&micUnavailable&&textFallback?t("guestTrial.micTextDesc"):t("guestTrial.homeDesc")}</p>
    {remaining!==null&&remaining<=1&&<p role="status">{t(memberSignedIn?"guestTrial.memberRemaining":"guestTrial.remaining",{count:remaining,limit:quotaLimit})}</p>}</>}
   {phase==="checking"&&<p role="status">{t("guestTrial.checking")}</p>}
   {phase==="ready"&&<><div ref={host} aria-label="Turnstile verification"/>
    {precall&&<p className={"friend-precall-verification"+(challenge?" is-verified":"")} role="status" aria-live="polite">{t(challenge?"voice:friendLive.preCallVerified":"voice:friendLive.preCallWaiting")}</p>}
    {!textEntry&&<p style={{fontSize:13,lineHeight:1.5,margin:0}}>{t("guestTrial.microphoneNotice")}</p>}
    {!textEntry&&<button ref={startButton} type="button" className="btn" disabled={!challenge} onClick={()=>void begin()}>{precall?t("voice:friendLive.preCallStart"):t("guestTrial.start")}</button>}{role==="friend"&&onTextGrant&&!textEntry&&<button type="button" className="btn secondary" disabled={!challenge} onClick={()=>void begin(true)}>{t("voice:friendLive.useText")}</button>}</>}
   {precall&&role==="friend"&&!onTextGrant&&textFallback&&(phase==="checking"||phase==="ready"||phase==="unavailable")&&<Link className="btn secondary friend-precall-text-fallback" to={textFallback.href} {...linkTarget}>{t("voice:friendLive.preCallTextFallback",{name:textFallback.name})}</Link>}
   {phase==="starting"&&<p role="status">{t(startStage==="microphone"?"guestTrial.startingMic":startStage==="runtime"?"loading":startStage==="ticket"||startStage==="token"?"guestTrial.checking":"guestTrial.connecting")}</p>}
   {phase==="login"&&<><p role="status">{t("guestTrial.signInToTry")}</p>
    <Link className="btn" to="/account" {...linkTarget}>{t("guestTrial.signInAction")}</Link></>}
   {phase==="exhausted"&&<><strong>{t("guestTrial.usedUpTitle")}</strong><p role="status">{(memberSignedIn||dailyQuota)?(quotaLimit!==null?t("guestTrial.usedMember",{limit:quotaLimit}):t("guestTrial.usedMemberNoCount")):t("guestTrial.used")}</p></>}
   {phase==="full"&&<p role="status">{t("guestTrial.limit")}</p>}
   {phase==="exhausted"&&dailyQuota&&!memberSignedIn&&<Link className="btn" to="/account" {...linkTarget}>{t("voice:guestText.memberUpgrade")}</Link>}
   {(phase==="exhausted"||phase==="full")&&<>
    {textFallback&&!onTextGrant&&<Link className="btn secondary" to={textFallback.href} {...linkTarget}>{t(role==="teacher"?"guestTrial.practiceByText":"guestTrial.chatByText",{name:textFallback.name})}</Link>}
    <Link className="btn secondary" to={keySetupTo} {...linkTarget}>{t("auth.byokSetup")}</Link>
    <Link className="btn secondary" to="/games/1a2b" {...linkTarget}>{t("guestTrial.free1a2b")}</Link></>}
   {(phase==="error"||phase==="unavailable")&&<p role={phase==="error"&&micPermissionDenied?"alert":"status"}>{message||t("guestTrial.unavailable")}</p>}
   {phase==="error"&&textFallback&&!onTextGrant&&<Link className={precall&&!micUnavailable?"btn secondary friend-precall-text-fallback":"btn"} to={textFallback.href} onClick={()=>offerGuestChallengeToken(challenge)}>{precall&&!micUnavailable?t("voice:friendLive.preCallTextFallback",{name:textFallback.name}):t(role==="teacher"?"guestTrial.practiceByText":"guestTrial.chatByText",{name:textFallback.name})}</Link>}
   {phase==="error"&&role==="friend"&&onTextGrant&&challenge&&<button className="btn" type="button" onClick={()=>void begin(true)}>{t("voice:friendLive.useText")}</button>}
   {phase==="error"&&<button className="btn secondary" type="button" onClick={()=>{
    if(canRetryGuestMicrophone(phase,micUnavailable,challenge)){void begin();return}
    clearGuestChallengeHandoff();setChallenge("");onVerificationChange?.(false);setMicPermissionDenied(false);setMicUnavailable(false);setPhase("ready");
   }}>{t(micUnavailable?"guestTrial.retryMic":"guestTrial.retry")}</button>}
   {phase==="error"&&micPermissionDenied&&<p style={{fontSize:13,lineHeight:1.6,margin:0,overflowWrap:"anywhere"}}>{microphoneHelp()}</p>}
  </div>
 </div>;
}

