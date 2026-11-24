import {TARGET_LANGUAGES} from "./targetLanguages";
import {speakText} from "../lib/deviceCapabilities";

export type LearningSpeechSpeed="normal"|"slow";
export type LearningSpeechMode="word"|"phrase"|"sentence";
export type LearningSpeechEngine="paradee"|"pico"|"eeh"|"mini"|"system";
export type LearningSpeechResult={engine:LearningSpeechEngine;language:string;cached:boolean};

// Reclaim Kokoro learning weights without touching unrelated Transformers.js models.
let legacyCleanupRequested=false;
function cleanupLegacyKokoroCache(){
 if(legacyCleanupRequested||typeof caches==="undefined")return;
 legacyCleanupRequested=true;
 void (async()=>{
  try{
   const names=await caches.keys();
   if(names.includes("kokoro-voices"))await caches.delete("kokoro-voices");
   if(!names.includes("transformers-cache"))return;
   const cache=await caches.open("transformers-cache");
   for(const request of await cache.keys())if(/Kokoro-82M/i.test(request.url))await cache.delete(request).catch(()=>{});
  }catch{/* Best effort: never interrupt pronunciation. */}
 })();
}
const PARADEE_MODEL="https://huggingface.co/sahilmahendrakar/Paradee-8M-v1.3/resolve/main/onnx/paradee_int8.onnx";
const MINI_MODEL="https://huggingface.co/KittenML/kitten-tts-2-mini/resolve/main/kitten_tts_2_mini_int4.onnx";
const EEH_MODEL="https://huggingface.co/ctrltokyo/eeh-1/resolve/a42c72e45bc814946e645a69acb15a184325a9a2/demo/model/eeh.safetensors.gz";
const PICO_BASE="https://huggingface.co/KittenML/kitten-tts-2-pico/resolve/main/";
const MODEL_CACHE="koolo-learning-speech-v1";
const PICO_LANGUAGES=new Set(["de","es","fr","it","pt"]);
const LANG_TAG:Record<string,string>={en:"en-US",es:"es-ES",fr:"fr-FR",de:"de-DE",it:"it-IT",pt:"pt-BR",ja:"ja-JP",ko:"ko-KR",vi:"vi-VN",th:"th-TH",zh:"zh-TW",id:"id-ID",ru:"ru-RU",hi:"hi-IN"};
type WorkerRequest={id:number;type:"prepare"|"generate";language:string;text?:string;speed?:LearningSpeechSpeed;keepStart?:boolean};
type WorkerReply={id:number;ok:boolean;buffer?:ArrayBuffer;error?:string};
const generated=new Map<string,Blob[]>();
const ready=new Set<string>();
const warming=new Map<string,Promise<void>>();
const pending=new Map<number,{resolve:(value:WorkerReply)=>void;reject:(reason:Error)=>void}>();
let worker:Worker|null=null;
let workerLanguage="";
let requestId=0;
let playbackId=0;
let persistenceRequested=false;
let currentAudio:HTMLAudioElement|null=null;
let currentUrl="";
let cancelAudio:(()=>void)|null=null;

export function normalizeLearningLanguage(value:string):string{
 const normalized=String(value||"").trim();
 if(/^zh(?:[-_]|$)/i.test(normalized))return "zh";
 if(/^en-gb$/i.test(normalized))return "en-GB";
 if(/^en-us$/i.test(normalized))return "en-US";
 return TARGET_LANGUAGES.find(item=>item.code===normalized||item.value===normalized||item.spoken===normalized)?.code||(/^[a-z]{2}(?:-[A-Z]{2})?$/.test(normalized)?normalized.split("-")[0]:"en");
}
export function preferredLearningEngine(value:string):LearningSpeechEngine{
 const code=normalizeLearningLanguage(value);
 if(code==="en"||code==="en-US"||code==="en-GB")return"paradee";
 if(code==="ja")return"eeh";
 if(code==="ko")return"mini";
 if(PICO_LANGUAGES.has(code))return"pico";
 return"system";
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
function modelLanguage(language:string){return preferredLearningEngine(language)==="paradee"?"en":language}
function modelUrl(language:string){
 switch(preferredLearningEngine(language)){
  case "paradee":return PARADEE_MODEL;
  case "mini":return MINI_MODEL;
  case "eeh":return EEH_MODEL;
  case "pico":return PICO_BASE+"kitten_tts_2_pico_"+language+"_int4.onnx";
  default:return "";
 }
}
async function hasCachedTinyModel(language:string){
 if(!("caches" in window))return false;
 const url=modelUrl(language);if(!url)return false;
 try{
  if(await(await caches.open(MODEL_CACHE)).match(url))return true;
  const names=await caches.keys();
  for(const name of ["koolo-tts-distilled-v1","koolo-light-tts-research-v1"])if(names.includes(name)&&await(await caches.open(name)).match(url))return true;
  return false;
 }catch{return false}
}
function requestPersistentStorage(){
 if(persistenceRequested)return;
 try{
  const storage=navigator.storage;
  if(typeof storage?.persist!=="function")return;
  persistenceRequested=true;
  void Promise.resolve(storage.persist()).catch(()=>{});
 }catch{}
}
// Keep only one live model worker; switching languages frees the old ONNX/WASM
// memory while Cache Storage retains weights and dictionaries.
function discardWorker(reason:string){
 worker?.terminate();worker=null;workerLanguage="";ready.clear();warming.clear();
 for(const task of pending.values())task.reject(new Error(reason));
 pending.clear();
}
function getWorker(language:string):Worker{
 const key=modelLanguage(language);
 if(worker&&workerLanguage===key)return worker;
 if(worker)discardWorker("LEARNING_SPEECH_LANGUAGE_CHANGED");
 if(typeof Worker==="undefined")throw Error("WORKER_UNAVAILABLE");
 const created=preferredLearningEngine(language)==="pico"
  ?new Worker(new URL("./learningSpeech.worker.ts",import.meta.url),{type:"classic"})
  :new Worker(new URL("./learningSpeech.selected.worker.js",import.meta.url),{type:"classic"});
 created.onmessage=(event:MessageEvent<WorkerReply>)=>{
  const reply=event.data,task=pending.get(reply.id);if(!task||worker!==created)return;
  pending.delete(reply.id);
  if(reply.ok)task.resolve(reply);else task.reject(new Error(reply.error||"TINY_WORKER_FAILED"));
 };
 created.onerror=()=>{if(worker===created)discardWorker("TINY_WORKER_FAILED")};
 worker=created;workerLanguage=key;return created;
}
function requestWorker(message:Omit<WorkerRequest,"id">):Promise<WorkerReply>{
 return new Promise<WorkerReply>((resolve,reject)=>{
  let id=0;
  try{
   const instance=getWorker(message.language);id=++requestId;
   const timer=setTimeout(()=>{if(pending.has(id)&&worker===instance)discardWorker("LEARNING_SPEECH_TIMEOUT")},message.type==="prepare"?300000:90000);
   pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value)},reject:error=>{clearTimeout(timer);reject(error)}});
   instance.postMessage({...message,id});
  }catch(error){const task=pending.get(id);pending.delete(id);const reason=error instanceof Error?error:new Error(String(error));if(task)task.reject(reason);else reject(reason)}
 });
}
function ensureTiny(language:string):Promise<void>{
 if(ready.has(modelLanguage(language)))return Promise.resolve();
 const key=modelLanguage(language),existing=warming.get(key);if(existing)return existing;
 const task=requestWorker({type:"prepare",language}).then(()=>{
  if(warming.get(key)===task){ready.add(key);warming.delete(key);requestPersistentStorage()}
 }).catch(error=>{if(warming.get(key)===task)warming.delete(key);throw error});
 warming.set(key,task);
 return task;
}
async function generateTiny(text:string,language:string,speed:LearningSpeechSpeed,keepStart:boolean){
 const reply=await requestWorker({type:"generate",language,text,speed,keepStart});
 if(!reply.buffer)throw Error("TINY_EMPTY_AUDIO");
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
 if(language==="en"||language==="en-US"){await speakText(text,{speed});return}
 if("speechSynthesis" in window){
  const utterance=new SpeechSynthesisUtterance(text);utterance.lang=LANG_TAG[language]||language;utterance.rate=speed==="slow"?0.78:1;
  const voices=window.speechSynthesis.getVoices(),prefix=(LANG_TAG[language]||language).toLowerCase().split("-")[0];
  utterance.voice=voices.find(item=>item.lang.toLowerCase().startsWith(prefix))||null;
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
 cleanupLegacyKokoroCache();
 const id=playbackId,language=normalizeLearningLanguage(languageValue),speed=options.speed||"normal",preferred=preferredLearningEngine(language);
 const key=cacheKey(value,language,speed,preferred),cached=generated.get(key);
 if(preferred!=="system"&&!cached&&!ready.has(modelLanguage(language))){
  const hit=await hasCachedTinyModel(language);
  if(id!==playbackId)return{engine:"system",language,cached:false};
  // Cache hits still require ONNX/WASM initialisation; never block the first tap.
  if(!hit)options.onModelStatus?.("loading",language);
  void ensureTiny(language).catch(error=>{
   console.warn("[learning-speech] Local model could not initialise",error);
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
    if(index+1<chunks.length){next=generateTiny(chunks[index+1],language,speed,false);void next.catch(()=>{})}
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
