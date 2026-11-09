import {LiveTextConversation} from "./liveTextChat";
import {GroundingSources} from "./GroundingSources";
import type {GroundingSource} from "./grounding";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {Link} from "react-router-dom";
import {geminiKey,geminiVerified} from "../lib/runtime";
import {PinyinHint} from "../teacher/PinyinHint";
import type {PinyinAidMode} from "../teacher/pinyinAid";
import type {TeachingMode} from "../store/teacherStore";
import "./TextChatPanel.css";

type Message={role:"user"|"assistant";text:string;sources?:GroundingSource[];searchSuggestions?:string};
type Props={system:string;speaker:string;english?:boolean;searchEnabled?:boolean;hint?:string;targetLanguage?:string;pinyinMode?:PinyinAidMode;teachingMode?:TeachingMode};
type GuestPhase="checking"|"ready"|"starting"|"active"|"unavailable"|"error"|"exhausted";
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
export function TextChatPanel({system,speaker,english=false,searchEnabled=false,hint,targetLanguage="",pinyinMode="auto",teachingMode="bilingual"}:Props){
 const [messages,setMessages]=useState<Message[]>([]);
 const [draft,setDraft]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [liveStatus,setLiveStatus]=useState("");
 const liveChat=useRef<LiveTextConversation|null>(null);
 // A stale, unverified browser key must not silently block free practice.
 const [useGuest,setUseGuest]=useState(()=>!geminiKey()||!geminiVerified());
 const [guestPhase,setGuestPhase]=useState<GuestPhase>("checking");
 const [guestToken,setGuestToken]=useState(getSavedGuestSession);
 const [siteKey,setSiteKey]=useState("");
 const [challenge,setChallenge]=useState("");
 const [remaining,setRemaining]=useState<number|null>(null);
 const mounted=useRef(true);
 const bottom=useRef<HTMLDivElement>(null);
 const host=useRef<HTMLDivElement|null>(null);
 const widget=useRef<string|null>(null);
 const hasKey=Boolean(geminiKey());
 const guestMode=useGuest||!hasKey;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);
 useEffect(()=>()=>{liveChat.current?.close();liveChat.current=null},[guestMode,system,searchEnabled]);
 useEffect(()=>{bottom.current?.scrollIntoView({block:"end",behavior:"auto"})},[messages.length]);
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
    setGuestPhase(guestToken?"active":"ready");
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
    callback:token=>{if(!cancelled)setChallenge(token)},
    "expired-callback":()=>{if(!cancelled)setChallenge("")},
    "error-callback":()=>{if(!cancelled)setChallenge("")}
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
 },[guestMode,guestPhase,siteKey]);
 async function startGuestText(){
  if(!challenge||guestPhase!=="ready")return;
  setGuestPhase("starting");setError("");
  try{
   const response=await fetch(GUEST_TEXT_ENDPOINT,{method:"POST",cache:"no-store",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({action:"start",challengeToken:challenge})});
   const data=await response.json() as {sessionToken?:string;expiresAt?:number;remaining?:number;code?:string};
   if(!response.ok||!data.sessionToken||!data.expiresAt){
    if(data.code==="DAILY_LIMIT"){setRemaining(0);setGuestPhase("exhausted");return}
    throw Error("Unavailable");
   }
   try{sessionStorage.setItem(SESSION_STORAGE_KEY,JSON.stringify({sessionToken:data.sessionToken,expiresAt:data.expiresAt}))}catch{}
   if(!mounted.current)return;
   setGuestToken(data.sessionToken);setRemaining(typeof data.remaining==="number"?data.remaining:null);
   setGuestPhase("active");
  }catch{if(mounted.current){setChallenge("");setGuestPhase("error");setError(english?"Free text chat is temporarily unavailable.":"免費文字聊天暫時無法啟用，請重試。")}}
 }
 async function send(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const value=draft.trim().slice(0,1200);
  if(!value||busy)return;
  const key=guestMode?"":geminiKey();
  if(!key&&(!guestToken||guestPhase!=="active")){
   setError(english?"Start free text practice first.":"請先開始免費文字練習。");return;
  }
  const next:Message[]=[...messages,{role:"user",text:value}];
  setMessages(next);setDraft("");setBusy(true);setError("");
  try{
   let reply="",sources:GroundingSource[]|undefined,searchSuggestions:string|undefined;
   if(key){
    // Reuse one Gemini Live WebSocket across keyboard turns. A separate
    // microphone-free session begins when entering text mode.
    if(!liveChat.current)liveChat.current=new LiveTextConversation(system,searchEnabled,
     status=>{if(mounted.current)setLiveStatus(status)});
    const answer=await liveChat.current.send(value);
    reply=answer.text;sources=answer.sources;searchSuggestions=answer.searchSuggestions;
   }else{
    // Keep the beginning and the language directives at the end of long personas.
    const guestSystem=system.length>6000?system.slice(0,4800)+"\n"+system.slice(-1100):system;
    const response=await fetch(GUEST_TEXT_ENDPOINT,{method:"POST",cache:"no-store",
     headers:{"content-type":"application/json"},
     body:JSON.stringify({action:"send",sessionToken:guestToken,system:guestSystem,
      messages:next.slice(-10).map(m=>({role:m.role,text:m.text}))})});
    const data=await response.json() as {reply?:string;remaining?:number;code?:string};
    if(data.code==="SESSION_EXPIRED"){
     try{sessionStorage.removeItem(SESSION_STORAGE_KEY)}catch{}
     setGuestToken("");setChallenge("");setGuestPhase("ready");
     throw Error("SESSION_EXPIRED");
    }
    if(data.code==="DAILY_LIMIT"){setRemaining(0);setGuestPhase("exhausted");throw Error("DAILY_LIMIT")}
    if(data.code==="TOO_FAST")throw Error("TOO_FAST");
    if(!response.ok||typeof data.reply!=="string")throw Error("GUEST_FAILED");
    reply=data.reply.trim();
    if(typeof data.remaining==="number")setRemaining(data.remaining);
   }
   if(!reply)throw Error("Empty reply");
   if(mounted.current)setMessages(m=>[...m,{role:"assistant",text:reply,sources,searchSuggestions}]);
  }catch(reason){
   if(mounted.current){
    setMessages(messages);setDraft(value);
    const type=reason instanceof Error?reason.message:"";
    const detail=reason as Error&{kind?:string;status?:number};
    const status=Number(detail?.status)||Number(type.match(/\b([45]\d{2})\b/)?.[1])||0;
    const category=detail?.kind||
     ([401,403].includes(status)?"key":status===429?"quota":[400,404].includes(status)?"model":"service");
    const byokMessage=category==="key"?(english?"This Gemini key is invalid or lacks permission.":"目前的 Gemini Key 無效或沒有存取權限。")
     :category==="quota"?(english?"Your Gemini API quota has been reached.":"目前的 Gemini API 配額已用完。")
     :category==="model"?(english?"The Gemini text model is unavailable for this key.":"目前的 Gemini Key 無法使用這個文字模型。")
     :(english?"Gemini Live text connection failed. Retry or switch to free practice.":"Gemini Live 文字連線失敗，請重試或改用免費文字練習。");
    setError(type==="SESSION_EXPIRED"
     ?english?"Session expired. Verify to resume free text practice.":"免費連線已到期，請重新驗證後繼續。"
     :type==="DAILY_LIMIT"
     ?english?"Today's free text messages are used up.":"今天的免費文字訊息已用完。"
     :type==="TOO_FAST"
     ?english?"Please wait a few seconds before sending again.":"請隔幾秒再傳送下一則訊息。"
     :key
     ?byokMessage
     :english?"Could not get a reply. Please try again.":"暫時無法取得回覆，請稍後重試。");
   }
  }finally{if(mounted.current)setBusy(false)}
 }
 return <section className="crew-text-chat" aria-label={english?"Text chat":"文字聊天"}>
  {hasKey&&<div className="crew-text-mode-choice">
   <span>{guestMode?(english?"Free text practice":"免費文字練習"):(english?"Using your Gemini key":"使用自己的 Gemini Key")}</span>
   <button type="button" className="btn secondary small" disabled={busy} onClick={()=>{
    setUseGuest(current=>!current);setError("");setMessages([]);setDraft("");setLiveStatus("");
   }}>{guestMode?(english?"Use my key":"使用自己的 Key"):(english?"Switch to free text":"改用免費文字")}</button>
  </div>}
  {!guestMode&&<small role="status" className="crew-text-chat-live-status">{liveStatus||(english?"Gemini Live keyboard chat · no microphone":"Gemini Live 鍵盤對話・不需麥克風")}</small>}
  {guestMode&&<div className="crew-text-guest" role="region" aria-label={english?"Free text practice":"免費文字練習"}>
   <strong>{english?"Free text practice — no API key needed":"免費文字練習・不需要 API Key"}</strong>
   <p>{english?"Up to 12 messages a day, shared across teacher and friend chats. No microphone required.":"每天最多 12 則訊息，老師與 AI 朋友共用，不需要開啟麥克風。"}</p>
   {guestPhase==="checking"&&<small role="status">{english?"Checking availability…":"正在確認免費額度…"}</small>}
   {guestPhase==="ready"&&<><div ref={host} aria-label="Turnstile verification"/>
    <button className="btn primary" type="button" disabled={!challenge} onClick={()=>void startGuestText()}>{english?"Start free text practice":"開始免費文字練習"}</button></>}
   {guestPhase==="starting"&&<small role="status">{english?"Starting…":"正在開啟免費練習…"}</small>}
   {guestPhase==="active"&&remaining!==null&&<small role="status">{english?remaining+" free messages remaining":"今日剩餘 "+remaining+" 則免費訊息"}</small>}
   {guestPhase==="error"&&<button className="btn secondary" type="button" onClick={()=>{setChallenge("");setGuestPhase("ready");setError("")}}>{english?"Try again":"重新驗證"}</button>}
   {guestPhase==="unavailable"&&<small role="status">{english?"Free text chat is temporarily unavailable.":"免費文字聊天暫時無法使用。"}</small>}
   {guestPhase==="exhausted"&&<small role="status">{english?"Today's free messages have been used.":"今天的免費文字訊息已用完。"}</small>}
   {(guestPhase==="unavailable"||guestPhase==="exhausted")&&
    <Link className="btn secondary small" to="/account#settings-gemini">{english?"Use your Gemini API key":"用自己的 Gemini Key 繼續"}</Link>}
  </div>}
  <div className="crew-text-chat-history" role="log" aria-label={english?"Conversation":"對話內容"} aria-live="polite" aria-relevant="additions">
   {!messages.length&&<p className="crew-text-chat-empty">{english?"Type a message to start chatting.":"輸入訊息，開始與 "+speaker+" 聊天。"}</p>}
   {messages.map((m,i)=><div key={i} className={"crew-text-chat-message "+m.role}><strong>{m.role==="user"?(english?"You":"你"):speaker}</strong><p>{m.text}</p>{m.sources&&<GroundingSources sources={m.sources} searchSuggestions={m.searchSuggestions} english={english}/>} {m.role==="assistant"&&<PinyinHint text={m.text} targetLanguage={targetLanguage} mode={pinyinMode} teachingMode={teachingMode} english={english}/>}</div>)}
   {busy&&<p className="crew-text-chat-pending" role="status">{speaker}{english?" is typing…":" 正在回覆…"}</p>}
   <div ref={bottom}/>
  </div>
  {error&&<p role="alert" className="crew-text-chat-error">{error}</p>}
  <form className="crew-text-chat-form" onSubmit={event=>void send(event)}>
   <input type="text" aria-label={english?"Message":"輸入訊息"} autoComplete="off" maxLength={1200} value={draft} onChange={e=>setDraft(e.target.value)} placeholder={english?"Write a message…":"輸入訊息…"} disabled={busy||(guestMode&&guestPhase!=="active")}/>
   <button className="btn primary" type="submit" disabled={busy||!draft.trim()||(guestMode&&guestPhase!=="active")}>{english?"Send":"送出"}</button>
  </form>
  <small className="crew-text-chat-notice">{hint||(english?"Text-only Live and free practice keep separate sessions. No microphone is used.":"Live 文字對話與免費練習使用各自的連線，無須開啟麥克風。")}</small>
 </section>;
}
