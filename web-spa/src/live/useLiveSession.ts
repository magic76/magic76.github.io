import {useCallback,useEffect,useRef,useState} from "react";
import {ensureLive,ensureTeacherServices,geminiKey,saveLive,setGeminiVerified,type LiveSession,type LiveTurn} from "../lib/runtime";

export type LiveState="idle"|"requesting-mic"|"connecting"|"listening"|"speaking"|"ending"|"reporting"|"ended"|"error";
export type LiveErrorKind="key"|"mic"|"network"|"generic"|null;
type LiveImage={preview:string;name?:string;width?:number;height?:number};
type Config={
 pageKey:string;title:string;system:string;openingPrompt:string;voice:string;
 language?:string;teacherReport?:boolean;
 onTurnComplete?:(turn:{hasValidOutput?:boolean;output?:string})=>void;
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
 const visionSendingRef=useRef(false);
 const [volume,setVolumeValue]=useState(Number(localStorage.getItem("crew_live_volume")||100));
 useEffect(()=>{const id=window.setInterval(()=>{if(sessionRef.current)setDurationMs(sessionRef.current.getDurationMs())},500);return()=>clearInterval(id)},[]);
 const snapshot=useCallback((reason:string)=>{
  const s=sessionRef.current;if(savedRef.current||!turnsRef.current.length)return null;savedRef.current=true;
  const text=turnsRef.current.map(t=>[t.input?"你："+t.input:"",t.output?"AI："+t.output:""].filter(Boolean).join("\n")).filter(Boolean).join("\n\n");
  const item={title:configRef.current.title,preview:text.slice(0,180),turns:turnsRef.current.slice(),durationMs:s?.getDurationMs()||0,reason,ts:new Date().toISOString()};
  saveLive(configRef.current.pageKey,item);return item;
 },[]);
 const finish=useCallback(async(item:any)=>{
  if(item&&configRef.current.teacherReport){
   await ensureTeacherServices();
   if(window.CrewTeacherReport?.eligible(item)){setState("reporting");setStatus("正在整理課後學習報告…");const r=await window.CrewTeacherReport.generate(item,{language:configRef.current.language||"英文"});if(r)setReport(r)}
  }
  setState("ended");setStatus("已結束。");
 },[]);
 const start=useCallback(async()=>{
  if(sessionRef.current)return;
  if(!geminiKey()){setErrorKind("key");setState("error");setStatus("尚未設定 Gemini API key。");return}
  try{
   await ensureLive();if(!window.CrewLive)throw new Error("Live runtime 未載入");
   turnsRef.current=[];savedRef.current=false;setTurns([]);setInput("");setOutput("");setMuted(false);setReport(null);setDurationMs(0);setErrorKind(null);setLastImage(null);setVisionError("");
   setState("requesting-mic");setStatus("正在準備麥克風…");
   const session=new window.CrewLive.Session({
    system:configRef.current.system,openingPrompt:configRef.current.openingPrompt,voice:configRef.current.voice,volume,
    manualInterruptOnly:true,maxLiveAttempts:2,maxResumeAttempts:2,
    onStatus:v=>setStatus(uiMessage(v)),
    onState:v=>{if(v==="requesting-mic")setState("requesting-mic");else if(v==="connecting")setState("connecting");else if(v==="ready")setState("listening");else if(v==="error")setState("error")},
    onSpeaking:v=>setState(v?"speaking":"listening"),
    onMicMuted:()=>setMuted(Boolean(sessionRef.current?.micMuted)),
    onInputTranscript:setInput,onOutputTranscript:setOutput,
    onTranscriptTurn:(_t,all)=>{turnsRef.current=all.slice();setTurns(all.slice())},
    onTurnComplete:turn=>configRef.current.onTurnComplete?.(turn),
    onError:e=>{const kind=classifyError(e.message);if(kind==="key")setGeminiVerified(false);setErrorKind(kind);setState("error");setStatus(uiMessage(e.message))},
    onTerminal:info=>{const item=snapshot(info?.status||"terminal");sessionRef.current=null;if(info?.state==="error"){setState("error");return}void finish(item)}
   });
   sessionRef.current=session;await session.start();session.setVolume(volume);setState("listening");
  }catch(e){sessionRef.current=null;const kind=classifyError(e instanceof Error?e.message:e);if(kind==="key")setGeminiVerified(false);setErrorKind(kind);setState("error");setStatus(uiMessage(e instanceof Error?e.message:e))}
 },[finish,snapshot,volume]);
 const stop=useCallback(async()=>{const s=sessionRef.current;if(!s)return;setState("ending");setStatus("正在結束…");const item=snapshot("user-stop");try{await s.stop({reason:"user-stop",silentStatus:true,emitTerminal:false})}finally{sessionRef.current=null}await finish(item)},[finish,snapshot]);
 const interrupt=useCallback(()=>sessionRef.current?.interrupt()??false,[]);
 const toggleMute=useCallback(()=>{const s=sessionRef.current;if(!s?.ready)return;s.toggleMic();setMuted(s.micMuted)},[]);
 const sendText=useCallback((text:string)=>sessionRef.current?.sendText(text)??false,[]);
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
 const setVolume=useCallback((v:number)=>{const n=Math.max(0,Math.min(100,v));setVolumeValue(n);localStorage.setItem("crew_live_volume",String(n));sessionRef.current?.setVolume(n)},[]);
 useEffect(()=>()=>{if(sessionRef.current)void sessionRef.current.stop({reason:"page-leave",silentStatus:true,emitTerminal:false})},[]);
 return{state,status,turns,input,output,muted,durationMs,report,volume,errorKind,visionSending,lastImage,visionError,start,stop,interrupt,toggleMute,sendText,sendImageFile,sendPreparedImage,setVolume};
}
