import {useCallback,useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {ensureLive} from "../lib/runtime";

type TrialRole="teacher"|"zoe";
type Phase="loading"|"unavailable"|"ready"|"connecting"|"listening"|"speaking"|"ended"|"error";
type TrialConfig={enabled:boolean;siteKey?:string;seconds?:number};
type TrialGrant={token:string;model:string;seconds:number;expiresAt:string};
type TurnstileApi={
 render:(element:HTMLElement,options:{sitekey:string;callback:(token:string)=>void;"expired-callback":()=>void;"error-callback":()=>void})=>string;
 reset:(id:string)=>void;
 remove:(id:string)=>void;
};
function challengeApi():TurnstileApi|undefined{
 return (window as Window & {turnstile?:TurnstileApi}).turnstile;
}
function trialError(status:number,code:string,zh:boolean){
 if(code==="ALREADY_USED")return zh?"這個裝置或網路近期已使用免費體驗。":"A trial has already been used from this device or network recently.";
 if(code==="DAILY_LIMIT")return zh?"今天的免費試玩名額已滿，請改用自己的 Gemini Key。":"Today's guest capacity has been reached. Use your own Gemini key to continue.";
 if(status===403)return zh?"驗證未通過，請重新驗證。":"Verification failed. Please try again.";
 return zh?"目前無法啟動免費試玩，請稍後再試。":"The guest trial is temporarily unavailable.";
}
export function GuestTrialPage(){
 const {i18n}=useTranslation();
 const zh=i18n.language.toLowerCase().startsWith("zh");
 const txt=(a:string,b:string)=>zh?a:b;
 const [phase,setPhase]=useState<Phase>("loading");
 const [role,setRole]=useState<TrialRole>("teacher");
 const [config,setConfig]=useState<TrialConfig|null>(null);
 const [challenge,setChallenge]=useState("");
 const [status,setStatus]=useState("");
 const [secondsLeft,setSecondsLeft]=useState(180);
 const [input,setInput]=useState("");
 const [output,setOutput]=useState("");
 const [muted,setMuted]=useState(false);
 const container=useRef<HTMLDivElement|null>(null);
 const widget=useRef<string|null>(null);
 const session=useRef<InstanceType<NonNullable<typeof window.CrewLive>["Session"]>|null>(null);
 const timer=useRef<ReturnType<typeof setInterval>|null>(null);
 const deadline=useRef(0);
 const active=useRef(true);
 const busy=useRef(false);
 const resetTimer=()=>{if(timer.current!==null){clearInterval(timer.current);timer.current=null}};
 const close=useCallback(async(next:Phase="ended")=>{
  resetTimer();
  deadline.current=0;
  const current=session.current;
  session.current=null;
  if(current)try{await current.stop({reason:"guest-limit",silentStatus:true,emitTerminal:false})}catch{}
  if(active.current){setPhase(next);setMuted(false);if(next==="ended")setStatus(txt("免費體驗已結束。","Your free trial has ended."))}
 },[zh]);
 useEffect(()=>{
  active.current=true;
  const controller=new AbortController();
  void fetch("/api/guest/token",{cache:"no-store",signal:controller.signal})
   .then(async res=>res.ok?await res.json() as TrialConfig:{enabled:false} as TrialConfig)
   .then(data=>{
    if(!active.current)return;
    setConfig(data);
    setPhase(data.enabled&&data.siteKey?"ready":"unavailable");
   }).catch(()=>{if(active.current)setPhase("unavailable")});
  return()=>{
   active.current=false;controller.abort();resetTimer();
   const current=session.current;session.current=null;
   if(current)void current.stop({reason:"guest-page-leave",silentStatus:true,emitTerminal:false}).catch(()=>{});
  };
 },[]);
 useEffect(()=>{
  if(!config?.siteKey||phase==="unavailable")return;
  let cancelled=false;
  const render=()=>{
   if(cancelled||!container.current||widget.current!==null)return;
   const api=challengeApi();
   if(!api)return;
   widget.current=api.render(container.current,{
    sitekey:config.siteKey!,
    callback:token=>{if(active.current)setChallenge(token)},
    "expired-callback":()=>{if(active.current)setChallenge("")},
    "error-callback":()=>{if(active.current)setChallenge("")}
   });
  };
  const existing=document.getElementById("crew-guest-turnstile");
  if(existing){if(challengeApi())render();else existing.addEventListener("load",render)}
  else{
   const script=document.createElement("script");
   script.id="crew-guest-turnstile";
   script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
   script.async=true;script.defer=true;script.addEventListener("load",render);
   document.head.appendChild(script);
  }
  return()=>{
   cancelled=true;
   existing?.removeEventListener("load",render);
   if(widget.current!==null){try{challengeApi()?.remove(widget.current)}catch{}widget.current=null}
  };
 },[config?.siteKey,phase==="unavailable"]);
 const stop=()=>{void close()};
 const begin=async()=>{
  if(busy.current||phase!=="ready"||!challenge)return;
  busy.current=true;setPhase("connecting");setStatus(txt("正在建立語音連線…","Connecting your voice…"));
  const challengeToken=challenge;
  setChallenge("");
  try{
   const res=await fetch("/api/guest/token",{
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({challengeToken}),cache:"no-store"
   });
   const grant=await res.json() as TrialGrant & {error?:string;code?:string};
   if(!res.ok||!grant.token||!grant.model){
    if(active.current){setPhase("error");setStatus(trialError(res.status,grant.code||"",zh))}
    return;
   }
   await ensureLive();
   if(!window.CrewLive||!active.current)return;
   const isTeacher=role==="teacher";
   const current=new window.CrewLive.Session({
    guestAccessToken:grant.token,
    models:[grant.model],
    maxLiveAttempts:1,
    maxResumeAttempts:0,
    manualInterruptOnly:true,
    volume:100,
    voice:isTeacher?"Kore":"Aoede",
    system:isTeacher
     ?"You are Crew Teacher, a supportive English conversation tutor. This is a brief guest demonstration. Speak naturally in short turns. Ask one simple question at a time. Help learners at their level and use their language for brief clarifications."
     :"You are Zoe, a friendly fictional AI companion. Chat casually and naturally, ask one engaging question at a time. Do not claim to be human or imply you have real-world memories.",
    openingPrompt:isTeacher
     ?"Start the short sample lesson with a warm greeting and one easy question."
     :"Greet me naturally and ask how my day is going.",
    onState:value=>{
     if(!active.current||session.current!==current)return;
     if(value==="ready")setPhase("listening");
    },
    onSpeaking:value=>{if(active.current&&session.current===current)setPhase(value?"speaking":"listening")},
    onStatus:value=>{if(active.current&&session.current===current)setStatus(String(value).slice(0,160))},
    onInputTranscript:value=>{if(active.current)setInput(value.slice(-320))},
    onOutputTranscript:value=>{if(active.current)setOutput(value.slice(-320))},
    onError:()=>{if(active.current&&session.current===current){setPhase("error");setStatus(txt("語音連線中斷。","Voice connection interrupted."))}},
    onTerminal:()=>{if(active.current&&session.current===current)void close("ended")}
   });
   session.current=current;
   // Count time from token issuance, not after potentially slow audio setup.
   const expires=Date.parse(grant.expiresAt);
   const hardStop=Math.min(Date.now()+Math.min(180,grant.seconds||180)*1000,
     Number.isFinite(expires)?expires-1500:Date.now()+180000);
   deadline.current=hardStop;
   const tick=()=>{
    const remaining=Math.max(0,Math.ceil((deadline.current-Date.now())/1000));
    if(active.current)setSecondsLeft(remaining);
    if(remaining<=0)void close("ended");
   };
   tick();timer.current=setInterval(tick,1000);
   await current.start();
   if(active.current&&session.current===current&&current.ready)setPhase("listening");
  }catch{
   if(active.current){setPhase("error");setStatus(txt("無法連線，請檢查麥克風權限或稍後再試。","Unable to connect. Check microphone permission or try later."))}
   await close("error");
  }finally{
   busy.current=false;
   if(active.current){try{if(widget.current!==null)challengeApi()?.reset(widget.current)}catch{}}
  }
 };
 return <main className="crew-guest-page" style={{maxWidth:660,margin:"0 auto",padding:"28px 16px 100px"}}>
  <header style={{marginBottom:24}}>
   <small style={{letterSpacing:2,color:"var(--muted,#718096)"}}>CREW GUEST LIVE</small>
   <h1 style={{fontSize:"clamp(26px,6vw,36px)",margin:"10px 0"}}>{txt("免費和 AI 說說話","Try talking to AI for free")}</h1>
   <p className="meta">{txt("免註冊、不需 Gemini Key。第一次試玩可與 AI 老師或 Zoe 語音聊天 3 分鐘。","No sign-up or Gemini key. Try a three-minute voice chat with a teacher or Zoe.")}</p>
  </header>
  <section className="section panel" style={{padding:20}}>
   <div role="group" aria-label={txt("選擇試玩角色","Choose a character")} style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
    {(["teacher","zoe"] as const).map(item=><button key={item} type="button" className={"btn "+(role===item?"":"secondary")} disabled={phase==="connecting"||phase==="listening"||phase==="speaking"||phase==="ended"} aria-pressed={role===item} onClick={()=>setRole(item)}>{item==="teacher"?txt("AI 老師","AI Teacher"):txt("Zoe · AI 朋友","Zoe · AI Friend")}</button>)}
   </div>
   <div aria-live="polite" style={{textAlign:"center",padding:"14px 6px"}}>
    <div style={{fontWeight:700,fontSize:38,fontVariantNumeric:"tabular-nums"}}>{String(Math.floor(secondsLeft/60)).padStart(2,"0")}:{String(secondsLeft%60).padStart(2,"0")}</div>
    <p className="meta">{phase==="listening"?txt("正在聽你說話","Listening to you"):phase==="speaking"?txt("AI 正在回應","AI is speaking"):status||txt("準備開始免費試玩","Ready for your free trial")}</p>
   </div>
   {phase==="ready"&&<div style={{display:"grid",justifyItems:"center",gap:12}}>
    <div ref={container} aria-label="Turnstile verification"/>
    <button type="button" className="btn" disabled={!challenge} onClick={()=>void begin()}>{txt("開始免費試玩","Start free trial")}</button>
   </div>}
   {phase==="loading"&&<p className="meta" role="status">{txt("正在確認試用名額…","Checking guest availability…")}</p>}
   {phase==="unavailable"&&<p role="status">{txt("目前未開放免費試用。","Guest trials are not yet available.")}</p>}
   {phase==="connecting"&&<p role="status">{txt("正在啟動麥克風…","Starting microphone…")}</p>}
   {(phase==="listening"||phase==="speaking")&&<div className="actions" style={{justifyContent:"center"}}>
    <button className="btn secondary" type="button" onClick={()=>{session.current?.toggleMic();setMuted(Boolean(session.current?.micMuted))}}>{muted?txt("開啟麥克風","Unmute"):txt("靜音","Mute")}</button>
    <button className="btn" type="button" onClick={stop}>{txt("結束對話","End chat")}</button>
   </div>}
   {(phase==="error"||phase==="ended")&&<p role="status">{status}</p>}
   {(input||output)&&<div style={{marginTop:14,padding:12,borderRadius:12,background:"var(--surface-secondary,rgba(128,128,128,.08))"}}>
    {input&&<p><strong>{txt("你","You")}：</strong>{input}</p>}
    {output&&<p><strong>{role==="teacher"?txt("老師","Teacher"):"Zoe"}：</strong>{output}</p>}
   </div>}
  </section>
  <p className="meta" style={{marginTop:16}}>{txt("試玩不會建立個人記憶或課後報告。體驗結束後，可設定自己的 Gemini Key 使用完整功能。","The guest demo doesn't save personal memory or lesson reports. Add your own Gemini key for all features.")}</p>
  <Link className="btn secondary" to="/settings#settings-gemini">{txt("設定自己的 Gemini Key","Set up my Gemini key")}</Link>
 </main>;
}
