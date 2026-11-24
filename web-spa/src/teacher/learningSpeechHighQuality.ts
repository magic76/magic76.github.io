import {learningSpeechRoute} from "./learningSpeechRoutes";

type Reply={id:number;ok:boolean;buffer?:ArrayBuffer;error?:string};
type Request={id:number;type:"prepare"|"generate";language:string;text?:string;speed?:"normal"|"slow";webgpu?:boolean};
export type HighQualityStatus="idle"|"loading"|"ready";
const STORAGE_KEY="koolo-kokoro-optin-v1";
const MODEL_CACHE="transformers-cache";
const ASSET_CACHE="koolo-learning-speech-v1";
const BASE_MODEL="onnx-community/Kokoro-82M-v1.0-ONNX";
const ZH_MODEL="onnx-community/Kokoro-82M-v1.1-zh-ONNX";
const prepared=new Set<string>();
const sessionConsent=new Set<string>();
const preparing=new Map<string,Promise<void>>();
const importing=new Map<string,Promise<void>>();
const listeners=new Set<()=>void>();
const pending=new Map<number,{worker:Worker;resolve:(reply:Reply)=>void;reject:(error:Error)=>void}>();
let worker:Worker|null=null;
let requestId=0;
let useMain=false;
let disabledGpu=false;
let gpuProbe:Promise<boolean>|null=null;
let persistentRequested=false;

function languageKey(language:string){
 const route=learningSpeechRoute(language);
 if(route.engine!=="kokoro")return "";
 return language.toLowerCase().startsWith("en")?"en":language.toLowerCase().split("-")[0];
}
function grantList():string[]{
 try{return (localStorage.getItem(STORAGE_KEY)||"").split(",").filter(Boolean)}
 catch{return []}
}
function hasConsent(language:string){
 const key=languageKey(language);
 return Boolean(key&&(sessionConsent.has(key)||grantList().includes(key)));
}
function saveConsent(language:string,enabled:boolean){
 const key=languageKey(language);if(!key)return;
 const grants=new Set(grantList());
 if(enabled){grants.add(key);sessionConsent.add(key)}
 else{grants.delete(key);sessionConsent.delete(key)}
 try{
  if(grants.size)localStorage.setItem(STORAGE_KEY,[...grants].join(","));
  else localStorage.removeItem(STORAGE_KEY);
 }catch{}
}
function notify(){for(const listener of listeners)listener()}
export function subscribeHighQuality(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener)}}
async function webGpuAvailable(){
 if(disabledGpu)return false;
 if(!gpuProbe)gpuProbe=(async()=>{
  try{
   const gpu=(navigator as Navigator&{gpu?:{requestAdapter:()=>Promise<unknown>}}).gpu;
   return Boolean(await gpu?.requestAdapter());
  }catch{return false}
 })();
 return (await gpuProbe)&&!disabledGpu;
}
function modelId(language:string){return learningSpeechRoute(language).model==="zh"?ZH_MODEL:BASE_MODEL}
function modelFilename(language:string,gpu:boolean){
 return learningSpeechRoute(language).model==="zh"||gpu?"model.onnx":"model_quantized.onnx";
}
async function hasCachedWeights(language:string,gpu:boolean){
 if(typeof caches==="undefined")return false;
 const model=modelId(language),filename=modelFilename(language,gpu);
 try{
  const cache=await caches.open(MODEL_CACHE);
  const url="https://huggingface.co/"+model+"/resolve/main/onnx/"+filename;
  if(await cache.match(url))return true;
  return (await cache.keys()).some(request=>{
   try{
    const path=new URL(request.url).pathname;
    return path.includes("/"+model+"/")&&path.endsWith("/onnx/"+filename);
   }catch{return false}
  });
 }catch{return false}
}
function markerUrl(language:string,gpu:boolean){
 const key=languageKey(language),runtime=gpu?"fp32":"q8";
 return new URL("/__learning-speech-optin/"+key+"-"+runtime,location.origin).href;
}
async function cachedImport(language:string){
 const gpu=await webGpuAvailable();
 if(!await hasCachedWeights(language,gpu))return false;
 try{return Boolean(await(await caches.open(ASSET_CACHE)).match(markerUrl(language,gpu)))}
 catch{return false}
}
async function persistStorage(){
 if(persistentRequested)return;
 persistentRequested=true;
 try{await navigator.storage?.persist?.()}catch{}
}
function getWorker():Worker{
 if(worker)return worker;
 if(typeof Worker==="undefined")throw Error("KOKORO_WORKER_UNAVAILABLE");
 const created=new Worker(new URL("./learningSpeech.kokoro.worker.ts",import.meta.url),{type:"module"});
 created.onmessage=(event:MessageEvent<Reply>)=>{
  const reply=event.data,task=pending.get(reply.id);
  if(!task||task.worker!==created)return;
  pending.delete(reply.id);
  if(reply.ok)task.resolve(reply);
  else task.reject(new Error(reply.error||"KOKORO_WORKER_ERROR"));
 };
 created.onerror=()=>{
  if(worker!==created)return;
  worker=null;prepared.clear();
  for(const [id,task] of pending)if(task.worker===created){
   task.reject(new Error("KOKORO_WORKER_ERROR"));pending.delete(id);
  }
  created.terminate();notify();
 };
 worker=created;return created;
}
function requestWorker(data:Omit<Request,"id">):Promise<Reply>{
 return new Promise((resolve,reject)=>{
  try{
   const instance=getWorker(),id=++requestId;
   pending.set(id,{worker:instance,resolve,reject});
   instance.postMessage({...data,id});
  }catch(error){reject(error instanceof Error?error:new Error(String(error)))}
 });
}
function prepare(language:string):Promise<void>{
 if(prepared.has(language))return Promise.resolve();
 const prior=preparing.get(language);if(prior)return prior;
 const task=(async()=>{
  const run=async(gpu:boolean)=>{
   if(useMain)await (await import("./learningSpeechKokoro")).prepareKokoro(language,gpu);
   else await requestWorker({type:"prepare",language,webgpu:gpu});
  };
  const gpu=await webGpuAvailable();
  try{await run(gpu)}
  catch(error){
   if(gpu){
    console.warn("[learning-speech] WebGPU failed, retrying WASM q8",error);
    disabledGpu=true;prepared.clear();
    try{await run(false)}
    catch(wasmError){
     if(useMain)throw wasmError;
     useMain=true;
     await run(false);
    }
   }else{
    if(useMain)throw error;
    console.warn("[learning-speech] Kokoro worker failed, using main runtime",error);
    useMain=true;
    await run(false);
   }
  }
  prepared.add(language);
  await persistStorage();
 })().finally(()=>{preparing.delete(language);notify()});
 preparing.set(language,task);
 return task;
}
export async function highQualityStatus(language:string):Promise<HighQualityStatus>{
 if(!languageKey(language))return "idle";
 if(importing.has(languageKey(language)))return "loading";
 if(!hasConsent(language))return "idle";
 if(prepared.has(language))return "ready";
 if(await cachedImport(language))return "ready";
 saveConsent(language,false);
 return "idle";
}
export function importHighQuality(language:string):Promise<void>{
 const key=languageKey(language);
 if(!key)return Promise.reject(new Error("KOKORO_UNSUPPORTED_LANGUAGE"));
 const active=importing.get(key);if(active)return active;
 const task=(async()=>{
  await prepare(language);
  const gpu=await webGpuAvailable();
  const stored=await hasCachedWeights(language,gpu);
  if(stored&&typeof caches!=="undefined")try{
   await(await caches.open(ASSET_CACHE)).put(markerUrl(language,gpu),new Response("ready"));
  }catch{}
  // Enable the current session even if the browser refused persistent caching.
  // On reload, cachedImport rejects absent markers before any model request.
  saveConsent(language,true);
 })().catch(error=>{
  console.warn("[learning-speech] Optional Kokoro import failed",error);
  throw error;
 }).finally(()=>{importing.delete(key);notify()});
 importing.set(key,task);notify();
 return task;
}
/** On reload, verify the exact fp32/q8 weight and the successful-import marker before warming. */
export async function highQualityReadyOrWarm(language:string):Promise<boolean>{
 if(!hasConsent(language))return false;
 if(prepared.has(language))return true;
 if(importing.has(languageKey(language)))return false;
 if(!await cachedImport(language)){
  saveConsent(language,false);notify();return false;
 }
 void prepare(language).catch(error=>console.warn("[learning-speech] Optional Kokoro warm-up failed",error));
 return false; // Use the original voice on this tap; do not block playback.
}
export async function generateHighQuality(text:string,language:string,speed:"normal"|"slow"):Promise<Blob>{
 if(!prepared.has(language)||!hasConsent(language))throw Error("KOKORO_NOT_READY");
 const gpu=await webGpuAvailable();
 if(useMain)return (await import("./learningSpeechKokoro")).generateKokoro(text,language,speed,gpu);
 try{
  const reply=await requestWorker({type:"generate",text,language,speed,webgpu:gpu});
  if(!reply.buffer)throw Error("KOKORO_EMPTY_AUDIO");
  return new Blob([reply.buffer],{type:"audio/wav"});
 }catch(error){
  console.warn("[learning-speech] Kokoro worker playback failed",error);
  useMain=true;
  return (await import("./learningSpeechKokoro")).generateKokoro(text,language,speed,gpu);
 }
}
export async function removeHighQuality(language:string){
 const key=languageKey(language);if(!key||importing.has(key))return;
 saveConsent(language,false);prepared.delete(language);
 if(typeof caches!=="undefined")try{
  const assets=await caches.open(ASSET_CACHE);
  await Promise.all([assets.delete(markerUrl(language,true)),assets.delete(markerUrl(language,false))]);
  const other=grantList().some(item=>modelId(item)===modelId(language));
  if(!other){
   const cache=await caches.open(MODEL_CACHE),model=modelId(language);
   for(const request of await cache.keys())if(request.url.includes("/"+model+"/"))await cache.delete(request);
   if(!grantList().length)await caches.delete("kokoro-voices");
  }
 }catch(error){console.warn("[learning-speech] Optional Kokoro cache cleanup failed",error)}
 notify();
}
