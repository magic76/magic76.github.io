import {useTeacherStore} from "../store/teacherStore";
import{ingestStudentReport,reportMemoryContext,getPersonalMemoryEpoch,personalMemoryEnabled}from"../teacher/studentMemory";
import{recordSpeakingLevel}from"../teacher/speakingLevelMemory";import type{NativeLanguage}from"../teacher/teacherLocale";
import {useCallback,useEffect,useRef,useState} from "react";
import {ensureLive,ensureTeacherServices,geminiKey,saveLive,setGeminiVerified,type LiveSession,type LiveTurn} from "../lib/runtime";
import {ConversationFlowState,type ConversationFlowKind} from "./conversationFlow";

export type LiveState="idle"|"requesting-mic"|"connecting"|"listening"|"speaking"|"ending"|"reporting"|"ended"|"error";
export type LiveErrorKind="key"|"mic"|"network"|"generic"|null;
type LiveImage={preview:string;name?:string;width?:number;height?:number};
type Config={
 pageKey:string;title:string;system:string;openingPrompt:string;voice:string;
 language?:string;nativeLanguage?:NativeLanguage;teacherReport?:boolean;trackSpeakingLevel?:boolean;missions?:string[];languageDirective?:string;languageDriftGuard?:(text:string)=>boolean;
 onTurnComplete?:(turn:{hasValidOutput?:boolean;output?:string})=>void;
 persistHistory?:boolean;sessionKind?:"teacher"|"friend";conversationFlow?:ConversationFlowKind;onSessionFinished?:(item:{turns:LiveTurn[];durationMs:number}|null)=>void;
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
 const [state,setState]=useState<LiveState>("idle"),[status,setStatus]=useState("按開始後就可以直接說話。");
 const [turns,setTurns]=useState<LiveTurn[]>([]),[input,setInput]=useState(""),[output,setOutput]=useState("");
 const [muted,setMuted]=useState(false),[durationMs,setDurationMs]=useState(0),[report,setReport]=useState<Record<string,unknown>|null>(null);
 const [errorKind,setErrorKind]=useState<LiveErrorKind>(null),[visionSending,setVisionSending]=useState(false),[lastImage,setLastImage]=useState<LiveImage|null>(null),[visionError,setVisionError]=useState("");
 const visionSendingRef=useRef(false),awaitingTutorRef=useRef(false),recoveryRequestRef=useRef(false);
 const cadenceRef=useRef(new ConversationFlowState()),rescueCountRef=useRef(0),languageRepairRef=useRef(false);
 const rescueTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 const cancelRescue=()=>{if(rescueTimerRef.current!==null){window.clearTimeout(rescueTimerRef.current);rescueTimerRef.current=null}};
 const [volume,setVolumeValue]=useState(Number(localStorage.getItem("crew_live_volume")||100));
 useEffect(()=>{const id=window.setInterval(()=>{if(sessionRef.current)setDurationMs(sessionRef.current.getDurationMs())},500);return()=>clearInterval(id)},[]);
 const snapshot=useCallback((reason:string)=>{
  const s=sessionRef.current;if(savedRef.current||!turnsRef.current.length)return null;savedRef.current=true;
  const text=turnsRef.current.map(t=>[t.input?"你："+t.input:"",t.output?"AI："+t.output:""].filter(Boolean).join("\n")).filter(Boolean).join("\n\n");
  const item={id:Date.now(),title:configRef.current.title,preview:text.slice(0,180),turns:turnsRef.current.slice(),durationMs:s?.getDurationMs()||0,reason,ts:new Date().toISOString()};
  if(configRef.current.persistHistory!==false)saveLive(configRef.current.pageKey,item);
  return item;
 },[]);
 const finish=useCallback(async(item:any)=>{
  let reportFailed=false;
  let completedReport:Record<string,unknown>|null=null;
  const personalEpoch=getPersonalMemoryEpoch();
  try{
   if(item&&configRef.current.teacherReport){
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
   configRef.current.onSessionFinished?.(item ? {turns:item.turns||[],durationMs:item.durationMs||0}:null);
  }
  return {turns:(item?.turns||[]) as LiveTurn[],durationMs:Number(item?.durationMs||0),report:completedReport};
 },[]);
 const start=useCallback(async()=>{
  if(sessionRef.current)return;
  if(!geminiKey()){setErrorKind("key");setState("error");setStatus("尚未設定 Gemini API key。");return}
  try{
   await ensureLive();if(!window.CrewLive)throw new Error("Live runtime 未載入");
   cancelRescue();cadenceRef.current=new ConversationFlowState();rescueCountRef.current=0;
   turnsRef.current=[];awaitingTutorRef.current=false;recoveryRequestRef.current=false;languageRepairRef.current=false;savedRef.current=false;setTurns([]);setInput("");setOutput("");setMuted(false);setReport(null);setDurationMs(0);setErrorKind(null);setLastImage(null);setVisionError("");
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
   // Only Crew Teacher/Friends and their Voice Lab use this experimental selection.
   // Crew Story/Fortune keep their existing automatic fallback behavior.
   const teacherVoiceSession=configRef.current.pageKey==="teacher"
     ||configRef.current.pageKey==="voice-lab"
     ||configRef.current.pageKey.startsWith("friend-");
   const session=new window.CrewLive.Session({
    system:configRef.current.system,openingPrompt:configRef.current.openingPrompt,voice:configRef.current.voice,volume,
    models:teacherVoiceSession?[useTeacherStore.getState().liveModel]:undefined,
    manualInterruptOnly:true,maxLiveAttempts:teacherVoiceSession?1:2,maxResumeAttempts:2,
    onStatus:v=>setStatus(uiMessage(v)),
    onState:v=>{if(v==="connecting"||v==="error")cancelRescue();if(v==="requesting-mic")setState("requesting-mic");else if(v==="connecting")setState("connecting");else if(v==="ready")setState("listening");else if(v==="error")setState("error")},
    onSpeaking:v=>{setState(v?"speaking":"listening");if(v)cancelRescue();else scheduleRescue()},
    onMicMuted:()=>setMuted(Boolean(sessionRef.current?.micMuted)),
    onInputTranscript:v=>{if(v.trim()){cancelRescue();rescueCountRef.current=0;languageRepairRef.current=false;awaitingTutorRef.current=true}setInput(v)},onOutputTranscript:v=>{cancelRescue();setOutput(v)},
    onRecovered:()=>{
      cancelRescue();
      // Reconnected transports can reuse an older system instruction: reassert
      // the learner's latest friend language mode without a fabricated turn.
      if(configRef.current.sessionKind==="friend"&&configRef.current.languageDirective)
        session.sendControl?.("[FRIEND RECONNECT MODE — latest user setting wins]\\n"+configRef.current.languageDirective);
      if(!awaitingTutorRef.current||recoveryRequestRef.current)return;
      recoveryRequestRef.current=true;
      const roleplay=!!configRef.current.missions?.length||/NOT a language tutor/.test(configRef.current.system);
      const prompt=configRef.current.sessionKind==="friend"
      ?"[FRIEND CONTINUITY — silent recovery] Continue your unfinished answer naturally as the same friend. Never reintroduce yourself, become a teacher, or ask the user to repeat."
      :roleplay
      ?"[SCENE CONTROL — silent reconnect recovery] Your previous in-character reply was interrupted. Continue the unanswered response without greeting or explaining grammar. Do not repeat parts already spoken."
      :"[COACH CONTROL — silent reconnect recovery] The connection interrupted a reply. Answer or finish the learner's previous utterance naturally from the next unsaid point. Do not greet, repeat previous sentences, or ask the learner to repeat.";
      const reminder=configRef.current.languageDirective?"\n"+configRef.current.languageDirective:"";
      if(session.sendText(prompt+reminder))setStatus(configRef.current.sessionKind==="friend"?"已恢復連線，接續剛才的回答…":"已恢復連線，老師接續剛才的回答…");
      else recoveryRequestRef.current=false;
    },
    onTranscriptTurn:(turn,all)=>{cadenceRef.current.observe(turn);turnsRef.current=all.slice();setTurns(all.slice())},
    onTurnComplete:turn=>{
      if(turn.hasValidOutput){awaitingTutorRef.current=false;recoveryRequestRef.current=false}
      if(turn.hasValidOutput&&configRef.current.languageDriftGuard?.(turn.output||"")&&!languageRepairRef.current){
       languageRepairRef.current=true;
       // Silent control, not a fabricated learner turn. One repair per learner reply.
       const rule=configRef.current.languageDirective||"";
       session.sendControl?.(rule+"\n[LANGUAGE RECOVERY] Your last spoken reply was in an unintended language. Restate that answer briefly in the selected target language. Do not greet or change subjects.");
      }else if(turn.hasValidOutput&&!configRef.current.languageDriftGuard?.(turn.output||"")){
       languageRepairRef.current=false;
      }
      configRef.current.onTurnComplete?.(turn);
     },
    onError:e=>{const kind=classifyError(e.message);if(kind==="key")setGeminiVerified(false);setErrorKind(kind);setState("error");setStatus(uiMessage(e.message))},
    onTerminal:info=>{cancelRescue();const item=snapshot(info?.status||"terminal");sessionRef.current=null;if(info?.state==="error"){setState("error");return}void finish(item)}
   });
   sessionRef.current=session;await session.start();session.setVolume(volume);setState("listening");
  }catch(e){sessionRef.current=null;const kind=classifyError(e instanceof Error?e.message:e);if(kind==="key")setGeminiVerified(false);setErrorKind(kind);setState("error");setStatus(uiMessage(e instanceof Error?e.message:e))}
 },[finish,snapshot,volume]);
 const stop=useCallback(async(deferReport=false)=>{
  const s=sessionRef.current;if(!s)return null;
  cancelRescue();setState("ending");setStatus("正在結束…");
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
 const interrupt=useCallback(()=>{awaitingTutorRef.current=false;recoveryRequestRef.current=false;return sessionRef.current?.interrupt()??false},[]);
 const toggleMute=useCallback(()=>{const s=sessionRef.current;if(!s?.ready)return;s.toggleMic();setMuted(s.micMuted)},[]);
 const sendText=useCallback((text:string)=>sessionRef.current?.sendText(text)??false,[]);
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
 const setVolume=useCallback((v:number)=>{const n=Math.max(0,Math.min(100,v));setVolumeValue(n);localStorage.setItem("crew_live_volume",String(n));sessionRef.current?.setVolume(n)},[]);
 useEffect(()=>()=>{
  const session=sessionRef.current;
  cancelRescue();
  if(!session)return;
  // Preserve the final completed transcript before closing the active transport.
  snapshot("page-leave");
  sessionRef.current=null;
  void session.stop({reason:"page-leave",silentStatus:true,emitTerminal:false}).catch(()=>{});
 },[snapshot]);
 return{state,status,turns,input,output,muted,durationMs,report,volume,errorKind,visionSending,lastImage,visionError,start,stop,interrupt,toggleMute,sendText,sendControl,sendImageFile,sendPreparedImage,sendVideoFrame,setVolume};
}
