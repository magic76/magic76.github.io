import {TARGET_LANGUAGES} from "./targetLanguages";
import {speakText} from "../lib/deviceCapabilities";

export type LearningSpeechSpeed="normal"|"slow";
export type LearningSpeechMode="word"|"phrase"|"sentence";
export type LearningSpeechEngine="kokoro"|"pico"|"system";
export type LearningSpeechResult={engine:LearningSpeechEngine;language:string;cached:boolean};

const KOKORO_URL="https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js";
const KOKORO_MODEL="onnx-community/Kokoro-82M-v1.0-ONNX";
const ORT_JS="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/ort.min.js";
const ORT_BASE="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/";
const PAKO_URL="https://esm.sh/pako@2.1.0";
const UCCHARAN_BASE="https://cdn.jsdelivr.net/npm/uccharan@1.0.0/";
const UCCHARAN_URL=UCCHARAN_BASE+"index.js";
const PICO_BASE="https://huggingface.co/KittenML/kitten-tts-2-pico/resolve/main/";
const PICO_LANGUAGES=new Set(["de","es","fr","it","pt"]);
const LANG_TAG:Record<string,string>={en:"en-US",es:"es-ES",fr:"fr-FR",de:"de-DE",it:"it-IT",pt:"pt-BR",ja:"ja-JP",ko:"ko-KR",vi:"vi-VN",th:"th-TH",zh:"zh-TW",id:"id-ID",ru:"ru-RU",hi:"hi-IN"};

type RawVoice={rows:number;cols:number;data:Float32Array};
type TinyEngine={session:any;ort:any;phonemize:(text:string,options?:any)=>Promise<string>|string;vocab:Record<string,number>;voices:Record<string,RawVoice>};
const generated=new Map<string,Blob>();
const scripts=new Map<string,Promise<void>>();
const tinyEngines=new Map<string,Promise<TinyEngine>>();
let kokoroPromise:Promise<any>|null=null;
let kokoroReady=false;
let persistenceRequested=false;
let currentAudio:HTMLAudioElement|null=null;
let currentUrl="";

const importExternal=(url:string)=>import(/* @vite-ignore */ url) as Promise<any>;

export function normalizeLearningLanguage(value:string):string{
 const normalized=String(value||"").trim();
 return TARGET_LANGUAGES.find(item=>item.code===normalized||item.value===normalized||item.spoken===normalized)?.code||(/^[a-z]{2}(?:-[A-Z]{2})?$/.test(normalized)?normalized.split("-")[0]:"en");
}
export function preferredLearningEngine(value:string):LearningSpeechEngine{
 const code=normalizeLearningLanguage(value);
 if(code==="en")return"kokoro";
 if(PICO_LANGUAGES.has(code))return"pico";
 return"system";
}
export function picoLearningLanguages(){return [...PICO_LANGUAGES]}

function cacheKey(text:string,language:string,speed:LearningSpeechSpeed,engine:LearningSpeechEngine){
 return [engine,language,speed,text.trim().toLocaleLowerCase()].join("|");
}
function remember(key:string,blob:Blob){
 generated.set(key,blob);
 if(generated.size>40)generated.delete(generated.keys().next().value as string);
}
function loadScript(url:string):Promise<void>{
 const prior=scripts.get(url);if(prior)return prior;
 const promise=new Promise<void>((resolve,reject)=>{
  const existing=[...document.scripts].find(script=>script.src===url);
  if(existing){if((window as any).ort||url!==ORT_JS){resolve();return}}
  const script=document.createElement("script");script.src=url;script.async=true;script.onload=()=>resolve();script.onerror=()=>reject(new Error("SCRIPT_LOAD_FAILED"));document.head.append(script);
 });
 scripts.set(url,promise);return promise;
}
function stopCurrentAudio(){
 if(currentAudio){currentAudio.pause();currentAudio.removeAttribute("src");currentAudio=null}
 if(currentUrl){URL.revokeObjectURL(currentUrl);currentUrl=""}
}
export function stopLearningSpeech(){
 stopCurrentAudio();
 try{window.speechSynthesis?.cancel()}catch{}
}
async function playBlob(blob:Blob):Promise<void>{
 stopLearningSpeech();
 currentUrl=URL.createObjectURL(blob);
 const audio=new Audio(currentUrl);currentAudio=audio;
 await new Promise<void>((resolve,reject)=>{
  const cleanup=()=>{audio.onended=null;audio.onerror=null};
  audio.onended=()=>{cleanup();resolve()};
  audio.onerror=()=>{cleanup();reject(new Error("AUDIO_PLAYBACK_FAILED"))};
  void audio.play().catch(error=>{cleanup();reject(error)});
 });
}

async function hasCachedModel(cacheName:string,match:(url:string)=>boolean):Promise<boolean>{
 if(!("caches" in window))return false;
 try{return(await(await caches.open(cacheName)).keys()).some(request=>match(request.url))}
 catch{return false}
}
function hasCachedKokoroModel(){
 return hasCachedModel("transformers-cache",url=>url.includes("Kokoro-82M-v1.0-ONNX")&&url.includes("/onnx/model_quantized.onnx"));
}
function hasCachedPicoModel(language:string){
 return hasCachedModel("koolo-learning-speech-v1",url=>url===PICO_BASE+"kitten_tts_2_pico_"+language+"_int4.onnx");
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
async function loadKokoro(){
 if(!kokoroPromise)kokoroPromise=(async()=>{
  const {KokoroTTS}=await importExternal(KOKORO_URL);
  // Learning calls are short; q8/WASM keeps the first download around 92 MB
  // instead of the ~326 MB fp32 WebGPU model used by the quality lab.
  return KokoroTTS.from_pretrained(KOKORO_MODEL,{device:"wasm",dtype:"q8"});
 })().then(tts=>{
  kokoroReady=true;
  void hasCachedKokoroModel().then(hit=>{if(hit)requestPersistentStorage()});
  return tts;
 }).catch(error=>{kokoroPromise=null;kokoroReady=false;throw error});
 return kokoroPromise;
}
async function kokoroBlob(text:string,speed:LearningSpeechSpeed){
 const tts=await loadKokoro();
 const audio=await tts.generate(text,{voice:"af_heart",speed:speed==="slow"?0.85:1});
 return audio.toBlob() as Blob;
}

async function fetchCached(url:string):Promise<Uint8Array>{
 const cacheName="koolo-learning-speech-v1";
 if("caches" in window){
  try{
   const cache=await caches.open(cacheName),hit=await cache.match(url);
   if(hit)return new Uint8Array(await hit.arrayBuffer());
   const response=await fetch(url);if(!response.ok)throw new Error("HTTP_"+response.status);
   try{await cache.put(url,response.clone())}catch{}
   return new Uint8Array(await response.arrayBuffer());
  }catch{}
 }
 const response=await fetch(url);if(!response.ok)throw new Error("HTTP_"+response.status);
 return new Uint8Array(await response.arrayBuffer());
}
function float16ToFloat(bits:number){
 const sign=(bits&0x8000)?-1:1,exp=(bits>>10)&0x1f,frac=bits&0x3ff;
 if(exp===0)return sign*Math.pow(2,-14)*(frac/1024);
 if(exp===31)return frac?NaN:sign*Infinity;
 return sign*Math.pow(2,exp-15)*(1+frac/1024);
}
function parseNPY(data:Uint8Array):RawVoice|null{
 if(data.length<10||data[0]!==0x93)return null;
 const view=new DataView(data.buffer,data.byteOffset,data.byteLength),major=data[6],base=major>=2?12:10;
 const headerLength=major>=2?view.getUint32(8,true):view.getUint16(8,true);
 const header=new TextDecoder().decode(data.slice(base,base+headerLength));
 const match=header.match(/shape[^\(]*\(([^\)]*)\)/);if(!match)return null;
 const shape=match[1].split(",").map(part=>Number(part.trim())).filter(Number.isFinite),start=base+headerLength;
 const isF16=header.includes("f2"),bytes=isF16?2:4,count=Math.floor((data.length-start)/bytes),floats=new Float32Array(count);
 const raw=new DataView(data.buffer,data.byteOffset+start,data.length-start),big=header.includes(">f");
 for(let i=0;i<count;i++)floats[i]=isF16?float16ToFloat(raw.getUint16(i*2,!big)):raw.getFloat32(i*4,!big);
 return{rows:shape.length>=2?shape[0]:1,cols:shape.length>=2?shape[1]:shape[0],data:floats};
}
async function parseNPZ(data:Uint8Array):Promise<Record<string,RawVoice>>{
 const {inflateRaw}=await importExternal(PAKO_URL),out:Record<string,RawVoice>={};
 const view=new DataView(data.buffer,data.byteOffset,data.byteLength),decoder=new TextDecoder();let offset=0;
 while(offset+30<=data.length&&view.getUint32(offset,true)===0x04034b50){
  const method=view.getUint16(offset+8,true),size=view.getUint32(offset+18,true),nameLength=view.getUint16(offset+26,true),extraLength=view.getUint16(offset+28,true);
  const nameStart=offset+30,dataStart=nameStart+nameLength+extraLength,dataEnd=dataStart+size;if(dataEnd>data.length)break;
  const name=decoder.decode(data.slice(nameStart,nameStart+nameLength));
  if(name.endsWith(".npy")){
   let raw=data.slice(dataStart,dataEnd);
   if(method===8)raw=inflateRaw(raw);else if(method!==0){offset=dataEnd;continue}
   const parsed=parseNPY(raw);if(parsed)out[name.slice(0,-4)]=parsed;
  }
  offset=dataEnd;
 }
 return out;
}
async function loadTiny(language:string):Promise<TinyEngine>{
 const prior=tinyEngines.get(language);if(prior)return prior;
 const promise=(async()=>{
  await loadScript(ORT_JS);
  const ort=(window as any).ort;if(!ort)throw new Error("ORT_UNAVAILABLE");
  ort.env.wasm.numThreads=1;ort.env.wasm.wasmPaths=ORT_BASE;
  const [{init,loadLanguage,phonemizeSync},model,voiceData,vocabData,wasm,pack]=await Promise.all([
   importExternal(UCCHARAN_URL),
   fetchCached(PICO_BASE+"kitten_tts_2_pico_"+language+"_int4.onnx"),
   fetchCached(PICO_BASE+"voices_"+language+".npz"),
   fetchCached(PICO_BASE+"vocab.json"),
   fetchCached(UCCHARAN_BASE+"dist/uccharan_wasm_bg.wasm"),
   fetchCached(UCCHARAN_BASE+"data/"+language+".ucd")
  ]);
  // Pass cached bytes directly: uccharan's async phonemize would fetch .ucd again.
  await init({wasm});
  await loadLanguage(language,pack);
  const voices=await parseNPZ(voiceData);
  const session=await ort.InferenceSession.create(model,{executionProviders:["wasm"],graphOptimizationLevel:"all",intraOpNumThreads:1});
  void hasCachedPicoModel(language).then(hit=>{if(hit)requestPersistentStorage()});
  return{session,ort,phonemize:phonemizeSync,vocab:JSON.parse(new TextDecoder().decode(vocabData)),voices};
 })().catch(error=>{tinyEngines.delete(language);throw error});
 tinyEngines.set(language,promise);return promise;
}
function encodeTiny(phonemes:string,vocab:Record<string,number>){
 const ids:number[]=[];for(const ch of phonemes){if(Object.prototype.hasOwnProperty.call(vocab,ch))ids.push(vocab[ch]);else if((ch==="("||ch===")")&&vocab[","]!==undefined)ids.push(vocab[","])}
 return[0,...ids,10,0];
}
function trimTiny(samples:Float32Array,durations:number[]){
 let output=samples;
 if(durations.length){
  const total=durations.reduce((sum,value)=>sum+value,0),spf=Math.max(1,Math.round(output.length/Math.max(total,1)));
  const lead=Math.max(0,(durations[0]-1)*spf),trail=Math.max(0,(durations[durations.length-1]-1)*spf);
  if(lead+trail+spf<output.length)output=output.slice(lead,trail?output.length-trail:undefined);
 }
 const copy=new Float32Array(output),fade=Math.min(120,Math.floor(copy.length/8));
 for(let i=0;i<fade;i++){const gain=i/Math.max(1,fade-1);copy[i]*=gain;copy[copy.length-1-i]*=gain}
 return copy;
}
function wavBlob(samples:Float32Array,rate=24000){
 const buffer=new ArrayBuffer(44+samples.length*2),view=new DataView(buffer);
 const write=(offset:number,value:string)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i))};
 write(0,"RIFF");view.setUint32(4,36+samples.length*2,true);write(8,"WAVE");write(12,"fmt ");view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);write(36,"data");view.setUint32(40,samples.length*2,true);
 for(let i=0;i<samples.length;i++){const value=Math.max(-1,Math.min(1,samples[i]));view.setInt16(44+i*2,value<0?value*32768:value*32767,true)}
 return new Blob([buffer],{type:"audio/wav"});
}
async function picoBlob(text:string,language:string,speed:LearningSpeechSpeed){
 const engine=await loadTiny(language);
 const phonemes=String(await engine.phonemize(text,{lang:language,profile:"kitten"}));
 const tokens=encodeTiny(phonemes,engine.vocab);if(tokens.length<4||tokens.length>353)throw new Error("PICO_INPUT_UNSUPPORTED");
 const voice=engine.voices[Object.keys(engine.voices)[0]];if(!voice)throw new Error("PICO_VOICE_UNAVAILABLE");
 const row=Math.min(tokens.length-1,voice.rows-1),style=voice.data.slice(row*voice.cols,(row+1)*voice.cols);
 const feeds={
  input_ids:new engine.ort.Tensor("int64",BigInt64Array.from(tokens.map(value=>BigInt(value))),[1,tokens.length]),
  style:new engine.ort.Tensor("float32",style,[1,style.length]),
  speed:new engine.ort.Tensor("float32",Float32Array.of(speed==="slow"?0.85:1),[1])
 };
 const values=Object.values(await engine.session.run(feeds)) as any[];
 const waveform=values.find(value=>value?.data instanceof Float32Array),duration=values.find(value=>value?.data instanceof BigInt64Array||value?.data instanceof Int32Array||value?.data instanceof Uint32Array);
 if(!waveform)throw new Error("PICO_EMPTY_AUDIO");
 const durations=duration?Array.from(duration.data as ArrayLike<number|bigint>,value=>typeof value==="bigint"?Number(value):Number(value)):[];
 return wavBlob(trimTiny(new Float32Array(waveform.data),durations));
}
async function systemSpeak(text:string,language:string,speed:LearningSpeechSpeed):Promise<void>{
 stopLearningSpeech();
 // Preserve Koolo Android native TTS as the English fallback.
 if(language==="en"){await speakText(text,{speed});return}
 if("speechSynthesis" in window){
  const utterance=new SpeechSynthesisUtterance(text);utterance.lang=LANG_TAG[language]||language;utterance.rate=speed==="slow"?0.78:1;
  const voices=window.speechSynthesis.getVoices(),prefix=(LANG_TAG[language]||language).toLowerCase().split("-")[0];
  utterance.voice=voices.find(item=>item.lang.toLowerCase().startsWith(prefix))||null;
  await new Promise<void>((resolve,reject)=>{utterance.onend=()=>resolve();utterance.onerror=event=>event.error==="canceled"||event.error==="interrupted"?resolve():reject(new Error(event.error));window.speechSynthesis.speak(utterance)});
  return;
 }
 await speakText(text,{speed});
}

export async function speakLearningText(text:string,languageValue:string,options:{speed?:LearningSpeechSpeed;mode?:LearningSpeechMode;onModelStatus?:(status:"loading"|"ready")=>void}={}):Promise<LearningSpeechResult>{
 const value=text.trim();if(!value)throw new Error("EMPTY_SPEECH_TEXT");
 const language=normalizeLearningLanguage(languageValue),speed=options.speed||"normal",preferred=preferredLearningEngine(language);
 const key=cacheKey(value,language,speed,preferred),cached=generated.get(key);
 if(preferred==="kokoro"&&!kokoroReady){
  if(await hasCachedKokoroModel()){
   // A warm Cache Storage hit needs WASM initialisation, not another 88 MB download.
   try{await loadKokoro();options.onModelStatus?.("ready")}
   catch(error){
    console.warn("[learning-speech] cached Kokoro could not initialise",error);
    await systemSpeak(value,language,speed);
    return{engine:"system",language,cached:false};
   }
  }else{
   options.onModelStatus?.("loading");
   void loadKokoro().then(()=>options.onModelStatus?.("ready")).catch(()=>{});
   await systemSpeak(value,language,speed);
   return{engine:"system",language,cached:false};
  }
 }
 try{
  if(cached){await playBlob(cached);return{engine:preferred,language,cached:true}}
  if(preferred==="kokoro"){
   const blob=await kokoroBlob(value,speed);remember(key,blob);await playBlob(blob);return{engine:"kokoro",language,cached:false};
  }
  if(preferred==="pico"){
   const blob=await picoBlob(value,language,speed);remember(key,blob);await playBlob(blob);return{engine:"pico",language,cached:false};
  }
 }catch(error){
  console.warn("[learning-speech] local neural TTS fell back to system voice",error);
 }
 await systemSpeak(value,language,speed);return{engine:"system",language,cached:false};
}
