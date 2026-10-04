export type LiveTurn={input?:string;output?:string};
export type LiveSessionOptions={
 system:string;openingPrompt:string;voice:string;volume:number;manualInterruptOnly?:boolean;
 maxLiveAttempts?:number;maxResumeAttempts?:number;connectTimeoutMs?:number;replyTimeoutMs?:number;
 onStatus?:(value:string)=>void;onState?:(value:string)=>void;onSpeaking?:(value:boolean)=>void;
 onMicMuted?:()=>void;onInputTranscript?:(text:string)=>void;onOutputTranscript?:(text:string)=>void;
 onTranscriptTurn?:(turn:LiveTurn,turns:LiveTurn[])=>void;onTurnComplete?:(turn:{hasValidOutput?:boolean;output?:string})=>void;
 onError?:(error:Error)=>void;onTerminal?:(info?:{status?:string;state?:string})=>void;
};
export interface LiveSession{
 ready:boolean;running:boolean;model:string;micMuted:boolean;
 start():Promise<void>;stop(options?:Record<string,unknown>):Promise<void>;setVolume(value:number):void;
 toggleMic():void;interrupt():boolean;sendText(text:string):boolean;sendImage(image:unknown,options?:Record<string,unknown>):boolean;
 getDurationMs():number;waitForPlaybackDrain(maxMs?:number):Promise<void>;
}
type StoryBook={id:string;title?:string;summary?:string;idea?:string;coverIndex?:number;images?:any[];pages?:any[];currentPage?:number;updatedAt?:string};
declare global{interface Window{
 CrewAI?:any;CrewLive?:{Session:new(options:LiveSessionOptions)=>LiveSession};CrewLiveUI?:any;CrewTeacherReport?:any;
 CrewDB?:any;CrewGeminiVision?:any;CrewTextbookStore?:any;CrewTextbookLesson?:any;
 CrewStoryStore?:{save(book:StoryBook):Promise<StoryBook>;get(id:string):Promise<StoryBook|null>;list():Promise<StoryBook[]>;remove(id:string):Promise<void>;last():Promise<StoryBook|null>};
 CrewStoryGenerator?:any;CrewFortuneProfile?:any;CrewFortuneBaZi?:any;CrewFortuneTarot?:any;CrewFortuneVedic?:any;
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
 loaded.set(src,p);return p;
}
export async function ensureCore(){if(!window.CrewAI)await loadScript("/crew.js")}
export async function ensureLive(){await ensureCore();if(!window.CrewLive)await loadScript("/crew-live.js");if(!window.CrewLiveUI)await loadScript("/crew-live-ui.js")}
export async function ensureVision(){await ensureLive();if(!window.CrewDB)await loadScript("/features/shared/db.js");if(!window.CrewGeminiVision)await loadScript("/features/shared/gemini-vision.js")}
export async function ensureTeacherServices(){await ensureVision();if(!window.CrewTextbookStore)await loadScript("/features/teacher/textbook/store.js");if(!window.CrewTextbookLesson)await loadScript("/features/teacher/textbook/lesson.js");if(!window.CrewTeacherReport)await loadScript("/features/teacher/reports/session-report.js")}
export async function ensureStoryServices(){await ensureVision();if(!window.CrewStoryStore)await loadScript("/features/story/shelf/store.js");if(!window.CrewStoryGenerator)await loadScript("/features/story/create/generator.js")}
export async function ensureFortuneServices(){
 await ensureCore();
 if(!window.CrewFortuneProfile)await loadScript("/features/fortune/shared/profile.js");
 if(!window.Lunar)await loadScript("https://cdn.jsdelivr.net/npm/lunar-javascript@1.7.7/lunar.min.js");
 if(!window.Astronomy)await loadScript("https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js");
 if(!window.CrewFortuneBaZi)await loadScript("/features/fortune/bazi/calculator.js");
 if(!window.CrewFortuneTarot)await loadScript("/features/fortune/tarot/calculator.js");
 if(!window.CrewFortuneVedic)await loadScript("/features/fortune/vedic/calculator.js");
 if(!window.CrewFortuneBaZiRender)await loadScript("/features/fortune/bazi/render.js");
 if(!window.CrewFortuneTarotRender)await loadScript("/features/fortune/tarot/render.js");
 if(!window.CrewFortuneVedicRender)await loadScript("/features/fortune/vedic/render.js");
}
export function geminiKey(){return(localStorage.getItem("crew_gemini_api_key")||sessionStorage.getItem("crew_gemini_api_key_session")||"").trim()}
export function saveGeminiKey(value:string,remember:boolean){localStorage.removeItem("crew_gemini_api_key");sessionStorage.removeItem("crew_gemini_api_key_session");(remember?localStorage:sessionStorage).setItem(remember?"crew_gemini_api_key":"crew_gemini_api_key_session",value.trim())}
export function clearGeminiKey(){localStorage.removeItem("crew_gemini_api_key");sessionStorage.removeItem("crew_gemini_api_key_session")}
export function history(name:string){try{return JSON.parse(localStorage.getItem("crew_history_"+name)||"[]")}catch{return[]}}
export function addHistory(name:string,item:any){const list=history(name);list.unshift({...item,id:item.id||Date.now(),ts:item.ts||new Date().toISOString()});localStorage.setItem("crew_history_"+name,JSON.stringify(list.slice(0,30)));return list}
export function lastLive(name:string){try{return JSON.parse(localStorage.getItem("crew_live_last_"+name)||"null")}catch{return null}}
export function saveLive(name:string,item:any){localStorage.setItem("crew_live_last_"+name,JSON.stringify(item));addHistory(name,item)}
export function vocabularyLevel(){const s=Number(localStorage.getItem("crew_vocab_score")||50);return s<30?"A1":s<45?"A2":s<62?"B1":s<82?"B2":"C1"}
