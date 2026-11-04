import {useTeacherStore} from "../store/teacherStore";
import {trackUsageEvent} from "../analytics/usage";
import {hasConfirmedTwoSidedExchange} from "./liveEngagement";
import{ingestStudentReport,reportMemoryContext,getPersonalMemoryEpoch,personalMemoryEnabled}from"../teacher/studentMemory";
import{recordSpeakingLevel,effectiveSpeakingLevel}from"../teacher/speakingLevelMemory";import type{NativeLanguage}from"../teacher/teacherLocale";
import{turnTimingForLevel}from"./turnTiming";
import {useCallback,useEffect,useRef,useState} from "react";
import {ensureLive,ensureTeacherServices,geminiKey,saveLive,setGeminiVerified,type LiveSession,type LiveTurn} from "../lib/runtime";
import {ConversationFlowState,type ConversationFlowKind} from "./conversationFlow";
import {extractGroundingSources,extractSearchSuggestions,mergeGroundingSources,type GroundingSource} from "./grounding";

import type {GuestTrialGrant} from "../lib/guestTrial";

export type LiveState="idle"|"requesting-mic"|"connecting"|"listening"|"speaking"|"ending"|"reporting"|"ended"|"error";
export type FriendVoicePhase="idle"|"hearing"|"pause"|"processing"|"recovering"|"no-transcript"|"no-reply";
export type LiveErrorKind="key"|"mic"|"network"|"generic"|null;
type LiveImage={preview:string;name?:string;width?:number;height?:number};
type Config={
 pageKey:string;title:string;system:string;openingPrompt:string;voice:string;
 language?:string;nativeLanguage?:NativeLanguage;teacherReport?:boolean;trackSpeakingLevel?:boolean;missions?:string[];languageDirective?:string;languageDriftGuard?:(text:string)=>boolean;
 onTurnComplete?:(turn:{hasValidOutput?:boolean;output?:string;input?:string},completedTurns:LiveTurn[])=>void;
 onConfirmedTranscript?:(turn:LiveTurn)=>void; // optional board observer, read-only; no transport changes
 tools?:Array<{functionDeclarations:Array<Record<string,unknown>>}|{googleSearch:Record<string,never>}>;
 onToolCall?:(call:{id?:string;name:string;args?:unknown})=>Record<string,unknown>;
 onToolsUnavailable?:()=>void;
 onRecovered?:()=>void;
 onOutputLevel?:(level:number)=>void;
 persistHistory?:boolean;sessionKind?:"teacher"|"friend"|"timeline";usageKind?:"souls";conversationFlow?:ConversationFlowKind;onSessionFinished?:(item:{turns:LiveTurn[];durationMs:number}|null)=>void;
};
function uiMessage(value:unknown){return String(value||"語音連線發生問題").replace(/gemini-[0-9A-Za-z.-]+/gi,"語音服務")}
function classifyError(value:unknown):Exclude<LiveErrorKind,null>{
 const text=String(value||"").toLowerCase();
 if(/api.?key|\b401\b|\b403\b|unauth|permission denied.*key|尚未設定 gemini/.test(text))return"key";
 if(/notallowed|permission|麥克風|microphone|getusermedia|audio capture/.test(text))return"mic";
 if(/network|websocket|socket|timeout|timed out|連線|connection|\b1006\b/.test(text))return"network";
 return"generic";
}
export function useLiveSession(config:Config){
 const configRef=useRef(config);configRef.current=config;
 const sessionRef=useRef<LiveSession|null>(null),turnsRef=useRef<LiveTurn[]>([]),savedRef=useRef(false);
 const guestModeRef=useRef(false),guestDeadlineRef=useRef(0),guestTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [guestSecondsLeft,setGuestSecondsLeft]=useState(0);
 const [guestExpired,setGuestExpired]=useState(false),guestWrapUpSentRef=useRef(false);
 const guestConnectedAtRef=useRef(0),guestEndedReportedRef=useRef(false),guestConnectFailedReportedRef=useRef(false);
 const clearGuestTimer=()=>{if(guestTimerRef.current!==null){clearTimeout(guestTimerRef.current);guestTimerRef.current=null}};
 const guestRole=()=>configRef.current.sessionKind==="friend"?"friend":"teacher";
 const recordGuestConnect=()=>{
  if(!guestModeRef.current||guestConnectedAtRef.current>0)return;
  guestConnectedAtRef.current=performance.now();
  trackUsageEvent("guest_trial_connected",guestRole());
 };
 const recordGuestFailure=()=>{
  if(!guestModeRef.current||guestConnectedAtRef.current>0||guestConnectFailedReportedRef.current)return;
  guestConnectFailedReportedRef.current=true;
  trackUsageEvent("guest_trial_connect_failed",guestRole());
 };
 const recordGuestEnd=()=>{
  if(!guestModeRef.current||guestConnectedAtRef.current<=0||guestEndedReportedRef.current)return;
  guestEndedReportedRef.current=true;
  const elapsed=Math.max(0,performance.now()-guestConnectedAtRef.current);
  trackUsageEvent("guest_trial_ended",elapsed<15000?"under_15s":elapsed<45000?"from_15_to_45s":elapsed<60000?"from_45_to_60s":elapsed<120000?"from_60_to_120s":elapsed<180000?"from_120_to_180s":"from_180_to_300s");
 };
 const [state,setState]=useState<LiveState>("idle"),[status,setStatus]=useState("按開始後就可以直接說話。");
 const [voicePhase,setVoicePhase]=useState<FriendVoicePhase>("idle");
 const voicePhaseRef=useRef<FriendVoicePhase>("idle");
 const setFriendPhase=(phase:FriendVoicePhase)=>{voicePhaseRef.current=phase;setVoicePhase(phase)};
 const [turns,setTurns]=useState<LiveTurn[]>([]),[input,setInput]=useState(""),[output,setOutput]=useState("");
 const [searchSources,setSearchSources]=useState<GroundingSource[]>([]),[searchUnavailable,setSearchUnavailable]=useState(false),[searchSuggestions,setSearchSuggestions]=useState("");
 const [muted,setMuted]=useState(false),[durationMs,setDurationMs]=useState(0),[report,setReport]=useState<Record<string,unknown>|null>(null);
 const [errorKind,setErrorKind]=useState<LiveErrorKind>(null),[visionSending,setVisionSending]=useState(false),[lastImage,setLastImage]=useState<LiveImage|null>(null),[visionError,setVisionError]=useState("");
 const visionSendingRef=useRef(false),awaitingTutorRef=useRef(false),recoveryRequestRef=useRef(false);
 const cadenceRef=useRef(new ConversationFlowState()),rescueCountRef=useRef(0),languageRepairRef=useRef(false);
 const rescueTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 const friendReplyTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 const unrecognizedSpeechTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 const friendReplyRescueSentRef=useRef(false);
 const cancelRescue=()=>{if(rescueTimerRef.current!==null){window.clearTimeout(rescueTimerRef.current);rescueTimerRef.current=null}};
 const cancelFriendReplyTimer=()=>{if(friendReplyTimerRef.current!==null){window.clearTimeout(friendReplyTimerRef.current);friendReplyTimerRef.current=null}};
 const cancelUnrecognizedSpeechTimer=()=>{if(unrecognizedSpeechTimerRef.current!==null){window.clearTimeout(unrecognizedSpeechTimerRef.current);unrecognizedSpeechTimerRef.current=null}};
 const [volume,setVolumeValue]=useState(()=>{
  const stored=Number(localStorage.getItem("crew_live_volume")??"100");
  return Math.max(0,Math.min(300,Number.isFinite(stored)?stored:100));
 });
 useEffect(()=>{const id=window.setInterval(()=>{
  if(sessionRef.current)setDurationMs(sessionRef.current.getDurationMs());
  if(guestModeRef.current&&guestDeadlineRef.current>0){
   const left=Math.max(0,Math.ceil((guestDeadlineRef.current-performance.now())/1000));
   setGuestSecondsLeft(left);
   // One-time, best-effort wrap-up. The hard deadline never changes.
   if(left>0&&left<=10&&!guestWrapUpSentRef.current){
    guestWrapUpSentRef.current=true;
    try{sessionRef.current?.sendControl?.("[GUEST TRIAL] If you next respond, finish with one brief natural goodbye. Do not ask a new question or mention the countdown.");}catch{}
   }
  }
 },500);return()=>clearInterval(id)},[]);
 const snapshot=useCallback((reason:string)=>{
  recordGuestEnd();
  const s=sessionRef.current;if(savedRef.current||!turnsRef.current.length)return null;savedRef.current=true;
  const text=turnsRef.current.map(t=>[t.input?"你："+t.input:"",t.output?"AI："+t.output:""].filter(Boolean).join("\n")).filter(Boolean).join("\n\n");
  const item={id:Date.now(),title:configRef.current.title,preview:text.slice(0,180),turns:turnsRef.current.slice(),durationMs:s?.getDurationMs()||0,reason,ts:new Date().toISOString()};
  if(configRef.current.persistHistory!==false&&!guestModeRef.current)saveLive(configRef.current.pageKey,item);
  return item;
 },[]);
 const finish=useCallback(async(item:any)=>{
  let reportFailed=false;
  let completedReport:Record<string,unknown>|null=null;
  const personalEpoch=getPersonalMemoryEpoch();
  try{
   if(item&&!guestModeRef.current&&configRef.current.teacherReport){
    await ensureTeacherServices();
    if(window.CrewTeacherReport?.eligible(item)){
     setState("reporting");setStatus("正在整理課後學習報告…");
     const r=await window.CrewTeacherReport.generate(item,{language:configRef.current.language||"英文",missions:configRef.current.missions||[],nativeLanguage:configRef.current.nativeLanguage||"zh-TW",priorMemory:reportMemoryContext(configRef.current.language||"英文"),pageKey:configRef.current.pageKey,trackSpeakingLevel:configRef.current.trackSpeakingLevel&&personalMemoryEnabled()});
     if(r){completedReport=r;setReport(r);saveLive(configRef.current.pageKey,{...item,report:r});ingestStudentReport(configRef.current.language||"英文",r,item.turns||[],personalEpoch);
      if(configRef.current.trackSpeakingLevel)recordSpeakingLevel(
       configRef.current.language||"英文",String(item.id||item.ts||""),
       r.speaking_evidence,(item.turns||[]).map((t:LiveTurn)=>t.input||"").filter(Boolean),
       personalMemoryEnabled(),()=>personalMemoryEnabled()&&getPersonalMemoryEpoch()===personalEpoch);
     }
    }
   }
  }catch(_){
   reportFailed=true;
   setStatus("練習已保存，但課後報告產生失敗，可從歷史紀錄繼續練習。");
  }finally{
   if(!reportFailed)setStatus("已結束。");
   setState("ended");
   if(!guestModeRef.current)configRef.current.onSessionFinished?.(item ? {turns:item.turns||[],durationMs:item.durationMs||0}:null);
  }
  return {turns:(item?.turns||[]) as LiveTurn[],durationMs:Number(item?.durationMs||0),report:completedReport};
 },[]);
 const start=useCallback(async(grant?:GuestTrialGrant)=>{
  if(sessionRef.current)return;
  if(!geminiKey()&&!grant){trackUsageEvent("gemini_key_missing");setErrorKind("key");setState("error");setStatus("尚未設定 Gemini API key。");return}
  try{
   await ensureLive();if(!window.CrewLive)throw new Error("Live runtime 未載入");
   guestModeRef.current=Boolean(grant);setGuestSecondsLeft(grant?.seconds||0);
   guestWrapUpSentRef.current=false;setGuestExpired(false);
   guestConnectedAtRef.current=0;guestEndedReportedRef.current=false;guestConnectFailedReportedRef.current=false;
   cancelRescue();cancelFriendReplyTimer();cancelUnrecognizedSpeechTimer();friendReplyRescueSentRef.current=false;setFriendPhase("idle");
   cadenceRef.current=new ConversationFlowState();rescueCountRef.current=0;
   turnsRef.current=[];awaitingTutorRef.current=false;recoveryRequestRef.current=false;languageRepairRef.current=false;savedRef.current=false;setTurns([]);setInput("");setOutput("");setSearchSources([]);setSearchUnavailable(false);setSearchSuggestions("");setMuted(false);setReport(null);setDurationMs(0);setErrorKind(null);setLastImage(null);setVisionError("");
   setState("requesting-mic");setStatus("正在準備麥克風…");
   // Maximum two nudges per pause; never synthesize a transcript "user" turn.
   // The timeout starts only AFTER the model has finished speaking.
   const scheduleRescue=()=>{
    cancelRescue();
    const kind=configRef.current.conversationFlow;
    if(!kind||rescueCountRef.current>=(kind==="friend"?1:2)||!cadenceRef.current.shouldRescue())return;
    rescueTimerRef.current=window.setTimeout(()=>{
     rescueTimerRef.current=null;
     if(sessionRef.current!==session||!session.ready||!session.running||session.micMuted||awaitingTutorRef.current||!cadenceRef.current.shouldRescue())return;
     const directive=configRef.current.languageDirective?"\n"+configRef.current.languageDirective:"";
     if(session.sendControl?.(cadenceRef.current.rescue(kind,rescueCountRef.current)+directive))
      rescueCountRef.current+=1;
    },cadenceRef.current.silenceDelayMs(rescueCountRef.current,kind));
   };
   const logFriendHealth=(reason:string)=>{
    // Never log conversation content, audio, credentials or friend identity.
    if(configRef.current.sessionKind!=="friend")return;
    console.info("[CrewLive friend health]",{reason,...(session.getHealthSnapshot?.()||{})});
   };
   // Local voice does not imply Gemini accepted a turn: show retry instead of
   // inventing speech or forcing activityEnd in server-VAD mode.
   const scheduleUnrecognizedSpeechCheck=()=>{
    cancelUnrecognizedSpeechTimer();
    if(configRef.current.sessionKind!=="friend")return;
    unrecognizedSpeechTimerRef.current=window.setTimeout(()=>{
     unrecognizedSpeechTimerRef.current=null;
     if(sessionRef.current!==session||!session.ready||!session.running
      ||session.micMuted||awaitingTutorRef.current||voicePhaseRef.current!=="pause")return;
     setFriendPhase("no-transcript");
     setStatus("剛才的語音尚未辨識到，請再說一次。");
     logFriendHealth("local-speech-no-transcript");
    },8000);
   };
   // Friend-only watchdog: one silent recovery, never a fabricated learner turn.
   const scheduleFriendReplyCheck=(delayMs=11000)=>{
    cancelFriendReplyTimer();
    if(configRef.current.sessionKind!=="friend")return;
    friendReplyTimerRef.current=window.setTimeout(()=>{
     friendReplyTimerRef.current=null;
     if(sessionRef.current!==session||!session.ready||!session.running
       ||!awaitingTutorRef.current||session.micMuted)return;
     if(friendReplyRescueSentRef.current){
      setFriendPhase("no-reply");
      setStatus("朋友尚未回覆，請再說一次或重新連線。");
      logFriendHealth("unanswered-after-rescue");
      return;
     }
     const directive=configRef.current.languageDirective?"\n"+configRef.current.languageDirective:"";
     if(session.sendControl?.("[FRIEND UNANSWERED TURN — silent recovery] The learner just spoke but did not receive a reply. Answer their latest utterance briefly as the same friend, without greeting, teaching or repeating a finished reply."+directive)){
      friendReplyRescueSentRef.current=true;
      setFriendPhase("recovering");
      setStatus("正在重新取得朋友的回答…");
      logFriendHealth("unanswered-rescue");
      scheduleFriendReplyCheck(10000);
     }
    },delayMs);
   };
   // Only Crew Teacher/Friends and their Voice Lab use this experimental selection.
   // Crew Story/Fortune keep their existing automatic fallback behavior.
   const teacherVoiceSession=(configRef.current.pageKey==="teacher"||configRef.current.pageKey==="teacher-board")
     ||configRef.current.pageKey==="voice-lab"
     ||configRef.current.pageKey.startsWith("friend-")
      ||configRef.current.pageKey.startsWith("timeline-mira-");
   const levelSetting=useTeacherStore.getState();
   const speakingLevel=effectiveSpeakingLevel(
    configRef.current.language||levelSetting.targetLanguage,
    levelSetting.learnerSpeakingLevel,personalMemoryEnabled());
   const tabooSession=configRef.current.pageKey.startsWith("crew-play-mini-taboo-");
   const tabooDirectGuess=configRef.current.pageKey.startsWith("crew-play-mini-taboo-direct-");
   const tabooChinese=/(中文|華語|國語|chinese|mandarin|^zh)/i.test(configRef.current.language||levelSetting.targetLanguage);
   const tabooTongue=tabooChinese?"Traditional Chinese":"English";
   // Content-free milestones apply only to ordinary Teacher, Friend and Timeline chat.
   // One session closure survives transport reconnects, but not a new Live start.
   const chatKind=configRef.current.usageKind==="souls"?"souls"
    :configRef.current.pageKey==="teacher"?"teacher"
    :configRef.current.pageKey.startsWith("friend-")&&!configRef.current.pageKey.startsWith("friend-game-")?"friend"
    :configRef.current.pageKey.startsWith("timeline-")?"timeline":null;
   let learnerSpoke=false,aiReplied=false,completedExchange=false;
   const session=new window.CrewLive.Session({
    guestAccessToken:grant?.token,
    system:configRef.current.system+(tabooSession?(tabooDirectGuess
     ?"\n[TABOO DIRECT GUESS] Speak "+tabooTongue+" only. For raw learner descriptions, make ONE clear, concise guess in varied natural "+tabooTongue+". No reaction before the guess, no second sentence, and never announce correctness. On verified cues follow the game result."
     :"\n[TABOO GAME SPEECH OVERRIDE] All game speech must be in "+tabooTongue+". After a verified game cue, answer once and wait for the learner. Do not generate your own clue questions or repeat the same question. Raw player speech is processed by the game engine, not by you."): ""),
    openingPrompt:configRef.current.openingPrompt,voice:configRef.current.voice,volume,
    // Native Live Google Search is disabled: a server-side 1011 can close the audio session.
    // Grounding is fetched separately on explicit user actions, never in WebSocket setup.
    tools:grant?undefined:configRef.current.tools,
     onGrounding:metadata=>{setSearchSources(previous=>mergeGroundingSources(previous,extractGroundingSources(metadata)));const html=extractSearchSuggestions(metadata);if(html)setSearchSuggestions(html)},
     onSearchUnavailable:()=>setSearchUnavailable(true),
     onToolCall:call=>!grant?configRef.current.onToolCall?.(call)||{ok:false,error:"not-handled"}:{ok:false,error:"guest-tools-disabled"},
    onToolsUnavailable:()=>configRef.current.onToolsUnavailable?.(),
    // Crew Teacher/Friends only; other Crew products retain their current VAD.
    turnTiming:teacherVoiceSession?turnTimingForLevel(speakingLevel):undefined,
    models:teacherVoiceSession?[useTeacherStore.getState().liveModel]:undefined,
    manualInterruptOnly:true,maxLiveAttempts:teacherVoiceSession?1:2,maxResumeAttempts:2,
    ...(grant?{models:[grant.model],maxLiveAttempts:1,maxResumeAttempts:0}:{}),
    onOutputLevel:configRef.current.onOutputLevel?level=>configRef.current.onOutputLevel?.(level):undefined,
    onStatus:v=>setStatus(uiMessage(v)),
    onState:v=>{
     if(v==="connecting"||v==="error"){cancelRescue();cancelFriendReplyTimer();cancelUnrecognizedSpeechTimer();setFriendPhase("idle")}
     if(v==="requesting-mic")setState("requesting-mic");
     else if(v==="connecting")setState("connecting");
     else if(v==="ready"){recordGuestConnect();setState("listening");setFriendPhase("idle")}
     else if(v==="error"){recordGuestFailure();setState("error")}
    },
    onSpeaking:v=>{
     setState(v?"speaking":"listening");
     if(v){
      cancelRescue();cancelUnrecognizedSpeechTimer();setFriendPhase("idle");
      if(configRef.current.sessionKind==="friend"){awaitingTutorRef.current=false;cancelFriendReplyTimer()}
     }else scheduleRescue();
    },
    // UI microphone heuristics never finish Gemini's server-managed audio turn.
    onListeningPhase:phase=>setStatus((()=>{
     if(configRef.current.sessionKind==="friend"){
      if(phase==="speaking"){
       cancelRescue();cancelUnrecognizedSpeechTimer();
       if(voicePhaseRef.current==="no-reply"||voicePhaseRef.current==="no-transcript"){
        awaitingTutorRef.current=false;friendReplyRescueSentRef.current=false;cancelFriendReplyTimer();
       }
       if(!awaitingTutorRef.current)setFriendPhase("hearing");
      }else if(!awaitingTutorRef.current)setFriendPhase("pause");
     }
     const shouldUpdate=!awaitingTutorRef.current;
     return (previous:string)=>shouldUpdate
       ?(phase==="speaking"?"🎙️ 正在聽你說…":"🎙️ 已收到聲音，等你說完後就會回應…")
       :previous;
    })()),
    onLocalUtteranceEnd:()=>{
     if(configRef.current.sessionKind!=="friend"||awaitingTutorRef.current)return;
     cancelRescue();setFriendPhase("pause");scheduleUnrecognizedSpeechCheck();
    },
    onMicHealth:health=>{
      if(health.trackState!=="live"&&health.trackState!=="missing"&&!health.muted)
       setStatus("麥克風已停止收音，請重新開始語音對話。");
    },
    onMicMuted:()=>setMuted(Boolean(sessionRef.current?.micMuted)),
    onInputTranscript:v=>{
     if(v.trim()){
      const firstFragment=!awaitingTutorRef.current;
      cancelRescue();cancelUnrecognizedSpeechTimer();
      rescueCountRef.current=0;languageRepairRef.current=false;awaitingTutorRef.current=true;
      if(configRef.current.sessionKind==="friend"){
       setFriendPhase("processing");setStatus("朋友正在準備回答…");
       if(firstFragment)friendReplyRescueSentRef.current=false;
       if(!friendReplyRescueSentRef.current)scheduleFriendReplyCheck();
      }
      if(chatKind&&!learnerSpoke){
       learnerSpoke=true;
       trackUsageEvent(chatKind==="teacher"?"teacher_user_spoke":chatKind==="friend"?"friend_user_spoke":chatKind==="souls"?"souls_user_spoke":"timeline_user_spoke");
      }
     }
     setInput(v);
    },
    onOutputTranscript:v=>{
     cancelRescue();
     if(v.trim()&&configRef.current.sessionKind==="friend"){awaitingTutorRef.current=false;cancelFriendReplyTimer();cancelUnrecognizedSpeechTimer();setFriendPhase("idle")}
     if(chatKind&&learnerSpoke&&!aiReplied&&v.trim()){
      aiReplied=true;
      trackUsageEvent(chatKind==="teacher"?"teacher_ai_replied":chatKind==="friend"?"friend_ai_replied":chatKind==="souls"?"souls_ai_replied":"timeline_ai_replied");
     }
     setOutput(v);
    },
    onRecovered:()=>{
      configRef.current.onRecovered?.();
      cancelRescue();cancelFriendReplyTimer();cancelUnrecognizedSpeechTimer();
      setFriendPhase(awaitingTutorRef.current?"processing":"idle");
      // Reconnected transports can reuse an older system instruction: reassert
      // the learner's latest friend language mode without a fabricated turn.
      if(tabooSession)session.sendControl?.(tabooDirectGuess?"[TABOO DIRECT GUESS] Continue in "+tabooTongue+" only. Make one short, natural guess with one candidate per learner description; vary the wording; no preamble, reaction or follow-up.":"[TABOO LANGUAGE] Continue in "+tabooTongue+" only. Wait for verified game prompts before offering guesses or asking follow-up questions.");
      else if(configRef.current.sessionKind==="friend"&&configRef.current.languageDirective)
        session.sendControl?.("[FRIEND RECONNECT MODE — latest user setting wins]\\n"+configRef.current.languageDirective);
      if(!awaitingTutorRef.current)return;
      if(recoveryRequestRef.current){
       if(configRef.current.sessionKind==="friend")scheduleFriendReplyCheck();
       return;
      }
      recoveryRequestRef.current=true;
      const roleplay=!!configRef.current.missions?.length||/NOT a language tutor/.test(configRef.current.system);
      const prompt=configRef.current.sessionKind==="timeline"
       ?"[TIMELINE CONTINUITY — silent recovery] Continue the unfinished answer as the SAME fictional Mira at her selected age. Never become a tutor, switch age, reveal future life events or restart."
       :configRef.current.sessionKind==="friend"
      ?"[FRIEND CONTINUITY — silent recovery] Continue your unfinished answer naturally as the same friend. Never reintroduce yourself, become a teacher, or ask the user to repeat."
      :roleplay
      ?"[SCENE CONTROL — silent reconnect recovery] Your previous in-character reply was interrupted. Continue the unanswered response without greeting or explaining grammar. Do not repeat parts already spoken."
      :"[COACH CONTROL — silent reconnect recovery] The connection interrupted a reply. Answer or finish the learner's previous utterance naturally from the next unsaid point. Do not greet, repeat previous sentences, or ask the learner to repeat.";
      const reminder=configRef.current.languageDirective?"\n"+configRef.current.languageDirective:"";
      if(session.sendText(prompt+reminder)){
       setStatus(configRef.current.sessionKind==="timeline"?"連線已恢復，Mira 接著回答…":configRef.current.sessionKind==="friend"?"已恢復連線，接續剛才的回答…":"已恢復連線，老師接續剛才的回答…");
       if(configRef.current.sessionKind==="friend")scheduleFriendReplyCheck();
      }else recoveryRequestRef.current=false;
    },
    onTranscriptTurn:(turn,all)=>{cadenceRef.current.observe(turn);turnsRef.current=all.slice();setTurns(all.slice());if(!guestModeRef.current)configRef.current.onConfirmedTranscript?.(turn)},
    onTurnComplete:turn=>{
      if(turn.hasValidOutput){awaitingTutorRef.current=false;recoveryRequestRef.current=false;cancelFriendReplyTimer();cancelUnrecognizedSpeechTimer();setFriendPhase("idle")}
      else if(configRef.current.sessionKind==="friend"&&awaitingTutorRef.current)scheduleFriendReplyCheck(3000);
      const drift=(configRef.current.languageDriftGuard?.(turn.output||"")||false)
       ||(tabooSession&&!tabooChinese&&/[\u0400-\u04ff\u0590-\u08ff\u0900-\u097f\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(turn.output||""));
      if(turn.hasValidOutput&&drift&&!languageRepairRef.current&&!tabooDirectGuess){
       languageRepairRef.current=true;
       // Silent control, not a fabricated learner turn. One repair per learner reply.
       const rule=tabooSession?"[TABOO LANGUAGE REPAIR] Use "+tabooTongue+" only; rephrase briefly once without adding a question.":configRef.current.languageDirective||"";
       session.sendControl?.(rule+"\n[LANGUAGE RECOVERY] Your last spoken reply used an unintended language. Rephrase briefly in the selected language without changing subjects.");
      }else if(turn.hasValidOutput&&!drift){
       languageRepairRef.current=false;
      }
      // Soul is a separate product even though it reuses Friends' voice transport.
      // A complete two-sided turn, not merely a proactive greeting, counts as engagement.
      if(chatKind==="souls"&&!completedExchange&&hasConfirmedTwoSidedExchange(turn,turnsRef.current)){
       completedExchange=true;
       trackUsageEvent("souls_conversation");
      }
      // Use the synchronous Live transcript ref; React state can lag behind this callback.
      if(!guestModeRef.current)configRef.current.onTurnComplete?.(turn,turnsRef.current.slice());
     },
    onError:e=>{recordGuestFailure();cancelFriendReplyTimer();cancelUnrecognizedSpeechTimer();setFriendPhase("idle");const kind=classifyError(e.message);if(kind==="key"&&!guestModeRef.current)setGeminiVerified(false);clearGuestTimer();guestDeadlineRef.current=0;setGuestSecondsLeft(0);setErrorKind(kind);setState("error");setStatus(uiMessage(e.message))},
    onTerminal:info=>{if(info?.state==="error")recordGuestFailure();clearGuestTimer();guestDeadlineRef.current=0;setGuestSecondsLeft(0);cancelRescue();cancelFriendReplyTimer();cancelUnrecognizedSpeechTimer();setFriendPhase("idle");const item=snapshot(info?.status||"terminal");sessionRef.current=null;if(info?.state==="error"){setState("error");return}void finish(item)}
   });
   sessionRef.current=session;
   if(grant){
    // The server credential expires after 310s even if the browser suspends timers.
    const lifetime=Date.parse(grant.expiresAt)-Date.parse(grant.issuedAt);
    const ms=Math.max(1000,Math.min(300000,Math.max(1,Math.min(300,grant.seconds||300))*1000,
     Number.isFinite(lifetime)?Math.max(0,lifetime-1500):300000));
    guestDeadlineRef.current=performance.now()+ms;
    guestTimerRef.current=setTimeout(()=>{
     if(sessionRef.current!==session)return;
     clearGuestTimer();guestDeadlineRef.current=0;setGuestSecondsLeft(0);
     setGuestExpired(true);const item=snapshot("guest-limit");
     sessionRef.current=null;
     void session.stop({reason:"guest-limit",silentStatus:true,emitTerminal:false})
      .catch(()=>{}).then(()=>finish(item));
    },ms);
   }
   await session.start();if(sessionRef.current!==session||!session.running)return;if(grant&&session.ready)recordGuestConnect();session.setVolume(volume);setState("listening");
  }catch(e){recordGuestFailure();clearGuestTimer();guestDeadlineRef.current=0;setGuestSecondsLeft(0);sessionRef.current=null;const kind=classifyError(e instanceof Error?e.message:e);if(kind==="key"&&!guestModeRef.current)setGeminiVerified(false);setErrorKind(kind);setState("error");setStatus(uiMessage(e instanceof Error?e.message:e))}
 },[finish,snapshot,volume]);
 const stop=useCallback(async(deferReport=false)=>{
  const s=sessionRef.current;if(!s)return null;
  clearGuestTimer();guestDeadlineRef.current=0;setGuestSecondsLeft(0);
  cancelRescue();cancelFriendReplyTimer();cancelUnrecognizedSpeechTimer();setFriendPhase("idle");setState("ending");setStatus("正在結束…");
  const item=snapshot("user-stop");
  try{await s.stop({reason:"user-stop",silentStatus:true,emitTerminal:false})}
  catch{/* Still finalize saved speech when the transport is already closed. */}
  finally{sessionRef.current=null}
  // A conversation page can close as soon as the voice transport and local
  // transcript are saved; AI reports and memory updates continue without
  // holding the user on the ended conversation screen.
  const completion=finish(item);
  if(!deferReport)await completion;
  return {turns:(item?.turns||[]) as LiveTurn[],durationMs:Number(item?.durationMs||0),completion};
 },[finish,snapshot]);
 const interrupt=useCallback(()=>{awaitingTutorRef.current=false;recoveryRequestRef.current=false;cancelFriendReplyTimer();cancelUnrecognizedSpeechTimer();setFriendPhase("idle");return sessionRef.current?.interrupt()??false},[]);
 const toggleMute=useCallback(()=>{const s=sessionRef.current;if(!s?.ready)return;s.toggleMic();setMuted(s.micMuted)},[]);
 const sendText=useCallback((text:string)=>sessionRef.current?.sendText(text)??false,[]);
  const presentGrounding=useCallback((answer:{sources:GroundingSource[];searchSuggestions?:string})=>{
   setSearchSources(previous=>mergeGroundingSources(previous,answer.sources));
   if(answer.searchSuggestions)setSearchSuggestions(answer.searchSuggestions);
  },[]);
 const sendControl=useCallback((text:string)=>sessionRef.current?.sendControl?.(text)??false,[]);
 const sendPreparedImage=useCallback((image:unknown,prompt:string)=>{const s=sessionRef.current;if(!s?.ready)return false;return s.sendImage(image,{prompt,statusText:"最新照片已送出"})},[]);
 const sendImageFile=useCallback(async(file:File,prompt:string)=>{
  const s=sessionRef.current;if(!s?.ready||visionSendingRef.current)return false;
  visionSendingRef.current=true;setVisionSending(true);setVisionError("");
  try{
   await ensureLive();
   const image=await window.CrewLiveUI?.prepareImage(file,{maxSide:1600,quality:.84});
   if(!image||sessionRef.current!==s||!s.ready)return false;
   const ok=s.sendImage(image,{prompt,statusText:"最新照片已送出"});
   if(ok)setLastImage({preview:image.preview,name:image.name,width:image.width,height:image.height});
   else setVisionError("照片沒有送出，請再試一次。");
   return ok;
  }catch(_){
   setVisionError("照片處理失敗，請重新拍一次。");
   return false;
  }finally{
   visionSendingRef.current=false;setVisionSending(false);
  }
 },[]);
 const sendVideoFrame=useCallback((frame:unknown)=>sessionRef.current?.sendVideoFrame?.(frame)??false,[]);
 const setVolume=useCallback((v:number)=>{const n=Math.max(0,Math.min(300,Number.isFinite(v)?v:100));setVolumeValue(n);localStorage.setItem("crew_live_volume",String(n));sessionRef.current?.setVolume(n)},[]);
 useEffect(()=>()=>{
  const session=sessionRef.current;
  clearGuestTimer();guestDeadlineRef.current=0;
  cancelRescue();cancelFriendReplyTimer();cancelUnrecognizedSpeechTimer();
  if(!session)return;
  // Preserve the final completed transcript before closing the active transport.
  snapshot("page-leave");
  sessionRef.current=null;
  void session.stop({reason:"page-leave",silentStatus:true,emitTerminal:false}).catch(()=>{});
 },[snapshot]);
 return{state,status,guestMode:guestModeRef.current,guestSecondsLeft,guestExpired,voicePhase,turns,input,output,searchSources,searchSuggestions,searchUnavailable,presentGrounding,muted,durationMs,report,volume,errorKind,visionSending,lastImage,visionError,start,stop,interrupt,toggleMute,sendText,sendControl,sendImageFile,sendPreparedImage,sendVideoFrame,setVolume};
}
