import {LiveTextConversation} from "./liveTextChat";
import {buildShortsTextSystems} from "./shortsTextContext";
import {createTypingReveal} from "./typingReveal";
import {sendGuestTextWithRenewal} from "./guestTextFlow";
import {classifyGuestTextFailure,guestTextWorkerError,markGuestTextStartError,isGuestTextStartError} from "./guestTextError";
import {readSessionTranscript,writeSessionTranscript,saveFriendResume,readPendingTextDraft,writePendingTextDraft,clearPendingTextDraft} from "./sessionTranscript";
import {GroundingSources} from "./GroundingSources";
import {TextChatStarters} from "./TextChatStarters";
import type {GroundingSource} from "./grounding";
import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {GUEST_TEXT_DAILY_TURNS} from "./guestAllowance";
import {geminiKey,geminiVerified} from "../lib/runtime";
import {PinyinHint} from "../teacher/PinyinHint";
import type {PinyinAidMode} from "../teacher/pinyinAid";
import type {TeachingMode} from "../store/teacherStore";
import "./TextChatPanel.css";

type Message={role:"user"|"assistant";text:string;sources?:GroundingSource[];searchSuggestions?:string};
type Props={system:string;speaker:string;sessionScope?:string;english?:boolean;searchEnabled?:boolean;hint?:string;targetLanguage?:string;pinyinMode?:PinyinAidMode;teachingMode?:TeachingMode;firstStarter?:string;shortsContext?:string;onExchange?:()=>void};
type GuestPhase="checking"|"ready"|"starting"|"active"|"unavailable"|"error"|"exhausted"|"paused";
type TurnstileApi={render:(el:HTMLElement,options:{sitekey:string;action:string;callback:(token:string)=>void;"expired-callback":()=>void;"error-callback":()=>void})=>string;remove:(id:string)=>void};
const turnstile=()=> (window as Window&{turnstile?:TurnstileApi}).turnstile;
const GUEST_TEXT_ENDPOINT="https://crew-guest-trial.shanliyoung.workers.dev/api/guest/text";
const SESSION_STORAGE_KEY="crew_guest_text_session_v1";
function getSavedGuestSession(){
 try{
  const saved=JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)||"null");
  if(typeof saved?.sessionToken==="string"&&/^[0-9a-f]{64}$/.test(saved.sessionToken)
   &&typeof saved.expiresAt==="number"&&saved.expiresAt>Date.now()+5000)return saved.sessionToken as string;
 }catch{}
 try{sessionStorage.removeItem(SESSION_STORAGE_KEY)}catch{}
 return "";
}
/** No microphone: BYOK connects to Gemini Live; guests use metered Worker text. */
export function TextChatPanel({system:baseSystem,speaker,sessionScope="",english=false,searchEnabled=false,hint,targetLanguage="",pinyinMode="auto",teachingMode="bilingual",firstStarter,shortsContext,onExchange}:Props){
 const shortsSystems=shortsContext?buildShortsTextSystems(baseSystem,shortsContext):null;
 const system=shortsSystems?.live||baseSystem;
 const [messages,setMessages]=useState<Message[]>([]);
 const [draft,setDraft]=useState("");
 const [historyReady,setHistoryReady]=useState(false);
 const latestMessages=useRef<Message[]>([]);
 const [busy,setBusy]=useState(false);
 const [requestSent,setRequestSent]=useState(false);
 const pendingSend=useRef<{before:Message[];value:string;sent:boolean}|null>(null);
 const [error,setError]=useState("");
 const [guestFailure,setGuestFailure]=useState<{messageKey:string;kind:string;retry:boolean;start:boolean;repeated:boolean}|null>(null);
 const backendFailureCount=useRef(0);
 const {t}=useTranslation("voice");
 const [liveStatus,setLiveStatus]=useState("");
 const liveChat=useRef<LiveTextConversation|null>(null);
 const typingRef=useRef<ReturnType<typeof createTypingReveal>|null>(null);
 // A stale, unverified browser key must not silently block free practice.
 const [useGuest,setUseGuest]=useState(()=>!geminiKey()||!geminiVerified());
 const [guestPhase,setGuestPhase]=useState<GuestPhase>("checking");
 const [guestToken,setGuestToken]=useState(getSavedGuestSession);
 const [siteKey,setSiteKey]=useState("");
 const [challenge,setChallenge]=useState("");
 const challengeWaiter=useRef<{resolve:(value:string)=>void;reject:(reason:Error)=>void}|null>(null);
 const [guestStatus,setGuestStatus]=useState("");
 const [remaining,setRemaining]=useState<number|null>(null);
 const mounted=useRef(true);
 const history=useRef<HTMLDivElement>(null);
 const guestBox=useRef<HTMLDivElement>(null);
 const bottom=useRef<HTMLDivElement>(null);
 const host=useRef<HTMLDivElement|null>(null);
 const widget=useRef<string|null>(null);
 const hasKey=Boolean(geminiKey());
 const guestMode=useGuest||!hasKey;
 useEffect(()=>{mounted.current=true;return()=>{
  mounted.current=false;
  challengeWaiter.current?.reject(Error("UNMOUNTED"));challengeWaiter.current=null;
 }},[]);
 // Restore only after mount: the server and first client render match.
 useEffect(()=>{
  const saved=readSessionTranscript(sessionScope);
  const dangling=saved.at(-1)?.role==="user"?saved.pop()?.text:"";
  // Also recover older transcripts written by the pre-v2 unmount path.
  if(dangling)writeSessionTranscript(sessionScope,saved);
  const pending=readPendingTextDraft(sessionScope);
  if(pending||dangling){
   setDraft(pending?.text||dangling||"");
   setError(pending?.sent
    ?english?"The previous message may have been sent without a reply. Retrying may use another free message.":"上一則訊息可能已送出但未收到回覆，重送可能再次使用免費額度。"
    :english?"Your previous message wasn't sent. Press Send to retry.":"上一則訊息尚未送出，按「送出」即可重試。");
  }
  latestMessages.current=saved;
  setMessages(saved);setHistoryReady(true);
 },[sessionScope]);
 latestMessages.current=messages;
 useEffect(()=>{
  if(!historyReady||!sessionScope)return;
  const timer=window.setTimeout(()=>writeSessionTranscript(sessionScope,pendingSend.current?.before||messages),180);
  return()=>window.clearTimeout(timer);
 },[messages,historyReady,sessionScope]);
 useEffect(()=>()=>{
  if(historyReady&&sessionScope)writeSessionTranscript(sessionScope,pendingSend.current?.before||latestMessages.current);
 },[historyReady,sessionScope]);
 useEffect(()=>()=>{
  typingRef.current?.cancel();typingRef.current=null;
  liveChat.current?.close();liveChat.current=null;
 },[guestMode,system,searchEnabled]);
 useEffect(()=>{
  if(messages.length&&history.current)history.current.scrollTop=history.current.scrollHeight;
 },[messages.length,messages.at(-1)?.text.length,historyReady]);
 // A late Turnstile iframe changes the available height after transcript restore.
 // Observe both the challenge and the scroll viewport, not just message changes.
 useEffect(()=>{
  const log=history.current,guest=guestBox.current;
  if(!log||typeof ResizeObserver!=="function")return;
  let frame=0;
  const observer=new ResizeObserver(()=>{
   cancelAnimationFrame(frame);
   frame=requestAnimationFrame(()=>{if(latestMessages.current.length)log.scrollTop=log.scrollHeight});
  });
  observer.observe(log);
  if(guest)observer.observe(guest);
  return()=>{observer.disconnect();cancelAnimationFrame(frame)};
 },[historyReady,guestMode]);
 useEffect(()=>{
  if(!guestMode)return;
  const controller=new AbortController();
  void fetch(GUEST_TEXT_ENDPOINT,{cache:"no-store",signal:controller.signal})
   .then(async response=>{
    if(!response.ok)throw Error("Unavailable");
    const config=await response.json() as {enabled?:boolean;siteKey?:string;dailyLimit?:number};
    if(!mounted.current||controller.signal.aborted)return;
    if(config.enabled!==true||typeof config.siteKey!=="string"||!config.siteKey){setGuestPhase("unavailable");return}
    setSiteKey(config.siteKey);
    setGuestPhase(current=>current==="checking"?(getSavedGuestSession()?"active":"ready"):current);
   }).catch(()=>{if(mounted.current&&!controller.signal.aborted)setGuestPhase("unavailable")});
  return()=>controller.abort();
 },[guestMode]);
 useEffect(()=>{
  if(!guestMode||guestPhase!=="ready"||!siteKey)return;
  let cancelled=false;
  const render=()=>{
   if(cancelled||!host.current||widget.current!==null||!turnstile())return;
   widget.current=turnstile()!.render(host.current,{
    sitekey:siteKey,action:"crew-guest-trial",
    callback:token=>{
     if(cancelled)return;
     const waiting=challengeWaiter.current;
     if(waiting){challengeWaiter.current=null;setChallenge("");waiting.resolve(token)}
     else setChallenge(token);
    },
    "expired-callback":()=>{if(!cancelled)setChallenge("")},
    "error-callback":()=>{if(!cancelled){setChallenge("");setGuestPhase("error")}}
   });
  };
  let script=document.getElementById("crew-guest-turnstile");
  if(!script){
   const el=document.createElement("script");el.id="crew-guest-turnstile";
   el.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
   el.async=true;el.defer=true;document.head.appendChild(el);script=el;
  }
  const scriptError=()=>{if(!cancelled)setGuestPhase("error")};
  if(turnstile())render();else script.addEventListener("load",render);
  script.addEventListener("error",scriptError);
  return()=>{
   cancelled=true;script?.removeEventListener("load",render);script?.removeEventListener("error",scriptError);
   if(widget.current!==null){try{turnstile()?.remove(widget.current)}catch{}widget.current=null}
  };
 },[guestMode,guestPhase,siteKey]);
 useEffect(()=>{
  if(guestPhase==="unavailable"||guestPhase==="error"||guestPhase==="exhausted"){
   challengeWaiter.current?.reject(Error(guestPhase.toUpperCase()));challengeWaiter.current=null;
  }
 },[guestPhase]);
 function waitForChallenge():Promise<string>{
  if(challenge){setChallenge("");return Promise.resolve(challenge)}
  return new Promise((resolve,reject)=>{challengeWaiter.current={resolve,reject}});
 }
 function invalidateGuestGrant(){
  try{sessionStorage.removeItem(SESSION_STORAGE_KEY)}catch{}
  setGuestToken("");setChallenge("");setGuestPhase("ready");setRequestSent(false);
 }
 async function startGuestText():Promise<string>{
  setGuestStatus(english?"Complete the security check to send…":"完成安全驗證後會自動送出…");
  const challengeToken=await waitForChallenge();
  setGuestPhase("starting");
  setGuestStatus(english?"Connecting free chat…":"正在建立免費連線…");
  try{
   const response=await fetch(GUEST_TEXT_ENDPOINT,{method:"POST",cache:"no-store",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({action:"start",challengeToken})});
   const data=await response.json() as {sessionToken?:string;expiresAt?:number;remaining?:number;code?:string};
   if(data.code==="DAILY_LIMIT"){
    setRemaining(0);setGuestPhase("exhausted");throw guestTextWorkerError(data.code,response.status);
   }
   if(!response.ok||!data.sessionToken||!data.expiresAt)throw guestTextWorkerError(data.code||"GUEST_START_FAILED",response.status);
   try{sessionStorage.setItem(SESSION_STORAGE_KEY,JSON.stringify({sessionToken:data.sessionToken,expiresAt:data.expiresAt}))}catch{}
   if(mounted.current){
    setGuestToken(data.sessionToken);setRemaining(typeof data.remaining==="number"?data.remaining:null);
    setGuestPhase("active");backendFailureCount.current=0;
   }
   return data.sessionToken;
  }catch(reason){
   const failure=classifyGuestTextFailure(reason);
   if(mounted.current&&failure.kind!=="dailyLimit"){
    setChallenge("");setGuestPhase(failure.reverify?"error":"paused");
   }
   throw markGuestTextStartError(reason);
  }
 }
 async function sendMessage(text:string){
  const value=text.trim().slice(0,1200);
  if(!value||busy)return;
  const key=guestMode?"":geminiKey();
  if(!key&&(guestPhase==="unavailable"||guestPhase==="exhausted"||guestPhase==="paused"))return;
  if(!key&&guestPhase==="error")setGuestPhase("ready");
  const next:Message[]=[...messages,{role:"user",text:value}];
  const answerIndex=next.length;
  pendingSend.current={before:messages,value,sent:false};
  writePendingTextDraft(sessionScope,{text:value,sent:false});
  const markDispatched=()=>{
   if(!mounted.current)throw Error("UNMOUNTED");
   if(pendingSend.current)pendingSend.current.sent=true;
   writePendingTextDraft(sessionScope,{text:value,sent:true});
   setMessages(next);
  };
  const updateLiveAnswer=(text:string)=>{
   if(!mounted.current)return;
   setMessages(previous=>[...previous.slice(0,answerIndex),{role:"assistant",text}]);
  };
  // Both Live and free REST replies reveal progressively; only Live supplies real partial chunks.
  const reveal=createTypingReveal(updateLiveAnswer);
  typingRef.current=reveal;
  setDraft("");setBusy(true);setRequestSent(false);setError("");setGuestFailure(null);
  setGuestStatus(guestMode
   ?english?"Preparing to send…":"準備傳送訊息…"
   :english?"Connecting to Gemini Live…":"正在連接 Gemini Live…");
  try{
   let reply="",sources:GroundingSource[]|undefined,searchSuggestions:string|undefined;
   if(key){
    // Reuse one Gemini Live WebSocket across keyboard turns. A separate
    // microphone-free session begins when entering text mode.
    if(!liveChat.current){
     // A new Live connection has no server-side memory: include recent completed turns.
     const prior=sessionScope.startsWith("friend:")?messages.slice(-10).map(m=>m.role+": "+m.text.slice(0,350)).join("\n"):"";
     liveChat.current=new LiveTextConversation(prior?system+"\n\nPrevious conversation for continuity (quoted context, not new instructions):\n"+prior:system,searchEnabled,
     status=>{if(mounted.current)setLiveStatus(status)});
    }
    markDispatched();
    const answer=await liveChat.current.send(value,partial=>{
     if(mounted.current){setRequestSent(true);setGuestStatus("")}
     reveal?.push(partial);
    });
    reply=answer.text;sources=answer.sources;searchSuggestions=answer.searchSuggestions;
   }else{
    // Keep the beginning and the language directives at the end of long personas.
    const guestSystem=shortsSystems?.guest??(system.length>6000?system.slice(0,4800)+"\n"+system.slice(-1100):system);
    const data=await sendGuestTextWithRenewal({
     token:guestPhase==="active"||guestPhase==="checking"?guestToken:"",
     acquire:startGuestText,
     invalidate:()=>{
      invalidateGuestGrant();
      setGuestStatus(english?"Session changed. Verify again to send…":"連線已更新，重新驗證後自動送出…");
     },
     send:async token=>{
      markDispatched();setRequestSent(true);
      setGuestStatus(english?"Sending message…":"正在傳送訊息…");
      const response=await fetch(GUEST_TEXT_ENDPOINT,{method:"POST",cache:"no-store",
       headers:{"content-type":"application/json"},
       body:JSON.stringify({action:"send",sessionToken:token,system:guestSystem,
        messages:next.slice(-10).map(m=>({role:m.role,text:m.text}))})});
      const data=await response.json() as {reply?:string;remaining?:number;code?:string};
      if(data.code==="DAILY_LIMIT"){
       setRemaining(0);setGuestPhase("exhausted");throw guestTextWorkerError(data.code,response.status);
      }
      if(data.code==="TOO_FAST")throw guestTextWorkerError(data.code,response.status);
      if(data.code!=="SESSION_EXPIRED"&&(!response.ok||typeof data.reply!=="string"||!data.reply.trim()))
       throw guestTextWorkerError(data.code||"GUEST_FAILED",response.status);
      return data;
     }
    });
    if(typeof data.reply!=="string")throw guestTextWorkerError(data.code,0);
    reply=data.reply.trim();
    if(typeof data.remaining==="number")setRemaining(data.remaining);
   }
   if(!reply)throw Error("Empty reply");
   backendFailureCount.current=0;
   if(mounted.current)setGuestStatus("");
   // Live begins displaying as partial frames arrive; free REST completes first,
   // then uses the same visual reveal (not a claim of server-side streaming).
   await reveal.finish(reply);
   if(mounted.current){
    const complete=[...next,{role:"assistant" as const,text:reply,sources,searchSuggestions}];
    latestMessages.current=complete;
    writeSessionTranscript(sessionScope,complete);
    saveFriendResume(sessionScope,complete);
    clearPendingTextDraft(sessionScope);
    pendingSend.current=null;
    setMessages(complete);
    try{onExchange?.()}catch{/* Usage tracking must not roll back a successful reply. */}
   }
  }catch(reason){
   reveal?.cancel();
   if(mounted.current){
    latestMessages.current=messages;
    setMessages(messages);setDraft(value);
    pendingSend.current=null;clearPendingTextDraft(sessionScope);
    const type=reason instanceof Error?reason.message:"";
    const detail=reason as Error&{kind?:string;status?:number};
    const status=Number(detail?.status)||Number(type.match(/\b([45]\d{2})\b/)?.[1])||0;
    const category=detail?.kind||
     (/RESOURCE_EXHAUSTED|quota/i.test(type)||status===429?"quota":
      /NOT_FOUND|unsupported model|model not found/i.test(type)||[400,404].includes(status)?"model":
      /UNAUTHENTICATED|PERMISSION_DENIED|invalid.*key/i.test(type)||[401,403].includes(status)?"key":"service");
    const byokMessage=category==="key"?(english?"This Gemini key is invalid or lacks permission.":"目前的 Gemini Key 無效或沒有存取權限。")
     :category==="quota"?(english?"Gemini rejected this Live text request (429: rate or usage limit). This does not necessarily mean your API key is out of quota. Try again later or check this model in Google AI Studio.":"Gemini 暫時拒絕這次 Live 文字請求（429：速率或用量限制）。不代表整把 API Key 的額度已用完；可稍後重試，或查看 Google AI Studio 的模型限制。")
     :category==="model"?(english?"The Gemini text model is unavailable for this key.":"目前的 Gemini Key 無法使用這個文字模型。")
     :/transcri|no text|no reply/i.test(type)?(english?"Gemini Live connected but returned no text transcript.":"Gemini Live 已連線，但沒有收到文字轉錄。")
     :/1006|WebSocket|socket|setup/i.test(type)?(english?"Gemini Live WebSocket connection was interrupted or rejected. Please retry.":"Gemini Live WebSocket 連線中斷或遭拒，請重試。")
     :(english?"Gemini Live text connection failed. Retry or switch to free practice.":"Gemini Live 文字連線失敗，請重試或改用免費文字練習。");
    if(key){setError(byokMessage);setGuestFailure(null)}
    else{
     const failure=classifyGuestTextFailure(reason);
     const start=isGuestTextStartError(reason);
     backendFailureCount.current=failure.kind==="backend"?backendFailureCount.current+1:0;
     if(failure.reverify&&!start){invalidateGuestGrant();setGuestPhase("error")}
     setGuestFailure({...failure,start,repeated:backendFailureCount.current>=2});
     setError("");
    }
   }
  }finally{
   if(mounted.current)setGuestStatus("");
   if(typingRef.current===reveal)typingRef.current=null;
   if(mounted.current){setBusy(false);setRequestSent(false)}
  }
 }
 return <section className={"crew-text-chat"+(messages.length||busy||guestPhase==="active"?" is-chatting":"")} aria-label={english?"Text chat":"文字聊天"}>
  {hasKey&&<div className="crew-text-mode-choice">
   <span>{guestMode?(english?"Free text practice":"免費文字練習"):(english?"Using your Gemini key":"使用自己的 Gemini Key")}</span>
   <button type="button" className="btn secondary small" disabled={busy} onClick={()=>{
    clearPendingTextDraft(sessionScope);pendingSend.current=null;
    setUseGuest(current=>!current);setError("");setGuestFailure(null);setMessages([]);setDraft("");setLiveStatus("");
   }}>{guestMode?(english?"Use my key":"使用自己的 Key"):(english?"Switch to free text":"改用免費文字")}</button>
  </div>}
  {!guestMode&&<small role="status" className="crew-text-chat-live-status">{liveStatus||(english?"Gemini Live keyboard chat · no microphone":"Gemini Live 鍵盤對話・不需麥克風")}</small>}
  {guestMode&&<div ref={guestBox} className="crew-text-guest" role="region" aria-label={english?"Free text practice":"免費文字練習"}>
   <strong>{english?"Free text practice — no API key needed":"免費文字練習・不需要 API Key"}</strong>
   <p>{english?`Up to ${GUEST_TEXT_DAILY_TURNS} messages a day, shared across teacher and friend chats. No microphone required.`:`每天最多 ${GUEST_TEXT_DAILY_TURNS} 則訊息，老師與 AI 朋友共用，不需要開啟麥克風。`}</p>
   {guestPhase==="checking"&&<small role="status">{english?"Checking availability…":"正在確認免費額度…"}</small>}
   {guestPhase==="ready"&&<><div ref={host} aria-label="Turnstile verification"/>
    <small>{english?"Verify once, then send your message below.":"通過驗證後，直接按下方送出即可。"}</small></>}
   {guestPhase==="starting"&&<small role="status">{english?"Starting…":"正在開啟免費練習…"}</small>}
   {guestPhase==="active"&&remaining!==null&&<small role="status">{english?remaining+" free messages remaining":"今日剩餘 "+remaining+" 則免費訊息"}</small>}
   {guestPhase==="error"&&<button className="btn secondary" type="button" onClick={()=>{setChallenge("");setGuestPhase("ready");setError("");setGuestFailure(null)}}>{t("guestText.verifyAgain")}</button>}
   {guestPhase==="paused"&&<button className="btn secondary" type="button" onClick={()=>{setChallenge("");setGuestPhase("ready");setError("");setGuestFailure(null)}}>{t("guestText.restart")}</button>}
   {guestPhase==="unavailable"&&<small role="status">{english?"Free text chat is temporarily unavailable.":"免費文字聊天暫時無法使用。"}</small>}
   {guestPhase==="exhausted"&&<small role="status">{english?"Today's free messages have been used.":"今天的免費文字訊息已用完。"}</small>}
   {(guestPhase==="unavailable"||guestPhase==="exhausted")&&
    <Link className="btn secondary small" to="/account#settings-gemini">{t("guestText.useKey")}</Link>}
  </div>}
  <div ref={history} className="crew-text-chat-history" role="log" aria-label={english?"Conversation":"對話內容"} aria-live="polite" aria-relevant="additions">
   {!messages.length&&!firstStarter&&<p className="crew-text-chat-empty">{english?"Type a message to start chatting.":"輸入訊息，開始與 "+speaker+" 聊天。"}</p>}
   {historyReady&&!messages.length&&!draft.trim()&&!busy&&sessionScope.startsWith("friend:")&&<TextChatStarters onPick={sentence=>void sendMessage(sentence)} speaker={speaker} firstStarter={firstStarter}/>}
   {messages.map((m,i)=><div key={i} className={"crew-text-chat-message "+m.role}><strong>{m.role==="user"?(english?"You":"你"):speaker}</strong><p>{m.text}</p>{m.sources&&<GroundingSources sources={m.sources} searchSuggestions={m.searchSuggestions} english={english}/>} {m.role==="assistant"&&(!busy||i!==messages.length-1)&&<PinyinHint text={m.text} targetLanguage={targetLanguage} mode={pinyinMode} teachingMode={teachingMode} english={english}/>}
   {m.role==="assistant"&&busy&&i===messages.length-1&&<span className="crew-text-stream-cursor" aria-hidden="true">▍</span>}</div>)}
   {busy&&pendingSend.current&&!pendingSend.current.sent&&<p className="crew-text-chat-pending" role="status">
    {english?"Awaiting verification · not sent yet: ":"等待驗證・尚未送出："}{pendingSend.current.value}
   </p>}
   {busy&&requestSent&&messages.at(-1)?.role!=="assistant"&&<p className="crew-text-chat-pending" role="status">{speaker}{english?" is typing…":" 正在回覆…"}</p>}
   <div ref={bottom}/>
  </div>
  {guestStatus&&<small className="crew-text-chat-progress" role="status">{guestStatus}</small>}
  {(error||guestFailure)&&<div role="alert" className="crew-text-chat-error">
   <p>{guestFailure?t(guestFailure.messageKey):error}</p>
   {guestFailure?.start&&!guestFailure.kind.startsWith("verification")&&guestFailure.kind!=="dailyLimit"&&<p>{t("guestText.restartHint")}</p>}
   {guestFailure?.repeated&&<p>{t("guestText.backendNext")}</p>}
   {guestFailure&&!guestFailure.start&&guestFailure.retry&&<button type="button" className="btn secondary" disabled={busy} onClick={()=>void sendMessage(draft)}>{t("guestText.retry")}</button>}
   {guestFailure&&(guestFailure.kind==="capacity"||guestFailure.repeated)&&<Link className="btn secondary" to="/account#settings-gemini">{t("guestText.useKey")}</Link>}
  </div>}
  <form className="crew-text-chat-form" onSubmit={event=>{event.preventDefault();void sendMessage(draft)}}>
   <input type="text" aria-label={english?"Message":"輸入訊息"} autoComplete="off" maxLength={1200} value={draft} onChange={e=>{
    const value=e.target.value;setDraft(value);
    const unsent=readPendingTextDraft(sessionScope);
    if(unsent){if(value)writePendingTextDraft(sessionScope,{text:value,sent:false});else clearPendingTextDraft(sessionScope)}
   }} placeholder={english?"Write a message…":"輸入訊息…"} disabled={busy||(guestMode&&(guestPhase==="unavailable"||guestPhase==="exhausted"||guestPhase==="paused"))}/>
   <button className="btn primary" type="submit" disabled={busy||!draft.trim()||(guestMode&&(guestPhase==="unavailable"||guestPhase==="exhausted"||guestPhase==="paused"))}>{english?"Send":"送出"}</button>
  </form>
  <small className="crew-text-chat-notice">{hint||(english?"Text-only Live and free practice keep separate sessions. No microphone is used.":"Live 文字對話與免費練習使用各自的連線，無須開啟麥克風。")}</small>
 </section>;
}
