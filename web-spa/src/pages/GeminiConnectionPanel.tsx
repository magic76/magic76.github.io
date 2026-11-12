import {useEffect,useRef,useState} from "react";
import {trackUsageEvent} from "../analytics/usage";
import {useTranslation} from "react-i18next";
import {useLocation,useNavigate,useSearchParams} from "react-router-dom";
import i18n from "../i18n";
import {GUEST_TEXT_DAILY_TURNS} from "../live/guestAllowance";
import {clearGeminiKey,ensureLive,geminiKey,geminiVerified,saveGeminiKey,setGeminiVerified} from "../lib/runtime";
import {fetchGuestTrialConfig,guestTrialDiscoveryEnabled} from "../lib/guestTrial";

type MicPermission = PermissionState|"unknown"|"unsupported";
type VoiceResult = "idle"|"testing"|"success"|"failed";

function isMicrophoneDenied(value:unknown){
 const error=value as {name?:string;message?:string}|null;
 const detail=String(error?.name||"")+" "+String(error?.message||"");
 return /NotAllowedError|PermissionDeniedError|SecurityError|permission denied|not allowed|access is denied|permission dismissed/i.test(detail);
}
function isMicrophoneMissing(value:unknown){
 const error=value as {name?:string;message?:string}|null;
 return /NotFoundError|DevicesNotFoundError|Requested device not found/i.test(String(error?.name||"")+" "+String(error?.message||""));
}
function safeDetail(value:unknown){
 const message=value instanceof Error?value.message:String(value||i18n.t("settings:gemini.mediaError"));
 return message.replace(/AIza[0-9A-Za-z_-]+/g,i18n.t("settings:gemini.hideKey")).replace(/gemini-[0-9A-Za-z.-]+/gi,i18n.t("settings:gemini.voiceService")).slice(0,180);
}
function microphoneHelp(){
 const agent=navigator.userAgent;
 if(/Macintosh|Mac OS X/.test(agent))return i18n.t("settings:gemini.macHelp");
 if(/Windows/.test(agent))return i18n.t("settings:gemini.windowsHelp");
 return i18n.t("settings:gemini.genericHelp");
}
function microphoneLabel(permission:MicPermission,blocked:boolean){
 if(blocked||permission==="denied")return i18n.t("settings:gemini.micStateDenied");
 if(permission==="granted")return i18n.t("settings:gemini.micStateAllowed");
 if(permission==="prompt")return i18n.t("settings:gemini.micStatePrompt");
 if(permission==="unsupported")return i18n.t("settings:gemini.micStateUnsupported");
 return i18n.t("settings:gemini.micStateUnknown");
}
function voiceFailure(value:unknown){
 if(isMicrophoneDenied(value))return i18n.t("settings:gemini.voiceDenied");
 if(isMicrophoneMissing(value))return i18n.t("settings:gemini.voiceMissing");
 return i18n.t("settings:gemini.voiceError",{reason:safeDetail(value)});
}

export function GeminiConnectionPanel({section="all"}:{section?:"key"|"voice"|"all"}){
 const {t}=useTranslation("settings");
 const navigate=useNavigate(),location=useLocation(),[params]=useSearchParams();
 const requestedReturn=params.get("returnTo")||"";
 const returnTo=requestedReturn.startsWith("/")&&!requestedReturn.startsWith("//")&&!requestedReturn.startsWith("/\\")&&!/^\/(?:settings|account)(?:[/?#]|$)/.test(requestedReturn)?requestedReturn:null;
 const initialKey=geminiKey(),initialVerified=geminiVerified();
 const [key,setKey]=useState(initialKey);
 const [remember,setRemember]=useState(Boolean(localStorage.getItem("crew_gemini_api_key")));
 const [verified,setVerified]=useState(initialVerified);
 const [keyStatus,setKeyStatus]=useState(initialVerified?t("gemini.initialVerified"):initialKey?t("gemini.initialPending"):t("gemini.initialMissing"));
 const [showSetup,setShowSetup]=useState(!initialKey||!initialVerified||location.hash==="#settings-gemini");
 const [validating,setValidating]=useState(false);
 const [micPermission,setMicPermission]=useState<MicPermission>("unknown");
 const [micBlocked,setMicBlocked]=useState(false);
 const [micChecking,setMicChecking]=useState(false);
 const [micStatus,setMicStatus]=useState("");
 const [voiceResult,setVoiceResult]=useState<VoiceResult>("idle");
 const [voiceStatus,setVoiceStatus]=useState(t("gemini.initialVoice"));
 const [volume,setVolume]=useState(()=>{
  const saved=Number(localStorage.getItem("crew_live_volume")??"100");
  return Number.isFinite(saved)?Math.max(0,Math.min(300,saved)):100;
 });
 const [voiceBusy,setVoiceBusy]=useState(false);
 const [guestAvailable,setGuestAvailable]=useState(false);
 const mounted=useRef(true);
 const liveRef=useRef<any>(null);
 const validationRef=useRef<AbortController|null>(null);

 useEffect(()=>{if(location.hash==="#settings-gemini")setShowSetup(true)},[location.hash]);
 useEffect(()=>{
  if(initialKey||!guestTrialDiscoveryEnabled())return;
  let live=true;
  void fetchGuestTrialConfig().then(x=>{if(live)setGuestAvailable(x.enabled)});
  return()=>{live=false};
 },[initialKey]);


 useEffect(()=>{
  mounted.current=true;
  let permission:PermissionStatus|null=null;
  const refresh=()=>{if(mounted.current&&permission)setMicPermission(permission.state)};
  if(!navigator.mediaDevices?.getUserMedia){
   setMicPermission("unsupported");
  }else if(navigator.permissions?.query){
   void navigator.permissions.query({name:"microphone" as PermissionName}).then(result=>{
    if(!mounted.current)return;
    permission=result;refresh();permission.addEventListener("change",refresh);
   }).catch(()=>{if(mounted.current)setMicPermission("unsupported")});
  }else{
   setMicPermission("unsupported");
  }
  return ()=>{
   mounted.current=false;
   validationRef.current?.abort();
   if(permission)permission.removeEventListener("change",refresh);
   if(liveRef.current)void liveRef.current.stop({silentStatus:true,emitTerminal:false});
   liveRef.current=null;
  };
 },[]);

 async function saveAndVerify(){
  const candidate=key.trim();
  if(!candidate){setKeyStatus(t("gemini.keyEmpty"));return}
  if(validating||voiceBusy)return;
  setValidating(true);setKeyStatus(t("gemini.validating"));
  const controller=new AbortController();validationRef.current=controller;
  const timeout=window.setTimeout(()=>controller.abort(),10000);
  try{
   const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",{
    headers:{"x-goog-api-key":candidate},signal:controller.signal
   });
   if(!response.ok)throw new Error(response.status===400||response.status===401||response.status===403
    ?t("gemini.invalid",{status:response.status}):t("gemini.httpFailure",{status:response.status}));
  }catch(error){
   if(mounted.current){
    setKeyStatus(t("gemini.keyError",{reason:error instanceof Error&&error.name==="AbortError"?t("gemini.timeout"):safeDetail(error)}));
    setValidating(false);
   }
   return;
  }finally{
   window.clearTimeout(timeout);
   if(validationRef.current===controller)validationRef.current=null;
  }
  if(!mounted.current)return;
  try{
   saveGeminiKey(candidate,remember);
   setGeminiVerified(true);
  }catch(_){
   setKeyStatus(t("gemini.storageError"));
   setValidating(false);return;
  }
  trackUsageEvent("gemini_key_verified");
  setVerified(true);
  setKeyStatus(t("gemini.keySaved"));
  setVoiceResult("idle");setVoiceStatus(t("gemini.initialVoice"));
  setShowSetup(false);setValidating(false);
  if(returnTo)navigate(returnTo,{replace:true});
 }

 async function checkMicrophone(){
  if(micChecking||voiceBusy||validating)return;
  setMicChecking(true);setMicStatus(t("gemini.micChecking"));
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw new Error(t("gemini.micStateUnsupported"));
   let expired=false;
   let timeoutId:ReturnType<typeof setTimeout>|undefined;
   const permissionRequest=navigator.mediaDevices.getUserMedia({audio:true});
   // Browsers cannot cancel a permission prompt; release a late stream instead.
   permissionRequest.then(stream=>{if(expired||!mounted.current)stream.getTracks().forEach(track=>track.stop())}).catch(()=>{});
   let stream:MediaStream;
   try{
    stream=await Promise.race([
     permissionRequest,
     new Promise<MediaStream>((_,reject)=>{
      timeoutId=window.setTimeout(()=>{expired=true;reject(new Error("麥克風啟用逾時（10 秒），請確認權限後重試。"))},10000);
     })
    ]);
   }finally{
    if(timeoutId!==undefined)window.clearTimeout(timeoutId);
   }
   stream.getTracks().forEach(track=>track.stop());
   if(mounted.current){
    setMicPermission("granted");setMicBlocked(false);setMicStatus(t("gemini.micSuccess"));
   }
  }catch(error){
   if(mounted.current){
    if(isMicrophoneDenied(error)){setMicBlocked(true);setMicPermission("denied")}
    setMicStatus(isMicrophoneDenied(error)?t("gemini.micDenied"):isMicrophoneMissing(error)?t("gemini.micMissing"):t("gemini.micError",{reason:safeDetail(error)}));
   }
  }finally{if(mounted.current)setMicChecking(false)}
 }

 async function testVoice(){
  if(voiceBusy||validating||!geminiKey())return;
  setVoiceBusy(true);setVoiceResult("testing");setVoiceStatus(t("gemini.startingLive"));
  let finished=false;
  const fail=(error:unknown)=>{
   if(finished)return;
   finished=true;
   if(liveRef.current){
    const running=liveRef.current;liveRef.current=null;
    void running.stop({silentStatus:true,emitTerminal:false,emitState:false});
   }
   if(!mounted.current)return;
   if(isMicrophoneDenied(error)){setMicBlocked(true);setMicPermission("denied")}
   setVoiceResult("failed");setVoiceStatus(voiceFailure(error));setVoiceBusy(false);
  };
  try{
   await ensureLive();
   if(!window.CrewLive)throw new Error(t("gemini.missingRuntime"));
   if(!mounted.current)return;
   const session=new window.CrewLive.Session({
    system:"這是語音連線測試。請只用繁體中文說一句「連線成功」，不要延伸聊天。",
    openingPrompt:"請現在說出測試句。",voice:"Kore",volume,manualInterruptOnly:true,
    maxLiveAttempts:2,connectTimeoutMs:8000,replyTimeoutMs:10000,
    onStatus:(value:string)=>{if(mounted.current&&!finished)setVoiceStatus(safeDetail(value))},
    onTurnComplete:async(turn:{hasValidOutput?:boolean})=>{
     if(!turn.hasValidOutput||finished)return;
     finished=true;
     try{
      await session.waitForPlaybackDrain(6500);
      await session.stop({reason:"test-complete",silentStatus:true,emitTerminal:false,emitState:false});
      liveRef.current=null;
      if(mounted.current){setMicBlocked(false);setMicPermission("granted");setVoiceResult("success");setVoiceStatus(t("gemini.voiceSuccess"));setVoiceBusy(false)}
     }catch(error){
      liveRef.current=null;
      if(mounted.current){setVoiceResult("failed");setVoiceStatus(voiceFailure(error));setVoiceBusy(false)}
     }
    },
    onError:(error:Error)=>fail(error)
   });
   liveRef.current=session;
   await session.start();
   if(mounted.current&&!finished){setMicBlocked(false);setMicPermission("granted")}
  }catch(error){fail(error)}
 }

 const configured=Boolean(geminiKey());
 const micDenied=micBlocked||micPermission==="denied";
 const caps:[string,boolean][]=[
  [t("gemini.micAPI"),!!navigator.mediaDevices?.getUserMedia],
  ["WebSocket",typeof WebSocket!=="undefined"],
  ["Web Audio",!!(window.AudioContext||(window as any).webkitAudioContext)],
  ["Wake Lock",!!(navigator as any).wakeLock?.request]
 ];
 return <>
  {section!=="voice"&&(!showSetup&&configured?
   <section id="settings-gemini" className={"section panel settings-connected-card "+(verified?"verified":"pending")}>
    <div className="settings-connected-main"><span className="settings-connected-mark">{verified?"✓":"!"}</span>
     <span><strong>{verified?t("gemini.configured"):t("gemini.unverified")}</strong>
      <small>{verified?t("gemini.verifiedDesc"):t("gemini.unverifiedDesc")}</small></span></div>
    <div className="actions"><button className="btn secondary" disabled={validating||voiceBusy} onClick={()=>setShowSetup(true)}>{t("gemini.reconfigure")}</button></div>
    <div className={"result settings-connection-result "+(verified?"success":"")} role="status">{keyStatus}</div>
   </section>:
   <section id="settings-gemini" className="section panel">
    <h3>{configured?t("gemini.titleEdit"):t("gemini.titleNew")}</h3>
    <p className="meta">{t("gemini.intro")}</p>
    <p className="meta">{t("gemini.keyCapabilities",{count:GUEST_TEXT_DAILY_TURNS})}</p>
    {!configured&&<div className="settings-gemini-free"><strong>{t("gemini.freeTitle")}</strong><p>{t("gemini.freeDesc")}</p></div>}
    {!configured&&guestAvailable&&<div className="settings-gemini-free"><strong>{t("common:guestTrial.settingsTitle")}</strong><p><a className="btn" href="/friend/live?id=zoe">{t("common:guestTrial.settingsCta")}</a></p></div>}
    <div className="setup-steps">
     <div className="step"><b>1</b><span><strong>{t("gemini.step1")}</strong><small>{t("gemini.step1Desc")}</small></span></div>
     <div className="step"><b>2</b><span><strong>{t("gemini.step2")}</strong><small>{t("gemini.step2Desc")}</small></span></div>
     <div className="step"><b>3</b><span><strong>{t("gemini.step3")}</strong><small>{t("gemini.step3Desc")}</small></span></div>
    </div>
    <div className="actions"><a className="btn settings-gemini-open" href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">{t("gemini.openStudio")}</a></div>
    <p className="meta settings-gemini-pricing">{t("gemini.pricingNote")} <a href="https://ai.google.dev/gemini-api/docs/pricing" target="_blank" rel="noopener noreferrer">{t("gemini.pricingLink")}</a></p>
    <label className="label" htmlFor="crew-gemini-key">Gemini API Key</label>
    <input id="crew-gemini-key" className="field" type="password" value={key} onChange={event=>setKey(event.target.value)} placeholder={t("gemini.keyPlaceholder")} autoComplete="off"/>
    <p className="meta" style={{marginTop:8}}>{t("gemini.privacy")}</p>
    <label className="row" style={{marginTop:10}}><input type="checkbox" checked={remember} onChange={event=>setRemember(event.target.checked)}/><span className="meta">{t("gemini.remember")}</span></label>
    <div className="actions settings-primary-action">
     <button className="btn" disabled={validating||voiceBusy} onClick={()=>void saveAndVerify()}>{validating?t("gemini.saving"):t("gemini.save")}</button>
     {configured&&<button className="btn secondary" disabled={validating} onClick={()=>{setKey(geminiKey());setShowSetup(false)}}>{t("gemini.cancel")}</button>}
    </div>
    <div className={"result settings-connection-result "+(verified?"success":"")} role="status">{keyStatus}</div>
   </section>
  )}
  {section!=="voice"&&<details className="settings-danger-zone crew-account-key-clear">
   <summary>{t("gemini.advanced")}</summary>
   <button className="btn secondary" disabled={voiceBusy||validating} onClick={()=>{
    clearGeminiKey();setKey("");setRemember(false);setVerified(false);setKeyStatus(t("gemini.clearedKey"));setShowSetup(true);
    setVoiceResult("idle");setVoiceStatus(t("gemini.initialVoice"));
   }}>{t("gemini.clearKey")}</button>
  </details>}
  {section!=="key"&&<section className="section panel settings-voice-check">
   <div className="section-head"><h2>{t("gemini.voiceTitle")}</h2><small>{t("gemini.voiceTagline")}</small></div>
   <p className="meta">{t("gemini.voiceIntro")}</p>
   <div className="settings-check-list">
    <div><strong>{t("gemini.stepKey")}</strong><span>{configured?(verified?t("gemini.stateVerified"):t("gemini.stateUnverified")):t("gemini.stateMissing")}</span></div>
    <div><strong>{t("gemini.stepMic")}</strong><span>{microphoneLabel(micPermission,micBlocked)}</span></div>
    <div><strong>{t("gemini.stepLive")}</strong><span>{voiceResult==="success"?t("gemini.stateLiveSuccess"):voiceResult==="testing"?t("gemini.stateTesting"):voiceResult==="failed"?t("gemini.stateFailed"):t("gemini.stateNotTested")}</span></div>
   </div>
   <div className="actions">
    <button className="btn secondary" disabled={micChecking||voiceBusy||validating} onClick={()=>void checkMicrophone()}>{micChecking?t("gemini.checkingMic"):t("gemini.checkMic")}</button>
    <button className="btn" disabled={!configured||!verified||voiceBusy||micChecking||validating} onClick={()=>void testVoice()}>{voiceBusy?t("gemini.testingLive"):t("gemini.testLive")}</button>
   </div>
   {micStatus&&<p className="meta" role="status">{micStatus}</p>}
   <div className={"result settings-connection-result "+(voiceResult==="success"?"success":"")} role="status">{voiceStatus}</div>
   {micDenied&&<p className="meta settings-mic-advice" role="alert">{microphoneHelp()}</p>}
   <div><label className="label" htmlFor="crew-live-volume">{t("gemini.volume")}</label><div className="range-row">
    <input id="crew-live-volume" className="field" type="range" min="0" max="300" step="5" value={volume} onChange={event=>{const value=Number(event.target.value);setVolume(value);localStorage.setItem("crew_live_volume",String(value))}}/>
    <strong>{volume}%</strong>
   </div></div>
   <details className="settings-diagnostics">
    <summary>{t("gemini.diagnostics")}</summary>
    <p className="meta">{t("gemini.diagnosticsDesc")}</p>
    <div className="result settings-capabilities">
     <div>{t("gemini.micAuthorization")}：{microphoneLabel(micPermission,micBlocked)}</div>
     {caps.map(([name,ok])=><div key={name}>{ok?"✓ ":"— "}{name}</div>)}
    </div>
   </details>
   <details className="settings-danger-zone">
    <summary>{t("gemini.advanced")}</summary>
    <div className="actions">
     <button className="btn secondary" onClick={()=>{
      ["teacher","story","fortune","teacher_pronunciation","teacher_textbook"].forEach(name=>{
       localStorage.removeItem("crew_history_"+name);localStorage.removeItem("crew_live_last_"+name);
      });
      setVoiceStatus(t("gemini.clearedRecord"));
     }}>{t("gemini.clearRecord")}</button>
    </div>
   </details>
  </section>}
 </>;
}
