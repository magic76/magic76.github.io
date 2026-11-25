import {LiveTextConversation,easyFriendTextReplyRule} from "./liveTextChat";
import {GUEST_TOKEN_ENDPOINT} from "../lib/guestTrial";
import {awardCreatureChatEnergy} from "../pages/creatureChatRewards.mjs";
import {GuestKeyRecovery} from "./GuestKeyRecovery";
import {textChatByokMessage} from "./textChatByokMessage";
import {useFriendTextLearning,FriendLearningCheck,FriendLearningTip,FriendLearningSummary,FriendLearningActions} from "./TextChatLearning";
import {buildShortsTextSystems} from "./shortsTextContext";
import {createTypingReveal} from "./typingReveal";
import {sendGuestTextWithRenewal} from "./guestTextFlow";
import {useGuestTextChallenge} from "./guestTextChallenge";
import {hasGuestChallengeHandoff,takeUsedGuestHandoff,takeMicFallbackNotice} from "./guestTextChallenge";
import {classifyGuestTextFailure,guestTextWorkerError,markGuestTextStartError,isGuestTextStartError} from "./guestTextError";
import {readSessionTranscript,writeSessionTranscript,recordFriendActivity,clearLegacyFriendChats,readPendingTextDraft,writePendingTextDraft,clearPendingTextDraft} from "./sessionTranscript";
import {GroundingSources} from "./GroundingSources";
import {TextChatStarters} from "./TextChatStarters";
import {gameRoundContext,isGameRoundLink} from "./gameRoundHandoff";
import {TextChatNextReplies,useFriendNextReplyFallback} from "./TextChatNextReplies";
import {parseFriendReply,stripFriendReplyMeta,friendGuestSystem} from "./textChatReplies";
import {useTextChatKeyboard} from "./textChatKeyboard";
import type {GroundingSource} from "./grounding";
import {useEffect,useRef,useState,type ReactNode} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useGuestTextQuota} from "./guestTextQuota";
import {geminiKey,geminiVerified} from "../lib/runtime";
import {PinyinHint} from "../teacher/PinyinHint";
import {FriendAvatar} from "../friends/FriendAvatar";
import {getCrewFriend} from "../friends/friendProfiles";
import type {PinyinAidMode} from "../teacher/pinyinAid";
import type {TeachingMode} from "../store/teacherStore";
import "./TextChatPanel.css";

type Message={role:"user"|"assistant";text:string;sources?:GroundingSource[];searchSuggestions?:string};
type Props={system:string;speaker:string;sessionScope?:string;english?:boolean;searchEnabled?:boolean;hint?:string;targetLanguage?:string;pinyinMode?:PinyinAidMode;teachingMode?:TeachingMode;firstStarter?:string;starters?:string[];showStarterWithHistory?:boolean;autoStarter?:string;replyFallback?:string[];shortsContext?:string;onExchange?:()=>void;completionFeedback?:ReactNode};
type GuestPhase="checking"|"ready"|"starting"|"active"|"unavailable"|"error"|"exhausted"|"paused";
const GUEST_TEXT_ENDPOINT=GUEST_TOKEN_ENDPOINT.replace(/\/token$/,"/text");
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
export function TextChatPanel({system:baseSystem,speaker,sessionScope="",english=false,searchEnabled=false,hint,targetLanguage="",pinyinMode="auto",teachingMode="bilingual",firstStarter,starters,showStarterWithHistory=false,autoStarter,replyFallback,shortsContext,onExchange,completionFeedback}:Props){
 const shortsSystems=shortsContext?buildShortsTextSystems(baseSystem,shortsContext):null;
 const system=gameRoundContext(shortsSystems?.live||baseSystem,sessionScope);
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
 const isFriend=sessionScope.startsWith("friend:");
 const chatFriend=isFriend?getCrewFriend(sessionScope.split(":")[1]):null;
 const creatureRewardSession=useRef("s"+Date.now().toString(36)+Math.random().toString(36).slice(2));
 const creatureRewardTurn=useRef(0);
 const learning=useFriendTextLearning(system,sessionScope);
 const fallbackReplies=useFriendNextReplyFallback(system);
 const [nextReplies,setNextReplies]=useState<string[]|"fallback"|null>(null);
 const [liveStatus,setLiveStatus]=useState("");
 const liveChat=useRef<LiveTextConversation|null>(null);
 const typingRef=useRef<ReturnType<typeof createTypingReveal>|null>(null);
 const [useGuest,setUseGuest]=useState(()=>!geminiKey()||!geminiVerified());
 const [guestPhase,setGuestPhase]=useState<GuestPhase>("checking");
 const [configRetry,setConfigRetry]=useState(0);
 const [configRetryable,setConfigRetryable]=useState(false);
 const [guestToken,setGuestToken]=useState(getSavedGuestSession);
 const [siteKey,setSiteKey]=useState("");
 const [guestStatus,setGuestStatus]=useState("");
 const [micFallbackNotice]=useState(takeMicFallbackNotice);
 const {remaining,setRemaining,dailyLimit,setDailyLimit,memberQuota,memberQuotaEnabled,applyConfig,textAuthTicket}=useGuestTextQuota(()=>{setGuestPhase(p=>p==="exhausted"?"checking":p);setConfigRetry(n=>n+1)});
 const mounted=useRef(true);
 const chatRoot=useRef<HTMLElement>(null);
 useTextChatKeyboard(chatRoot);
 const history=useRef<HTMLDivElement>(null);
 const guestBox=useRef<HTMLDivElement>(null);
 const bottom=useRef<HTMLDivElement>(null);
 const hasKey=Boolean(geminiKey());
 const guestMode=useGuest||!hasKey;
 const {host,requested:challengeRequested,waitForChallenge}=useGuestTextChallenge(guestMode,guestPhase,siteKey);
 const phaseRef=useRef(guestPhase);phaseRef.current=guestPhase;
 const autoSent=useRef("");
 useEffect(()=>{mounted.current=true;return()=>{
  mounted.current=false;
 }},[]);
 useEffect(()=>{
  if(isFriend){
   clearLegacyFriendChats();
   latestMessages.current=[];setMessages([]);setDraft("");setError("");setNextReplies(null);setHistoryReady(true);
   return;
  }
  const saved=readSessionTranscript(sessionScope);
  const dangling=saved.at(-1)?.role==="user"?saved.pop()?.text:"";
  if(dangling)writeSessionTranscript(sessionScope,saved);
  const pending=readPendingTextDraft(sessionScope);
  if(pending||dangling){
   setDraft(pending?.text||dangling||"");
   setError(t(pending?.sent?"textChat.ui.previousSent":"textChat.ui.previousUnsent"));
  }
  latestMessages.current=saved;
  setNextReplies(null);
  setMessages(saved);setHistoryReady(true);
 },[sessionScope,isFriend]);
 latestMessages.current=messages;
 useEffect(()=>{
  if(!historyReady||!sessionScope||isFriend)return;
  const timer=window.setTimeout(()=>writeSessionTranscript(sessionScope,pendingSend.current?.before||messages),180);
  return()=>window.clearTimeout(timer);
 },[messages,historyReady,sessionScope,isFriend]);
 useEffect(()=>()=>{
  if(historyReady&&sessionScope&&!isFriend)writeSessionTranscript(sessionScope,pendingSend.current?.before||latestMessages.current);
 },[historyReady,sessionScope,isFriend]);
 useEffect(()=>()=>{
  typingRef.current?.cancel();typingRef.current=null;
  liveChat.current?.close();liveChat.current=null;
 },[guestMode,system,searchEnabled]);
 useEffect(()=>{
  if(messages.length&&history.current)history.current.scrollTop=history.current.scrollHeight;
 },[messages.length,messages.at(-1)?.text.length,historyReady,nextReplies]);
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
  const onKeyboardLayout=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{log.scrollTop=log.scrollHeight})};
  chatRoot.current?.addEventListener("crew:text-keyboard-change",onKeyboardLayout);
  const root=chatRoot.current;
  return()=>{root?.removeEventListener("crew:text-keyboard-change",onKeyboardLayout);observer.disconnect();cancelAnimationFrame(frame)};
 },[historyReady,guestMode]);
 useEffect(()=>{
  if(!guestMode)return;
  const controller=new AbortController();
  setConfigRetryable(false);
  void fetch(GUEST_TEXT_ENDPOINT,{cache:"no-store",signal:controller.signal})
   .then(async response=>{
    if(!response.ok)throw Error("Unavailable");
    const config=await response.json() as {enabled?:boolean;siteKey?:string;dailyLimit?:number;memberDailyLimit?:number;remaining?:number};
    if(!mounted.current||controller.signal.aborted)return;
    if(config.enabled!==true||typeof config.siteKey!=="string"||!config.siteKey){setGuestPhase("unavailable");return}
    setSiteKey(config.siteKey);
    if(await applyConfig(config,controller.signal)){if(!controller.signal.aborted)setGuestPhase("exhausted");return}
    if(controller.signal.aborted)return;
    setGuestPhase(current=>current==="checking"?(getSavedGuestSession()?"active":"ready"):current);
   }).catch(()=>{if(mounted.current&&!controller.signal.aborted){setConfigRetryable(true);setGuestPhase("unavailable")}});
  return()=>controller.abort();
 },[guestMode,configRetry]);
 function invalidateGuestGrant(){
  try{sessionStorage.removeItem(SESSION_STORAGE_KEY)}catch{}
  setGuestToken("");setGuestPhase("ready");setRequestSent(false);
 }
 async function startGuestText():Promise<string>{
  let handedOff=false;
  setGuestStatus(hasGuestChallengeHandoff()?"":t("guestText.checkingHuman"));
  try{
   const challengeToken=await waitForChallenge();
   handedOff=takeUsedGuestHandoff();
   setGuestPhase("starting");
   setGuestStatus(t("guestText.connecting"));
   const authTicket=await textAuthTicket();
   const response=await fetch(GUEST_TEXT_ENDPOINT,{method:"POST",cache:"no-store",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({action:"start",challengeToken,...(authTicket?{authTicket}:{})})});
   const data=await response.json() as {sessionToken?:string;expiresAt?:number;remaining?:number;dailyLimit?:number;code?:string};
   if(data.code==="DAILY_LIMIT"){
    setRemaining(0);setGuestPhase("exhausted");throw guestTextWorkerError(data.code,response.status);
   }
   if(!response.ok||!data.sessionToken||!data.expiresAt)throw guestTextWorkerError(data.code||"GUEST_START_FAILED",response.status);
   try{sessionStorage.setItem(SESSION_STORAGE_KEY,JSON.stringify({sessionToken:data.sessionToken,expiresAt:data.expiresAt}))}catch{}
   if(mounted.current){
    setGuestToken(data.sessionToken);setRemaining(typeof data.remaining==="number"?data.remaining:null);
    if(typeof data.dailyLimit==="number")setDailyLimit(data.dailyLimit);
    setGuestPhase("active");backendFailureCount.current=0;
   }
   return data.sessionToken;
  }catch(reason){
   const failure=classifyGuestTextFailure(reason);
   if(handedOff&&failure.reverify&&mounted.current){
       setGuestPhase("ready");
    return startGuestText();
   }
   if(mounted.current&&failure.kind!=="dailyLimit"&&!(["unavailable","exhausted"].includes(phaseRef.current))){
    setGuestPhase(failure.reverify?"error":"paused");
   }
   throw markGuestTextStartError(reason);
  }
 }
 async function sendMessage(text:string){
  const value=text.trim().slice(0,1200);
  if(!value||busy)return;
  setNextReplies(null);
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
   const visible=isFriend?stripFriendReplyMeta(text):text;
   if(!visible)return;
   setMessages(previous=>[...previous.slice(0,answerIndex),{role:"assistant",text:visible}]);
  };
   const reveal=createTypingReveal(updateLiveAnswer);
  typingRef.current=reveal;
  setDraft("");setBusy(true);setRequestSent(false);setError("");setGuestFailure(null);
  setGuestStatus(guestMode?t("textChat.ui.preparingSend"):t("textChat.ui.connectingLive"));
  try{
   let reply="",sources:GroundingSource[]|undefined,searchSuggestions:string|undefined;
   if(key){
    if(!liveChat.current){
     liveChat.current=new LiveTextConversation(system,searchEnabled,
     status=>{if(mounted.current)setLiveStatus(status)},isFriend);
    }
    markDispatched();
    const answer=await liveChat.current.send(value,partial=>{
     if(mounted.current){setRequestSent(true);setGuestStatus("")}
     reveal?.push(partial);
    });
    reply=answer.text;sources=answer.sources;searchSuggestions=answer.searchSuggestions;
   }else{
    const guestBase=shortsSystems?.guest??(isFriend?system:system.length>6000?system.slice(0,4800)+"\n"+system.slice(-1100):system);
    const guestSystem=isFriend?friendGuestSystem(guestBase+easyFriendTextReplyRule(guestBase,isFriend)):guestBase;
    const data=await sendGuestTextWithRenewal({
     token:guestPhase==="active"||guestPhase==="checking"?guestToken:"",
     acquire:startGuestText,
     invalidate:()=>{
      invalidateGuestGrant();
      setGuestStatus(t("textChat.ui.sessionChanged"));
     },
     send:async token=>{
      const authTicket=await textAuthTicket();
      markDispatched();setRequestSent(true);
      setGuestStatus(t("guestText.sending"));
      const response=await fetch(GUEST_TEXT_ENDPOINT,{method:"POST",cache:"no-store",
       headers:{"content-type":"application/json"},
       body:JSON.stringify({action:"send",sessionToken:token,system:guestSystem,...(authTicket?{authTicket}:{}),
        messages:next.slice(-10).map(m=>({role:m.role,text:m.text}))})});
      const data=await response.json() as {reply?:string;remaining?:number;dailyLimit?:number;code?:string};
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
    if(typeof data.dailyLimit==="number")setDailyLimit(data.dailyLimit);
   }
   if(!reply)throw Error("Empty reply");
   const parsed=isFriend?parseFriendReply(reply):null;
   if(parsed)reply=parsed.text;
   if(!reply)throw Error("Empty reply");
   backendFailureCount.current=0;
   if(mounted.current)setGuestStatus("");
   await reveal.finish(reply);
   if(mounted.current){
    if(isFriend&&parsed)learning.record(answerIndex,reply,parsed.tip,parsed.phrase,value);
    const complete=[...next,{role:"assistant" as const,text:reply,sources,searchSuggestions}];
    latestMessages.current=complete;
    if(!isFriend)writeSessionTranscript(sessionScope,complete);
    if(isFriend)recordFriendActivity(sessionScope.split(":")[1],"text");
    clearPendingTextDraft(sessionScope);
    pendingSend.current=null;
    setMessages(complete);
    setNextReplies(isFriend?(replyFallback||parsed?.replies||"fallback"):null);
    try{awardCreatureChatEnergy(isFriend?"friend-text":"teacher-text",
      creatureRewardSession.current+":"+(++creatureRewardTurn.current))}catch{}
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
    const byokMessage=textChatByokMessage(category,type,t);
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
 useEffect(()=>{
  if(!historyReady||!autoStarter||autoSent.current===sessionScope||messages.length||draft.trim()||readPendingTextDraft(sessionScope))return;
  autoSent.current=sessionScope;void sendMessage(autoStarter);
 },[historyReady,sessionScope,autoStarter,messages.length,draft]);
 return <section ref={chatRoot} className={"crew-text-chat"+(messages.length||busy||guestPhase==="active"?" is-chatting":"")} aria-label={t("textChat.ui.textChat")}>
  {hasKey&&<div className="crew-text-mode-choice">
   <span>{guestMode?t("textChat.ui.freePractice"):t("textChat.ui.usingKey")}</span>
   <button type="button" className="btn secondary small" disabled={busy} onClick={()=>{
    clearPendingTextDraft(sessionScope);pendingSend.current=null;
    setUseGuest(current=>!current);setError("");setGuestFailure(null);setMessages([]);setDraft("");setLiveStatus("");
   }}>{guestMode?t("textChat.ui.useKey"):t("textChat.ui.useFree")}</button>
  </div>}
  {!guestMode&&<small role="status" className="crew-text-chat-live-status">{liveStatus||t("textChat.ui.liveKeyboard")}</small>}
  {guestMode&&<div ref={guestBox} className="crew-text-guest" role="region" aria-label={t("textChat.ui.freePractice")}>
   {remaining!==null&&remaining<=3&&<strong>{t("textChat.ui.freeDaily",{count:dailyLimit})}</strong>}
   {micFallbackNotice&&<small role="status">{t("guestText.micFallbackNotice",{name:speaker})}</small>}
   {guestPhase==="checking"&&<small role="status">{t("textChat.ui.checking")}</small>}
   {challengeRequested&&guestPhase==="ready"&&<><div ref={host} className="crew-text-challenge-host" aria-label={t("textChat.ui.verification")}/>
    <small role="status">{t("guestText.interactionHint")}</small></>}
   {guestPhase==="starting"&&<small role="status">{t("guestText.connecting")}</small>}
   {(guestPhase==="active"||guestPhase==="ready")&&remaining!==null&&remaining<=3&&<small role="status">{t("textChat.ui.remaining",{count:remaining})}</small>}
   {guestPhase==="error"&&guestFailure?.kind==="verification"&&<button className="btn secondary" type="button" onClick={()=>{setGuestPhase("ready");setError("");setGuestFailure(null)}}>{t("guestText.verifyAgain")}</button>}
   {guestPhase==="paused"&&<button className="btn secondary" type="button" onClick={()=>{setGuestPhase("ready");setError("");setGuestFailure(null)}}>{t("guestText.restart")}</button>}
   {guestPhase==="unavailable"&&<small role="status">{t("textChat.ui.unavailable")}</small>}
   {guestPhase==="unavailable"&&configRetryable&&<button className="btn secondary" type="button" onClick={()=>{setGuestPhase("checking");setConfigRetry(n=>n+1)}}>{t("guestText.restart")}</button>}
   {guestPhase==="exhausted"&&<small role="status">{t("textChat.ui.exhausted")}</small>}
   {guestPhase==="exhausted"&&memberQuotaEnabled&&!memberQuota&&<Link className="btn" to="/account">{t("guestText.memberUpgrade")}</Link>}
   {(guestPhase==="unavailable"||guestPhase==="exhausted")&&<GuestKeyRecovery exhausted={guestPhase==="exhausted"} hasKey={hasKey}/>}
  </div>}
  <div ref={history} className="crew-text-chat-history" role="log" aria-label={t("textChat.ui.conversation")} aria-live="polite" aria-relevant="additions">
   {!messages.length&&!firstStarter&&<p className="crew-text-chat-empty">{t("textChat.ui.empty",{name:speaker})}</p>}
   {historyReady&&!messages.length&&!draft.trim()&&!busy&&sessionScope.startsWith("friend:")&&<TextChatStarters onPick={sentence=>void sendMessage(sentence)} speaker={speaker} firstStarter={firstStarter} starters={starters}/>}
   {messages.map((m,i)=><div key={i} className={isFriend&&m.role==="assistant"?"crew-text-ai-row":"crew-text-chat-row"}>{isFriend&&m.role==="assistant"&&chatFriend&&<FriendAvatar friend={chatFriend} className="crew-text-ai-avatar" decorative/>}<div className={"crew-text-chat-message "+m.role}><strong>{m.role==="user"?t("textChat.ui.you"):speaker}</strong><p>{m.text}</p>
   {isFriend&&m.role==="user"&&!messages.slice(i+1).some(item=>item.role==="user")&&learning.canCheck(i,m.text)&&<FriendLearningCheck disabled={busy||(guestMode&&["unavailable","exhausted","paused"].includes(guestPhase))} onClick={()=>learning.check(i,m.text,value=>void sendMessage(value))}/>}
   {isFriend&&m.role==="assistant"&&(!busy||i!==messages.length-1)&&learning.notes.find(note=>note.index===i&&note.reply===m.text)?.tip&&<FriendLearningTip text={learning.notes.find(note=>note.index===i)?.tip||""}/>}{m.sources&&<GroundingSources sources={m.sources} searchSuggestions={m.searchSuggestions} english={english}/>} {m.role==="assistant"&&(!busy||i!==messages.length-1)&&<PinyinHint text={m.text} targetLanguage={targetLanguage} mode={pinyinMode} teachingMode={teachingMode} english={english}/>} {isFriend&&m.role==="assistant"&&(!busy||i!==messages.length-1)&&<FriendLearningActions text={m.text}/>}
   {m.role==="assistant"&&busy&&i===messages.length-1&&<span className="crew-text-stream-cursor" aria-hidden="true">▍</span>}</div></div>)}
   {busy&&pendingSend.current&&!pendingSend.current.sent&&<p className="crew-text-chat-pending" role="status">
    {t("textChat.ui.notSent")}{pendingSend.current.value}
   </p>}
   {busy&&requestSent&&messages.at(-1)?.role!=="assistant"&&(isFriend?<div className="crew-text-ai-row crew-text-typing-row">{chatFriend&&<FriendAvatar friend={chatFriend} className="crew-text-ai-avatar" decorative/>}<div className="crew-text-typing-bubble" role="status" aria-live="off">
    <span>{t("textChat.typing",{name:speaker})}</span><span className="crew-text-typing-dots" aria-hidden="true"><i/><i/><i/></span>
   </div></div>:<p className="crew-text-chat-pending" role="status">{t("textChat.ui.replying",{name:speaker})}</p>)}
   {isFriend&&!busy&&!draft.trim()&&messages.at(-1)?.role==="assistant"&&nextReplies&&<TextChatNextReplies replies={nextReplies==="fallback"?fallbackReplies:nextReplies} onPick={sentence=>void sendMessage(sentence)}/>}
   {isFriend&&!learning.dismissed&&<FriendLearningSummary phrases={learning.summary(messages)} onDismiss={learning.dismiss}/>}
   {completionFeedback}
   <div ref={bottom}/>
  </div>
  {guestStatus&&<small className="crew-text-chat-progress" role="status">{guestStatus}</small>}
  {(error||guestFailure)&&<div role="alert" className="crew-text-chat-error">
   <p>{guestFailure?t(guestFailure.messageKey):error}</p>
   {guestFailure?.start&&!guestFailure.kind.startsWith("verification")&&guestFailure.kind!=="dailyLimit"&&<p>{t("guestText.restartHint")}</p>}
   {guestFailure?.repeated&&<p>{t("guestText.backendNext")}</p>}
   {guestFailure&&!guestFailure.start&&guestFailure.retry&&<button type="button" className="btn secondary" disabled={busy} onClick={()=>void sendMessage(draft)}>{t("guestText.retry")}</button>}
   {hasKey&&guestFailure&&(guestFailure.kind==="capacity"||guestFailure.repeated)&&<Link className="btn secondary" to="/account#settings-gemini">{t("guestText.useKey")}</Link>}
  </div>}
  {historyReady&&messages.length>0&&(showStarterWithHistory||isGameRoundLink())&&firstStarter&&!draft.trim()&&!busy&&<TextChatStarters onPick={sentence=>void sendMessage(sentence)} speaker={speaker} firstStarter={firstStarter} firstOnly/>}
  <form className="crew-text-chat-form" onSubmit={event=>{event.preventDefault();void sendMessage(draft)}}>
   <input type="text" aria-label={t("textChat.ui.message")} autoComplete="off" maxLength={1200} value={draft} onChange={e=>{
    const value=e.target.value;setDraft(value);if(value)setNextReplies(null)
    const unsent=readPendingTextDraft(sessionScope);
    if(unsent){if(value)writePendingTextDraft(sessionScope,{text:value,sent:false});else clearPendingTextDraft(sessionScope)}
   }} placeholder={t("textChat.ui.placeholder")} disabled={busy||(guestMode&&(guestPhase==="unavailable"||guestPhase==="exhausted"||guestPhase==="paused"))}/>
   <button className="btn primary" type="submit" disabled={busy||!draft.trim()||(guestMode&&(guestPhase==="unavailable"||guestPhase==="exhausted"||guestPhase==="paused"))}>{t("textChat.ui.send")}</button>
  </form>
  <small className="crew-text-chat-notice">{hint||t("textChat.ui.notice")}</small>
 </section>;
}
