import {learningSpeechRoute} from "./learningSpeechRoutes";
import {TARGET_LANGUAGES} from "./targetLanguages";
import {speakText} from "../lib/deviceCapabilities";

export type LearningSpeechSpeed="normal"|"slow";
export type LearningSpeechMode="word"|"phrase"|"sentence";
export type LearningSpeechEngine="kokoro"|"pico"|"system";
export type LearningSpeechResult={engine:LearningSpeechEngine;language:string;cached:boolean};

const KOKORO_MODEL_ID="onnx-community/Kokoro-82M-v1.0-ONNX";
const KOKORO_CACHE="transformers-cache";
const PICO_BASE="https://huggingface.co/KittenML/kitten-tts-2-pico/resolve/main/";
const MODEL_CACHE="koolo-learning-speech-v1";
const PICO_LANGUAGES=new Set(["de"]);
const LANG_TAG:Record<string,string>={en:"en-US",es:"es-ES",fr:"fr-FR",de:"de-DE",it:"it-IT",pt:"pt-BR",ja:"ja-JP",ko:"ko-KR",vi:"vi-VN",th:"th-TH",zh:"zh-TW",id:"id-ID",ru:"ru-RU",hi:"hi-IN"};
type WorkerRequest={id:number;type:"prepare"|"generate";language:string;text?:string;speed?:LearningSpeechSpeed;keepStart?:boolean;webgpu?:boolean};
type WorkerReply={id:number;ok:boolean;buffer?:ArrayBuffer;error?:string};
const generated=new Map<string,Blob[]>();
const ready=new Set<string>();
const warming=new Map<string,Promise<void>>();
const pending=new Map<number,{resolve:(value:WorkerReply)=>void;reject:(reason:Error)=>void;worker:Worker}>();
let picoWorker:Worker|null=null;
let kokoroWorker:Worker|null=null;

let useKokoroMain=false;
let requestId=0;
let playbackId=0;
let persistenceRequested=false;
let currentAudio:HTMLAudioElement|null=null;
let currentUrl="";
let cancelAudio:(()=>void)|null=null;

export function normalizeLearningLanguage(value:string):string{
 const normalized=String(value||"").trim();
 if(/^en-gb$/i.test(normalized))return "en-GB";
 if(/^en-us$/i.test(normalized))return "en-US";
 return TARGET_LANGUAGES.find(item=>item.code===normalized||item.value===normalized||item.spoken===normalized)?.code||(/^[a-z]{2}(?:-[A-Z]{2})?$/.test(normalized)?normalized.split("-")[0]:"en");
}
export function preferredLearningEngine(value:string):LearningSpeechEngine{
 const code=normalizeLearningLanguage(value);
 return learningSpeechRoute(code).engine;
}
export function picoLearningLanguages(){return [...PICO_LANGUAGES]}

function cacheKey(text:string,language:string,speed:LearningSpeechSpeed,engine:LearningSpeechEngine){
 return [engine,language,speed,text.trim().toLocaleLowerCase()].join("|");
}
function remember(key:string,blobs:Blob[]){
 generated.set(key,blobs);
 if(generated.size>40)generated.delete(generated.keys().next().value as string);
}
function releaseAudio(){
 if(currentAudio){currentAudio.onended=null;currentAudio.onerror=null;currentAudio.pause();currentAudio.removeAttribute("src");currentAudio=null}
 if(currentUrl){URL.revokeObjectURL(currentUrl);currentUrl=""}
}
function stopCurrentAudio(){
 const cancel=cancelAudio;cancelAudio=null;
 releaseAudio();cancel?.();
}
export function stopLearningSpeech(){
 ++playbackId;
 stopCurrentAudio();
 try{window.speechSynthesis?.cancel()}catch{}
}
async function playBlob(blob:Blob,id:number):Promise<void>{
 if(id!==playbackId)return;
 stopCurrentAudio();
 currentUrl=URL.createObjectURL(blob);
 const audio=new Audio(currentUrl);currentAudio=audio;
 await new Promise<void>((resolve,reject)=>{
  const finish=(error?:Error)=>{
   // An interrupted old play() may reject after a newer audio element has started.
   if(currentAudio!==audio)return;
   cancelAudio=null;releaseAudio();
   if(error)reject(error);else resolve();
  };
  cancelAudio=()=>resolve();
  audio.onended=()=>finish();
  audio.onerror=()=>finish(new Error("AUDIO_PLAYBACK_FAILED"));
  void audio.play().catch(error=>finish(error instanceof Error?error:new Error(String(error))));
 });
}
function hasWebGpu(){
 return typeof navigator!=="undefined"&&"gpu" in navigator;
}
export function learningSpeechDownloadSettings(){
 return{runtime:hasWebGpu()?"WebGPU fp32":"WASM q8",size:hasWebGpu()?310:88};
}
function modelUrl(language:string){
 return PICO_BASE+"kitten_tts_2_pico_"+language+"_int4.onnx";
}
async function hasCachedTinyModel(language:string){
 if(!("caches" in window))return false;
 try{
  const route=learningSpeechRoute(language);
  if(route.engine==="kokoro"){
   const model=route.model==="zh"?"onnx-community/Kokoro-82M-v1.1-zh-ONNX":KOKORO_MODEL_ID;
   const file=route.model==="zh"||hasWebGpu()?"model.onnx":"model_quantized.onnx";
   const cache=await caches.open(KOKORO_CACHE);
   const weight=await cache.match("https://huggingface.co/"+model+"/resolve/main/onnx/"+file) || (await cache.keys()).some(request=>{
    const url=new URL(request.url);
    return url.pathname.includes("/"+model+"/")&&url.pathname.endsWith("/onnx/"+file);
   });
   if(!weight)return false;
   const assets=await caches.open(MODEL_CACHE);
   if(route.g2p&&(!await assets.match("https://cdn.jsdelivr.net/npm/uccharan@1.0.0/data/"+route.g2p+".ucd")||!await assets.match("https://cdn.jsdelivr.net/npm/uccharan@1.0.0/dist/uccharan_wasm_bg.wasm")))return false;
   if(route.model==="ja"&&!await assets.match(japaneseCacheMarker()))return false;
   return true;
  }
  return Boolean(await(await caches.open(MODEL_CACHE)).match(modelUrl(language)));
 }catch{return false}
}
function japaneseCacheMarker(){return new URL("/__learning-speech-cache/ja-"+(hasWebGpu()?"fp32":"q8"),location.origin).href}
function requestPersistentStorage(){
 if(persistenceRequested)return;
 try{
  const storage=navigator.storage;
  if(typeof storage?.persist!=="function")return;
  persistenceRequested=true;
  void Promise.resolve(storage.persist()).catch(()=>{});
 }catch{}
}
function getWorker(language:string):Worker{
 const english=learningSpeechRoute(language).engine==="kokoro",existing=english?kokoroWorker:picoWorker;
 if(existing)return existing;
 if(typeof Worker==="undefined")throw Error("WORKER_UNAVAILABLE");
 // Kokoro's ESM needs a module worker; Pico continues using classic importScripts.
 const created=english
  ?new Worker(new URL("./learningSpeech.kokoro.worker.ts",import.meta.url),{type:"module"})
  :new Worker(new URL("./learningSpeech.worker.ts",import.meta.url),{type:"classic"});
 created.onmessage=(event:MessageEvent<WorkerReply>)=>{
  const reply=event.data,task=pending.get(reply.id);if(!task||task.worker!==created)return;
  pending.delete(reply.id);
  if(reply.ok)task.resolve(reply);else task.reject(new Error(reply.error||"LEARNING_WORKER_FAILED"));
 };
 created.onerror=()=>{
  if((english?kokoroWorker:picoWorker)!==created)return;
  if(english)kokoroWorker=null;else picoWorker=null;
  for(const code of ready)if((learningSpeechRoute(code).engine==="kokoro")===english)ready.delete(code);
  for(const code of warming.keys())if((learningSpeechRoute(code).engine==="kokoro")===english)warming.delete(code);
  for(const [id,task]of pending)if(task.worker===created){
   task.reject(new Error("LEARNING_WORKER_FAILED"));pending.delete(id);
  }
  created.terminate();
 };
 if(english)kokoroWorker=created;else picoWorker=created;
 return created;
}
function requestWorker(message:Omit<WorkerRequest,"id">):Promise<WorkerReply>{
 return new Promise<WorkerReply>((resolve,reject)=>{
  try{
   const instance=getWorker(message.language),id=++requestId;
   pending.set(id,{resolve,reject,worker:instance});
   instance.postMessage({...message,id});
  }catch(error){reject(error instanceof Error?error:new Error(String(error)))}
 });
}
function ensureTiny(language:string):Promise<void>{
 if(ready.has(language))return Promise.resolve();
 const existing=warming.get(language);if(existing)return existing;
 const task=(async()=>{
  if(learningSpeechRoute(language).engine==="kokoro"){
   try{if(useKokoroMain)await (await import("./learningSpeechKokoro")).prepareKokoro(language,hasWebGpu());else await requestWorker({type:"prepare",language,webgpu:hasWebGpu()})}
   catch(error){
    // Fall back to the identical lazy TTS Lab main-thread loader if module workers fail.
    console.warn("[learning-speech] Kokoro module worker unavailable; using Lab runtime",error);
    useKokoroMain=true;await (await import("./learningSpeechKokoro")).prepareKokoro(language,hasWebGpu());
   }
  }else await requestWorker({type:"prepare",language});
  if(learningSpeechRoute(language).model==="ja"&&typeof caches!=="undefined")await (await caches.open(MODEL_CACHE)).put(japaneseCacheMarker(),new Response("ready")).catch(()=>{});
  ready.add(language);requestPersistentStorage();
 })().catch(error=>{warming.delete(language);throw error});
 warming.set(language,task);
 return task;
}
async function generateTiny(text:string,language:string,speed:LearningSpeechSpeed,keepStart:boolean){
 if(learningSpeechRoute(language).engine==="kokoro"&&useKokoroMain)return (await import("./learningSpeechKokoro")).generateKokoro(text,language,speed,hasWebGpu());
 let reply:WorkerReply;
 try{reply=await requestWorker({type:"generate",language,text,speed,keepStart,webgpu:hasWebGpu()})}
 catch(error){
  if(learningSpeechRoute(language).engine!=="kokoro")throw error;
  useKokoroMain=true;
  return (await import("./learningSpeechKokoro")).generateKokoro(text,language,speed,hasWebGpu());
 }
 if(!reply.buffer)throw Error("LEARNING_EMPTY_AUDIO");
 return new Blob([reply.buffer],{type:"audio/wav"});
}

/** Keep the first playable clause short; generate the next clause while the current one plays. */
export function segmentLearningSpeech(text:string):string[]{
 const sentences=text.replace(/\s+/g," ").trim().match(/[^.!?。！？]+[.!?。！？]*|[.!?。！？]+/g)||[];
 const parts:string[]=[];
 for(const sentence of sentences){
  const clauses=sentence.split(/(?<=[,;:，；：])\s*/u).filter(Boolean);
  let group="";
  for(const clause of clauses){
   const trimmed=clause.trim();if(!trimmed)continue;
   if(group&&group.length+trimmed.length+1>100){parts.push(group);group=""}
   for(const word of trimmed.split(/\s+/)){
    if(!word)continue;
    if(group&&(group.length+word.length+1>100)){parts.push(group);group=""}
    if(word.length>100){
     if(group){parts.push(group);group=""}
     for(let pos=0;pos<word.length;pos+=100)parts.push(word.slice(pos,pos+100));
    }else group+=(group?" ":"")+word;
   }
  }
  if(group)parts.push(group);
 }
 return parts.length?parts:[text.trim()];
}
async function systemSpeak(text:string,language:string,speed:LearningSpeechSpeed):Promise<void>{
 stopCurrentAudio();
 // Preserve Koolo Android native TTS as the English fallback.
 if(language==="en"){await speakText(text,{speed});return}
 if("speechSynthesis" in window){
  const utterance=new SpeechSynthesisUtterance(text);utterance.lang=LANG_TAG[language]||learningSpeechRoute(language).locale;utterance.rate=speed==="slow"?0.78:1;
  const voices=window.speechSynthesis.getVoices(),prefix=utterance.lang.toLowerCase().split("-")[0];
  utterance.voice=voices.find(item=>item.lang.toLowerCase()===utterance.lang.toLowerCase())||voices.find(item=>item.lang.toLowerCase().startsWith(prefix))||null;
  await new Promise<void>((resolve,reject)=>{
   utterance.onend=()=>resolve();
   utterance.onerror=event=>event.error==="canceled"||event.error==="interrupted"?resolve():reject(new Error(event.error));
   window.speechSynthesis.speak(utterance);
  });
  return;
 }
 await speakText(text,{speed});
}

export async function speakLearningText(text:string,languageValue:string,options:{speed?:LearningSpeechSpeed;mode?:LearningSpeechMode;onModelStatus?:(status:"loading"|"ready",language:string)=>void}={}):Promise<LearningSpeechResult>{
 const value=text.trim();if(!value)throw Error("EMPTY_SPEECH_TEXT");
 stopLearningSpeech();
 const id=playbackId,language=normalizeLearningLanguage(languageValue),speed=options.speed||"normal",preferred=preferredLearningEngine(language);
 const key=cacheKey(value,language,speed,preferred),cached=generated.get(key);
 if(preferred!=="system"&&!cached&&!ready.has(language)){
  const hit=await hasCachedTinyModel(language);
  if(id!==playbackId)return{engine:"system",language,cached:false};
  // Cache hits still require ONNX/WASM initialisation; never block the first tap.
  if(!hit)options.onModelStatus?.("loading",language);
  void ensureTiny(language).catch(error=>{
   console.warn("[learning-speech] local speech model could not initialise",error);
  }).finally(()=>{if(id===playbackId&&!hit)options.onModelStatus?.("ready",language)});
  await systemSpeak(value,language,speed);
  return{engine:"system",language,cached:false};
 }
 try{
  if(cached){
   for(const blob of cached){if(id!==playbackId)break;await playBlob(blob,id)}
   return{engine:preferred,language,cached:true};
  }
  if(preferred!=="system"){
   const chunks=segmentLearningSpeech(value),blobs:Blob[]=[];
   let next=generateTiny(chunks[0],language,speed,true);
   for(let index=0;index<chunks.length;index++){
    const blob=await next;if(id!==playbackId)return{engine:preferred,language,cached:false};
    blobs.push(blob);
    // Start producing the following clause before playing this one.
    if(index+1<chunks.length)next=generateTiny(chunks[index+1],language,speed,false);
    await playBlob(blob,id);
   }
   if(id===playbackId)remember(key,blobs);
   return{engine:preferred,language,cached:false};
  }
 }catch(error){
  if(id!==playbackId)return{engine:"system",language,cached:false};
  console.warn("[learning-speech] local neural TTS fell back to system voice",error);
 }
 if(id===playbackId)await systemSpeak(value,language,speed);
 return{engine:"system",language,cached:false};
}
