import {CREW_FRIENDS} from "../friends/friendProfiles";
import {TEACHER_PROFILES} from "./teacherProfiles";
import {LIVE_VOICES,normalizeLiveVoice} from "../live/voiceIdentity";

/** Developer-only auditions. Never alters a role's production voice selection. */
export type CastingLanguage="en"|"ja"|"ko"|"es"|"fr"|"zh";
export const CASTING_LINES:Record<CastingLanguage,{label:string,text:string,instruction:string}>={
 en:{label:"English",text:"It's good to see you again. What have you been up to lately?",instruction:"English"},
 ja:{label:"日本語",text:"また会えてうれしいです。最近はどんなことをしていましたか。",instruction:"Japanese"},
 ko:{label:"한국어",text:"다시 만나서 반가워요. 요즘 어떻게 지내셨어요?",instruction:"Korean"},
 es:{label:"Español",text:"Me alegra verte de nuevo. ¿Qué has hecho últimamente?",instruction:"Spanish"},
 fr:{label:"Français",text:"Je suis ravi de te revoir. Qu'as-tu fait ces derniers temps ?",instruction:"French"},
 zh:{label:"中文",text:"很高興再次見到你。最近都在忙些什麼呢？",instruction:"Mandarin Chinese"}
};
export const CASTING_CACHE_VERSION="casting-v1";
export type VoiceAssignment={voice:string;actors:{kind:"friend"|"teacher";id:string;name:string}[]};
export function voiceAssignments():VoiceAssignment[]{
 const map=new Map<string,VoiceAssignment>();
 const add=(kind:"friend"|"teacher",actor:{id:string;name:string},voice:string)=>{
  const name=normalizeLiveVoice(voice);
  if(!map.has(name))map.set(name,{voice:name,actors:[]});
  map.get(name)!.actors.push({kind,id:actor.id,name:actor.name});
 };
 CREW_FRIENDS.forEach(a=>add("friend",a,a.voice));
 TEACHER_PROFILES.forEach(a=>add("teacher",a,a.recommendedVoice));
 return LIVE_VOICES.filter(v=>map.has(v)).map(v=>map.get(v)!);
}
export function collisions(){return voiceAssignments().filter(a=>a.actors.length>1)}
export function unusedCastingVoices(){const used=new Set(voiceAssignments().map(a=>a.voice));return LIVE_VOICES.filter(v=>!used.has(v))}
export function castingKey(model:string,language:CastingLanguage,voice:string){
 return [CASTING_CACHE_VERSION,model,language,normalizeLiveVoice(voice)].join("|");
}

const CACHE_DB="crew_teacher_voice_casting";
const CACHE_STORE="samples";
function openCache():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  if(typeof indexedDB==="undefined"){reject(new Error("此瀏覽器不支援 IndexedDB 快取"));return}
  const req=indexedDB.open(CACHE_DB,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(CACHE_STORE))req.result.createObjectStore(CACHE_STORE)};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||new Error("無法開啟本地語音快取"));
 });
}
export async function readCastingSample(key:string):Promise<Blob|undefined>{
 const db=await openCache();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(CACHE_STORE,"readonly"),req=tx.objectStore(CACHE_STORE).get(key);
  req.onsuccess=()=>resolve(req.result instanceof Blob?req.result:undefined);
  req.onerror=()=>reject(req.error||new Error("無法讀取快取"));
  tx.oncomplete=()=>db.close();tx.onabort=()=>db.close();
 });
}
export async function writeCastingSample(key:string,blob:Blob):Promise<void>{
 const db=await openCache();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(CACHE_STORE,"readwrite");
  tx.objectStore(CACHE_STORE).put(blob,key);
  tx.oncomplete=()=>{db.close();resolve()};
  tx.onerror=()=>{db.close();reject(tx.error||new Error("無法儲存快取"))};
  tx.onabort=()=>{db.close();reject(tx.error||new Error("儲存快取已取消"))};
 });
}
export async function listCastingKeys():Promise<string[]>{
 const db=await openCache();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(CACHE_STORE,"readonly"),req=tx.objectStore(CACHE_STORE).getAllKeys();
  req.onsuccess=()=>resolve(req.result.map(String));
  req.onerror=()=>reject(req.error||new Error("無法列出快取"));
  tx.oncomplete=()=>db.close();tx.onabort=()=>db.close();
 });
}
export async function clearCastingSamples():Promise<void>{
 const db=await openCache();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(CACHE_STORE,"readwrite");tx.objectStore(CACHE_STORE).clear();
  tx.oncomplete=()=>{db.close();resolve()};
  tx.onerror=()=>{db.close();reject(tx.error||new Error("無法清空快取"))};
  tx.onabort=()=>{db.close();reject(tx.error||new Error("清除快取已取消"))};
 });
}

/** Gemini Live returns signed 16-bit little-endian raw PCM at typically 24kHz. */
export function pcmToWav(chunks:Uint8Array[],sampleRate:number):Blob{
 const bytes=chunks.reduce((n,v)=>n+v.byteLength,0);
 if(!bytes||bytes%2||bytes>1200000)throw new Error("音訊資料不完整或超過長度限制");
 const buffer=new ArrayBuffer(44+bytes),view=new DataView(buffer),output=new Uint8Array(buffer);
 const ascii=(offset:number,str:string)=>{for(let i=0;i<str.length;i++)view.setUint8(offset+i,str.charCodeAt(i))};
 ascii(0,"RIFF");view.setUint32(4,36+bytes,true);ascii(8,"WAVE");ascii(12,"fmt ");
 view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
 view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);
 view.setUint16(32,2,true);view.setUint16(34,16,true);
 ascii(36,"data");view.setUint32(40,bytes,true);
 let offset=44;for(const chunk of chunks){output.set(chunk,offset);offset+=chunk.byteLength}
 return new Blob([buffer],{type:"audio/wav"});
}
export type CastingRequest={key:string;model:string;voice:string;language:CastingLanguage;signal:AbortSignal};

/** No mic or history. Request exactly one neutral line per voice; the result stays local. */
export function generateCastingSample({key,model,voice,language,signal}:CastingRequest):Promise<Blob>{
 if(!key) return Promise.reject(new Error("請先設定 Gemini API Key"));
 if(signal.aborted)return Promise.reject(new DOMException("試聽已停止","AbortError"));
 const line=CASTING_LINES[language];
 return new Promise((resolve,reject)=>{
  let completed=false,setupSent=false,deadline=0,sampleRate=24000,totalBytes=0;
  const audio:Uint8Array[]=[];
  const url="wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key="+encodeURIComponent(key);
  const socket=new WebSocket(url);
  const cleanup=()=>{
   window.clearTimeout(deadline);
   signal.removeEventListener("abort",onAbort);
   try{socket.close(1000,"casting-complete")}catch{}
  };
  const fail=(reason:string)=>{if(completed)return;completed=true;cleanup();reject(new Error(reason))};
  const onAbort=()=>fail("已停止批次生成");
  signal.addEventListener("abort",onAbort,{once:true});
  socket.onopen=()=>{
   if(completed)return;
   socket.send(JSON.stringify({setup:{
    model:"models/"+model,
    generationConfig:{responseModalities:["AUDIO"],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:normalizeLiveVoice(voice)}}}},
    systemInstruction:{parts:[{text:"You are recording an anonymous, neutral speaker audition. Speak only "+line.instruction+". Read the supplied sentence exactly once without introductions, extra explanations, accents inferred from a character, or roleplay. Keep an ordinary conversational cadence."}]}
   }}));
  };
  socket.onmessage=async event=>{
   if(completed)return;
   try{
    const raw=typeof event.data==="string"?event.data:await (event.data as Blob).text();
    if(completed)return;
    const message=JSON.parse(raw);
    if(message.error){fail(String(message.error.message||message.error.status||"Gemini Live 拒絕生成音訊").slice(0,180));return}
    if((message.setupComplete||message.setup_complete)&&!setupSent){
     setupSent=true;
     socket.send(JSON.stringify({clientContent:{turns:[{role:"user",parts:[{text:"[VOICE AUDITION — READ ALOUD ONCE] "+line.text}]}],turnComplete:true}}));
    }
    const content=message.serverContent||message.server_content||{};
    for(const part of content.modelTurn?.parts||content.model_turn?.parts||[]){
     const clip=part.inlineData||part.inline_data;
     const mime=String(clip?.mimeType||clip?.mime_type||"");
     if(typeof clip?.data!=="string"||!mime.startsWith("audio/pcm"))continue;
     const rate=Number(/rate=(\d+)/i.exec(mime)?.[1]||24000);
     if(rate<8000||rate>48000){fail("Live 音訊採樣率不支援");return}
     if(audio.length&&rate!==sampleRate){fail("Live 音訊採樣率中途改變");return}
     sampleRate=rate;
     const bin=atob(clip.data),bytes=new Uint8Array(bin.length);
     for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
     totalBytes+=bytes.length;
     if(totalBytes>1200000){fail("Live 音訊超過長度限制");return}
     audio.push(bytes);
    }
    if(content.turnComplete||content.turn_complete){
     if(totalBytes<2048){fail("Gemini 沒有回傳可播放的音訊");return}
     const blob=pcmToWav(audio,sampleRate);
     completed=true;cleanup();resolve(blob);
    }
   }catch(e){fail("語音樣本處理失敗："+(e instanceof Error?e.message:"未知錯誤"))}
  };
  socket.onerror=()=>fail("Live 連線失敗，請確認選取的模型及 API Key 配額");
  socket.onclose=()=>{if(!completed)fail("Live 連線提前結束，未收到完整音訊")};
  deadline=window.setTimeout(()=>fail("單段語音逾時（25 秒），可略過後再重試"),25000);
 });
}
