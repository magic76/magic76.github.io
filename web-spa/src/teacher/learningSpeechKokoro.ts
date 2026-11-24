import {learningSpeechRoute} from "./learningSpeechRoutes";
const KOKORO_URL="https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js";
const MODEL_ID="onnx-community/Kokoro-82M-v1.0-ONNX";
const ZH_URL="https://cdn.jsdelivr.net/npm/@uzen/kokoro-js@1.2.4/dist/kokoro.web.js";
const ZH_MODEL="onnx-community/Kokoro-82M-v1.1-zh-ONNX";
const JA_URL="https://cdn.jsdelivr.net/npm/kokoro-js-jp@0.2.0/dist/kokoro-jp.web.js";
const G2P_BASE="https://cdn.jsdelivr.net/npm/uccharan@1.0.0/";
const G2P_URL=G2P_BASE+"index.js";
const CACHE="koolo-learning-speech-v1";
const engines=new Map<string,Promise<any>>();
const loadedG2P=new Map<string,Promise<void>>();
let g2pPromise:Promise<any>|null=null;
const importExternal=(url:string)=>import(/* @vite-ignore */ url) as Promise<any>;
async function fetchG2PAsset(path:string){
 const url=G2P_BASE+path;
 const cache=typeof caches!=="undefined"?await caches.open(CACHE).catch(()=>null):null;
 const hit=await cache?.match(url);
 if(hit)return new Uint8Array(await hit.arrayBuffer());
 const res=await fetch(url);
 if(!res.ok)throw Error("G2P_HTTP_"+res.status);
 if(cache)await cache.put(url,res.clone()).catch(()=>{});
 return new Uint8Array(await res.arrayBuffer());
}
async function loadG2P(language:string){
 if(!g2pPromise)g2pPromise=(async()=>{
  const [mod,wasm]=await Promise.all([importExternal(G2P_URL),fetchG2PAsset("dist/uccharan_wasm_bg.wasm")]);
  await mod.init({wasm});return mod;
 })().catch(e=>{g2pPromise=null;throw e});
 const mod=await g2pPromise;
 if(!loadedG2P.has(language)){
  const pending=(async()=>{const pack=await fetchG2PAsset("data/"+language+".ucd");await mod.loadLanguage(language,pack)})().catch(e=>{loadedG2P.delete(language);throw e});
  loadedG2P.set(language,pending);
 }
 await loadedG2P.get(language);return mod;
}
async function loadModel(model:string,webgpu:boolean){
 const device=webgpu?"webgpu":"wasm",dtype=webgpu?"fp32":"q8",key=model+"|"+device;
 if(!engines.has(key)){
  const pending=(async()=>{
   if(model==="zh"){
    const {KokoroTTS}=await importExternal(ZH_URL);
    return KokoroTTS.from_pretrained(ZH_MODEL,{device,dtype:"fp32",voicePath:"https://huggingface.co/"+ZH_MODEL+"/resolve/main/voices"});
   }
   if(model==="ja"){
    const {KokoroJP}=await importExternal(JA_URL);
    return KokoroJP.load({modelId:MODEL_ID,device,dtype});
   }
   const {KokoroTTS}=await importExternal(KOKORO_URL);
   return KokoroTTS.from_pretrained(MODEL_ID,{device,dtype});
  })().catch(e=>{engines.delete(key);throw e});
  engines.set(key,pending);
 }
 return engines.get(key)!;
}
export async function prepareKokoro(language:string,webgpu:boolean){
 const route=learningSpeechRoute(language);
 if(route.engine!=="kokoro"||!route.model)throw Error("KOKORO_UNSUPPORTED");
 const tts=await loadModel(route.model,webgpu);
 if(route.g2p)await loadG2P(route.g2p);
 return tts;
}
export async function generateKokoro(text:string,language:string,speed:"normal"|"slow",webgpu:boolean):Promise<Blob>{
 const route=learningSpeechRoute(language),tts=await prepareKokoro(language,webgpu),rate=speed==="slow"?0.85:1;
 let audio;
 if(route.model==="ja")audio=await tts.speak(text,route.voice,rate);
 else if(route.g2p){
  const mod=await loadG2P(route.g2p);
  const p=String(mod.phonemizeSync(text,{lang:route.g2p,profile:"kokoro"})).trim();
  if(!p)throw Error("EMPTY_PHONEMES");
  const {input_ids}=tts.tokenizer(p,{truncation:false});
  if(input_ids.dims.at(-1)>511||input_ids.dims.at(-1)<3)throw Error("PHONEME_LENGTH");
  audio=await tts.generate_from_ids(input_ids,{voice:route.voice,speed:rate});
 }else audio=await tts.generate(text,{voice:route.voice,speed:rate});
 if(!audio?.audio?.length||!audio.audio.some((x:number)=>Number.isFinite(x)&&x!==0)||!audio.audio.every(Number.isFinite))throw Error("EMPTY_AUDIO");
 const blob=audio.toBlob();if(!blob||blob.size<=44)throw Error("EMPTY_AUDIO");
 return blob;
}
