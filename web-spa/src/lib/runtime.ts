import {currentBuild} from "../runtime/buildUpdates";
import type {PlaybackRoute} from "../live/createElementPlayback";
export type LiveTurn={id?:string;input?:string;output?:string};
export type LiveSessionOptions={
 createPlaybackRoute?:(context:AudioContext,onLost:()=>void)=>PlaybackRoute;
 separateCaptureContext?:boolean;
 inputLanguageCodes?:string[]; // Optional hints for input transcription only
 guestAccessToken?:string; // one-use, memory-only v1beta credential
 textOnly?:boolean; // Gemini Live text input with transcribed output, no microphone or playback
 allowMicUpgrade?:boolean; // Friend text-first Live: capture mic later on the same socket
 trackTextTurns?:boolean; // Include keyboard input in the same voice transcript
 system:string;openingPrompt:string;voice:string;volume:number;models?:string[];manualInterruptOnly?:boolean;
 protectOpening?:boolean;onOpeningProtectionChange?:(protectedOpening:boolean)=>void;
 maxLiveAttempts?:number;maxResumeAttempts?:number;connectTimeoutMs?:number;replyTimeoutMs?:number;
 turnTiming?:{silenceDurationMs:number;endOfSpeechSensitivity:"END_SENSITIVITY_LOW"|"END_SENSITIVITY_HIGH"};
 tools?:Array<{functionDeclarations:Array<Record<string,unknown>>}|{googleSearch:Record<string,never>}>;
  onGrounding?:(metadata:unknown)=>void;
  onSearchUnavailable?:()=>void;
 onToolCall?:(call:{id?:string;name:string;args?:unknown})=>Record<string,unknown>;
 onToolsUnavailable?:()=>void;
 onStatus?:(value:string)=>void;onState?:(value:string)=>void;onSpeaking?:(value:boolean)=>void;
 onListeningPhase?:(phase:"speaking"|"waiting")=>void;onLocalUtteranceEnd?:()=>void;
 onMicHealth?:(status:{captureMode:string;trackState:string;muted:boolean;rms:number;dbfs:number;lastFrameAt:number;lastVoiceAt:number;setupBufferedMs:number})=>void;
 onOutputLevel?:(level:number)=>void; // optional output-only PCM envelope
 onMicMuted?:()=>void;onInputTranscript?:(text:string)=>void;onOutputTranscript?:(text:string)=>void;
 onTranscriptTurn?:(turn:LiveTurn,turns:LiveTurn[])=>void;onTurnComplete?:(turn:{hasValidOutput?:boolean;input?:string;output?:string})=>void;
 onGenerationComplete?:(output:string)=>void;
 onError?:(error:Error)=>void;onTerminal?:(info?:{status?:string;state?:string})=>void;onRecovered?:(event:{model:string;resumed:boolean})=>void;
};
export interface LiveSession{
 ready:boolean;running:boolean;model:string;micMuted:boolean;
 start():Promise<void>;stop(options?:Record<string,unknown>):Promise<void>;setVolume(value:number):void;
 toggleMic():void;enableMicrophone?():Promise<void>;interrupt():boolean;sendText(text:string):boolean;sendControl?(instruction:string):boolean;sendImage(image:unknown,options?:Record<string,unknown>):boolean;sendVideoFrame?(frame:unknown):boolean;
 getDurationMs():number;
 getMicHealth?():{captureMode:string;trackState:string;muted:boolean;rms:number;dbfs:number;lastFrameAt:number;lastVoiceAt:number;setupBufferedMs:number};
 getHealthSnapshot?():{socketState:number|null;audioContextState:string|null;micTrackState:string|null;bufferedBytes:number;lastAudioSentAgoMs:number|null;lastServerEventAgoMs:number|null;lastTranscriptAgoMs:number|null;lastModelOutputAgoMs:number|null};
 waitForPlaybackDrain(maxMs?:number):Promise<void>;
}
type StoryBook={id:string;title?:string;summary?:string;idea?:string;coverIndex?:number;images?:any[];pages?:any[];currentPage?:number;updatedAt?:string};
declare global{interface Window{
 CrewAI?:{call:(prompt:string,opt?:{preferLive?:boolean;temperature?:number;maxOutputTokens?:number;timeoutMs?:number;requireComplete?:boolean;thinking?:string;strictModels?:boolean;models?:string[];system?:string;json?:boolean})=>Promise<string>;[key:string]:any} & any;CrewLive?:{Session:new(options:LiveSessionOptions)=>LiveSession};CrewLiveUI?:any;CrewTeacherReport?:any;
 CrewDB?:any;CrewGeminiVision?:any;CrewTextbookStore?:any;CrewTextbookLesson?:any;
 CrewStoryStore?:{save(book:StoryBook):Promise<StoryBook>;get(id:string):Promise<StoryBook|null>;list():Promise<StoryBook[]>;remove(id:string):Promise<void>;last():Promise<StoryBook|null>};
 CrewStoryGenerator?:any;CrewBookAnalyzer?:any;CrewFortuneProfile?:any;CrewFortuneBaZi?:any;CrewFortuneTarot?:any;CrewFortuneVedic?:any;CrewFortuneVedicEnrich?:any;
 CrewFortuneBaZiRender?:any;CrewFortuneTarotRender?:any;CrewFortuneVedicRender?:any;
 Astronomy?:any;Lunar?:any;
}}
const loaded=new Map<string,Promise<void>>();
export function loadScript(src:string){
 if(loaded.has(src))return loaded.get(src)!;
 const p=new Promise<void>((resolve,reject)=>{
  const s=document.createElement("script");s.src=src;s.async=false;
  s.onload=()=>resolve();s.onerror=()=>reject(new Error("無法載入 "+src));document.head.appendChild(s);
 });
 loaded.set(src,p);
 // A failed warm-up should not poison every future retry in this tab.
 void p.catch(()=>{if(loaded.get(src)===p)loaded.delete(src)});
 return p;
}
/** Validate the legacy global contract after loading rather than reporting a false success. */
async function requireLegacyGlobal<T>(name:string,load:()=>Promise<void>,read:()=>T|undefined):Promise<T>{
 const current=read();if(current)return current;
 await load();
 const result=read();
 if(!result)throw new Error("Legacy runtime did not initialize: "+name);
 return result;
}
export async function ensureCore(){await requireLegacyGlobal("CrewAI",()=>loadScript("/crew.js"),()=>window.CrewAI)}
export async function ensureLive(){
 await ensureCore();
 await requireLegacyGlobal("CrewLive",()=>loadScript("/crew-live.js?v="+encodeURIComponent(currentBuild.buildId||"dev")),()=>window.CrewLive);
 await requireLegacyGlobal("CrewLiveUI",()=>loadScript("/crew-live-ui.js"),()=>window.CrewLiveUI);
}
export async function ensureVision(){await ensureLive();if(!window.CrewDB)await loadScript("/features/shared/db.js");if(!window.CrewGeminiVision)await loadScript("/features/shared/gemini-vision.js")}
export async function ensureTeacherServices(){await ensureVision();if(!window.CrewTextbookStore)await loadScript("/features/teacher/textbook/store.js");if(!window.CrewTextbookLesson)await loadScript("/features/teacher/textbook/lesson.js");if(!window.CrewTeacherReport)await loadScript("/features/teacher/reports/session-report.js")}
export async function ensureStoryServices(){await ensureVision();if(!window.CrewStoryStore)await loadScript("/features/story/shelf/store.js");if(!window.CrewStoryGenerator)await loadScript("/features/story/create/generator.js");if(!window.CrewBookAnalyzer)await loadScript("/features/story/physical/analyzer.js")}
export async function ensureFortuneServices(){
 await ensureCore();
 if(!window.CrewFortuneProfile)await loadScript("/features/fortune/shared/profile.js");
 if(!window.Lunar)await loadScript("https://cdn.jsdelivr.net/npm/lunar-javascript@1.7.7/lunar.min.js");
 if(!window.Astronomy)await loadScript("https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js");
 if(!window.CrewFortuneBaZi)await loadScript("/features/fortune/bazi/calculator.js");
 if(!window.CrewFortuneTarot)await loadScript("/features/fortune/tarot/calculator.js");
 if(!window.CrewFortuneVedic)await loadScript("/features/fortune/vedic/calculator.js");
 if(!window.CrewFortuneVedicEnrich)await loadScript("/features/fortune/vedic/enrich.js");
 if(!window.CrewFortuneBaZiRender)await loadScript("/features/fortune/bazi/render.js");
 if(!window.CrewFortuneTarotRender)await loadScript("/features/fortune/tarot/render.js");
 if(!window.CrewFortuneVedicRender)await loadScript("/features/fortune/vedic/render.js");
}
export const GEMINI_KEY_CHANGED_EVENT="crew:gemini-key-changed";
export function emitGeminiKeyChanged(){if(typeof window!=="undefined")window.dispatchEvent(new Event(GEMINI_KEY_CHANGED_EVENT))}
export function geminiKey(){return(localStorage.getItem("crew_gemini_api_key")||sessionStorage.getItem("crew_gemini_api_key_session")||"").trim()}
export function geminiVerified(){return Boolean(geminiKey())&&localStorage.getItem("crew_gemini_key_verified")==="1"}
export function setGeminiVerified(value:boolean){if(value)localStorage.setItem("crew_gemini_key_verified","1");else localStorage.removeItem("crew_gemini_key_verified")}
export function saveGeminiKey(value:string,remember:boolean){setGeminiVerified(false);localStorage.removeItem("crew_gemini_api_key");sessionStorage.removeItem("crew_gemini_api_key_session");(remember?localStorage:sessionStorage).setItem(remember?"crew_gemini_api_key":"crew_gemini_api_key_session",value.trim());emitGeminiKeyChanged()}
export function clearGeminiKey(){setGeminiVerified(false);localStorage.removeItem("crew_gemini_api_key");sessionStorage.removeItem("crew_gemini_api_key_session");emitGeminiKeyChanged()}
export function history(name:string){try{return JSON.parse(localStorage.getItem("crew_history_"+name)||"[]")}catch{return[]}}
export function addHistory(name:string,item:any){const id=item.id||Date.now(),list=history(name).filter((x:any)=>String(x?.id)!==String(id));list.unshift({...item,id,ts:item.ts||new Date().toISOString()});localStorage.setItem("crew_history_"+name,JSON.stringify(list.slice(0,30)));return list}
export function lastLive(name:string){try{return JSON.parse(localStorage.getItem("crew_live_last_"+name)||"null")}catch{return null}}
export function saveLive(name:string,item:any){localStorage.setItem("crew_live_last_"+name,JSON.stringify(item));addHistory(name,item)}
export function vocabularyLevel(){const s=Number(localStorage.getItem("crew_vocab_score")||50);return s<=20?"Pre-A1":s<=40?"A1":s<=60?"A2":s<=80?"B1":"B2+"}

