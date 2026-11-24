/* Browser-only learning speech: Paradee INT8, Kitten Mini INT4, eeh-1. */
const CDN="https://cdn.jsdelivr.net/npm/",ORT=CDN+"onnxruntime-web@1.24.3/dist/",UC=CDN+"uccharan@1.0.0/",HF="https://huggingface.co/";
const PARA=HF+"sahilmahendrakar/Paradee-8M-v1.3/resolve/main/";
let engine,model,ort,g2p;
const ORT_BASES=[ORT,"https://unpkg.com/onnxruntime-web@1.24.3/dist/"];
const importModule=url=>import(/* @vite-ignore */ url);const langs=new Set();
function status(_text){}
// Selected Lab assets move into the existing learning-speech cache on demand.
const CACHE="koolo-learning-speech-v1",LEGACY_CACHES=["koolo-tts-distilled-v1","koolo-light-tts-research-v1"];
async function bytes(url){
 let cache;
 try{
  cache=await caches.open(CACHE);
  let hit=await cache.match(url);
  if(!hit){const names=await caches.keys();for(const name of LEGACY_CACHES){if(!names.includes(name))continue;hit=await(await caches.open(name)).match(url);if(hit){try{await cache.put(url,hit.clone())}catch{}break}}}
  if(hit)return new Uint8Array(await hit.arrayBuffer());
 }catch{}
 let error;
 for(let attempt=0;attempt<2;attempt++)try{
  const response=await fetch(url);if(!response.ok)throw Error("HTTP "+response.status+" "+url);
  const copy=response.clone(),data=new Uint8Array(await response.arrayBuffer());if(!data.length)throw Error("Empty asset "+url);
  try{await cache?.put(url,copy)}catch{}
  return data;
 }catch(e){error=e}
 throw error;
}
async function importRetry(url){
 try{return await importModule(url)}catch{const retry=new URL(url);retry.searchParams.set("learning-speech-retry","1");return importModule(retry.href)}
}
async function loadRuntime(load=importModule,bases=ORT_BASES,report=status,verify=async()=>{}){
 const errors=[];
 for(const base of bases){
  const url=base+"ort.wasm.min.mjs";
  try{
   report("載入 ONNX WASM · "+new URL(base).hostname);
   const mod=await load(url),api=mod.InferenceSession?mod:mod.default;
   if(!api?.InferenceSession||!api?.Tensor||!api?.env?.wasm)throw Error("ONNX ESM exports 不完整");
   api.env.wasm.numThreads=1;api.env.wasm.proxy=false;
   // JS, WASM and glue must all be from the same pinned distribution.
   api.env.wasm.wasmPaths=base;
   await verify(api);
   return api;
  }catch(e){errors.push(new URL(base).hostname+": "+(e.message||String(e)))}
 }
 throw Error("ONNX WASM runtime 載入失敗："+errors.join("；"));
}
async function phonemes(text,voice,profile){
 const lang=voice.startsWith("b")?"en-gb":"en-us";
 if(!g2p){g2p=await importRetry(UC+"index.js");await g2p.init({wasm:await bytes(UC+"dist/uccharan_wasm_bg.wasm"),dataBaseUrl:UC+"data/"})}
 if(!langs.has(lang)){await g2p.loadLanguage(lang,await bytes(UC+"data/"+lang+".ucd"));langs.add(lang)}
 // Async API also loads the Kokoro/Misaki lexicon where needed. Never apply a second eSpeak conversion.
 return String(await g2p.phonemize(text,{lang,profile})).trim()
}
function parseNPY(data){
 const view=new DataView(data.buffer,data.byteOffset,data.byteLength),major=data[6],base=major>=2?12:10;
 const len=major>=2?view.getUint32(8,true):view.getUint16(8,true),header=new TextDecoder().decode(data.slice(base,base+len)),shape=header.match(/shape[^\(]*\(([^\)]*)\)/);
 if(!shape)throw Error("無效的 voice pack");const dims=shape[1].split(",").map(x=>Number(x.trim())).filter(n=>n>0);
 const half=header.includes("f2"),width=half?2:4;
 if((!half&&!header.includes("f4"))||dims.length!==2)throw Error("不支援的 voice pack 格式");
 const start=base+len,raw=new DataView(data.buffer,data.byteOffset+start,data.length-start),floats=new Float32Array(raw.byteLength/width),little=!header.includes(">f");
 for(let i=0;i<floats.length;i++){if(!half){floats[i]=raw.getFloat32(i*4,little);continue}const bits=raw.getUint16(i*2,little),sign=bits&0x8000?-1:1,exp=(bits>>10)&31,frac=bits&1023;floats[i]=exp===0?sign*2**-14*frac/1024:exp===31?NaN:sign*2**(exp-15)*(1+frac/1024)}
 if(floats.length!==dims[0]*dims[1]||!floats.every(Number.isFinite))throw Error("voice pack 資料不完整");return{rows:dims[0],cols:dims[1],data:floats}
}
async function parseNPZ(data){
 const {inflateRaw}=await importRetry(CDN+"pako@2.1.0/dist/pako.esm.mjs"),out={},view=new DataView(data.buffer,data.byteOffset,data.byteLength),dec=new TextDecoder();let off=0;
 while(off+30<=data.length&&view.getUint32(off,true)===0x04034b50){const method=view.getUint16(off+8,true),size=view.getUint32(off+18,true),nl=view.getUint16(off+26,true),xl=view.getUint16(off+28,true),ds=off+30+nl+xl,de=ds+size;if(de>data.length||!size)throw Error("無效的 NPZ");const name=dec.decode(data.slice(off+30,off+30+nl));if(name.endsWith(".npy")){let raw=data.slice(ds,de);if(method===8)raw=inflateRaw(raw);else if(method!==0)throw Error("不支援的 NPZ 壓縮");out[name.slice(0,-4)]=parseNPY(raw)}off=de}return out
}
const json=async url=>JSON.parse(new TextDecoder().decode(await bytes(url)));
async function session(url,expectedSize){
 status("下載或讀取模型快取…");const data=await bytes(url);if(expectedSize&&data.byteLength!==expectedSize)throw Error("模型下載不完整："+data.byteLength+" / "+expectedSize+" bytes");let result;
 ort=await loadRuntime(importModule,ORT_BASES,status,async api=>{
  status("建立 WASM 推論環境…"+new URL(api.env.wasm.wasmPaths).hostname);
  result=await api.InferenceSession.create(data,{executionProviders:["wasm"],intraOpNumThreads:1,graphOptimizationLevel:"all"});
 });
 return result
}
const KOREAN_VOICE="seoyeon";
// Full eSpeak NG build (including the Korean dictionary), from the upstream
// browser demo at a pinned revision. Only the Korean model requests these assets.
const FULL_ESPEAK=HF+"spaces/csukuangfj/piper-phonemize/resolve/29c4a1977913f70e282d8328e87f54100672bf17/";
const ESPEAK_FILE="piper-phonemize-wasm-main";
let espeakPromise;
function espeakSentences(api,text,voice){
 const alloc=value=>{const size=api.lengthBytesUTF8(value)+1,p=api._malloc(size);if(!p)throw Error("eSpeak 記憶體不足");api.stringToUTF8(value,p,size);return p};
 let tp=0,vp=0,result=0;
 try{
  tp=alloc(text);vp=alloc(voice);result=api._PiperPhonemizeText(tp,vp);
  if(!result)throw Error("eSpeak 音素轉換失敗："+voice);
  const n=api._PiperPhonemizeResultGetNumSentences(result),sentences=[];
  if(n<1||n>1000)throw Error("eSpeak 句子數量不符");
  for(let i=0;i<n;i++){
   const count=api._PiperPhonemizeResultGetNumPhonemes(result,i),ptr=api._PiperPhonemizeResultGetPhonemes(result,i);
   if(count<0||count>10000||(!ptr&&count))throw Error("eSpeak 音素資料不符");
   if(count)sentences.push(Array.from(api.HEAPU32.subarray(ptr>>>2,(ptr>>>2)+count),code=>String.fromCodePoint(code)).join(""));
  }
  if(!sentences.length||!sentences.join("").trim())throw Error("eSpeak 未產生音素："+voice);
  return sentences;
 }finally{if(result)api._PiperPhonemizeDestroyResult(result);if(tp)api._free(tp);if(vp)api._free(vp)}
}
async function fullEspeak(){
 status("準備完整韓文發音字典（約 18 MB，首次下載）…");
 const [script,wasm,dict]=await Promise.all([".js",".wasm",".data"].map(ext=>bytes(FULL_ESPEAK+ESPEAK_FILE+ext)));
 const source=new TextDecoder().decode(script);
 if(!source.includes("Module")||!source.includes("wasm"))throw Error("完整 eSpeak JS 資源格式不符");
 if(wasm[0]!==0||wasm[1]!==97||wasm[2]!==115||wasm[3]!==109||dict.byteLength<1000000)throw Error("完整 eSpeak WASM 或字典資源不完整");
 const url=URL.createObjectURL(new Blob([script],{type:"text/javascript"}));
 try{
  return await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error("完整 eSpeak 初始化逾時")),90000);
   const fail=e=>{clearTimeout(timer);reject(e instanceof Error?e:Error(String(e)))};
   self.Module={
    locateFile:name=>FULL_ESPEAK+name,
    wasmBinary:wasm,
    getPreloadedPackage:(name,size)=>{if(!name.endsWith(".data")||dict.byteLength!==size)throw Error("eSpeak 字典大小不符："+name);return dict.buffer},
    onAbort:reason=>fail(Error("完整 eSpeak WASM："+reason)),
    onRuntimeInitialized(){
     try{
      const api=self.Module,dir="/usr/share/espeak-ng-data",size=api.lengthBytesUTF8(dir)+1,ptr=api._malloc(size);
      if(!ptr)throw Error("eSpeak 記憶體不足");
      let rate;try{api.stringToUTF8(dir,ptr,size);rate=api._PiperPhonemizeInitialize(ptr)}finally{api._free(ptr)}
      if(rate<=0)throw Error("完整 eSpeak 字典初始化失敗");
      clearTimeout(timer);resolve(api);
     }catch(e){fail(e)}
    }
   };
   try{
    // The upstream Emscripten bundle is a classic script. Fetch its verified
    // assets first; execute only the JS blob, avoiding cross-origin script MIME.
    self.importScripts(url);
   }catch(e){fail(e)}
  });
 }finally{URL.revokeObjectURL(url)}
}
async function espeakText(text,language){
 if(language!=="ko")throw Error("非韓文發音路徑："+language);
 const voice=language;
 if(!espeakPromise)espeakPromise=fullEspeak().catch(e=>{espeakPromise=null;throw e});
 const api=await espeakPromise;
 return espeakSentences(api,text,voice).join(" ").trim();
}
function koreanMisaki(p){
 const map={"aɪ":"I","aʊ":"W","dz":"ʣ","dʒ":"ʤ","eɪ":"A","oʊ":"O","əʊ":"Q","ss":"S","ts":"ʦ","tʃ":"ʧ","ɔɪ":"Y","œ̃":"B","ɔ̃":"C","ɑ̃":"D","ɛ̃":"E","ʊ̃":"V","ũ":"U","õ":"X","ɐ̃":"Z"};
 let result=p.replace(/[\u0361\u035c^]/gu,"").replace(/\([a-z-]+\)/gu,"");
 for(const [a,b] of Object.entries(map))result=result.split(a).join(b);
 return result.replace(/[\u0329\u032a]/gu,"");
}
const EEH="https://huggingface.co/ctrltokyo/eeh-1/resolve/a42c72e45bc814946e645a69acb15a184325a9a2/demo/";
async function gunzip(data){
 if(data[0]!==31||data[1]!==139)return data;
 const stream=new Blob([data]).stream().pipeThrough(new DecompressionStream("gzip"));
 return new Uint8Array(await new Response(stream).arrayBuffer());
}
function joined(parts){
 const pcm=new Float32Array(parts.reduce((sum,x)=>sum+x.length,0));
 let off=0,peak=0;
 for(const a of parts){pcm.set(a,off);off+=a.length;}
 for(const x of pcm){if(!Number.isFinite(x))throw Error("模型回傳非有限音訊");peak=Math.max(peak,Math.abs(x));}
 if(!pcm.length||peak===0)throw Error("模型未產生有效音訊");
 if(peak>.99)for(let i=0;i<pcm.length;i++)pcm[i]*=.99/peak;
 return pcm;
}
async function loadEehModule(){
 const path="pkg/eeh_wasm.js";
 const raw=EEH.replace("/resolve/","/raw/")+path;
 let source;
 try{
  source=await mirrorBytes([EEH+path+"?download=true",raw,EEH+path]);
 }catch(e){throw Error("日文 JS 下載失敗（網路或跨域限制）："+e.message);}
 const code=new TextDecoder().decode(source);
 if(!code.includes("export class Synthesizer")||!code.includes("module_or_path"))throw Error("日文 JS 下載內容不是預期的 WASM 模組");
 const url=URL.createObjectURL(new Blob([source],{type:"text/javascript"}));
 try{return await importModule(url);}
 catch(e){throw Error("日文 JS 初始化失敗："+e.message);}
 finally{URL.revokeObjectURL(url);}
}
async function loadEeh(){
 const module=await loadEehModule();
 const [weight,dict,wasm]=await Promise.all([
  bytes(EEH+"model/eeh.safetensors.gz","下載日文模型").then(gunzip),
  bytes(EEH+"model/eeh-dict.bin.gz","下載日文詞典").then(gunzip),
  bytes(EEH+"pkg/eeh_wasm_bg.wasm","下載日文執行環境")
 ]);
 status("初始化日文模型");
 try{await module.default({module_or_path:wasm});}catch(e){throw Error("日文 WASM 初始化失敗："+e.message);}
 const synth=new module.Synthesizer(weight,dict);
 return {speak(text,voice,speed){
  const name=voice==="male"?"M1":"F1";
  if(!synth.voices().includes(name))throw Error("找不到音色 "+name);
  const audio=synth.speak(text,name,{speed});
  return {audio:joined([audio]),sampleRate:synth.sampleRate(),voice:name};
 }};
}
async function mirrorBytes(urls){let error;for(const url of urls)try{return await bytes(url)}catch(e){error=e}throw error}
function selectedLanguage(language){return /^en(?:-|$)/i.test(language)?"en":language}
async function loadSelected(id){
 if(id==="ja")return await loadEeh();
 if(id==="ko"){
  const root=HF+"KittenML/kitten-tts-2-mini/resolve/main/";
  const [vocab,voices]=await Promise.all([json(root+"vocab.json"),bytes(root+"voices_ko.npz").then(parseNPZ),espeakText("안녕하세요","ko")]);
  if(!voices[KOREAN_VOICE])throw Error("Missing Korean voice");
  return {session:await session(root+"kitten_tts_2_mini_int4.onnx"),vocab,voices};
 }
 if(id==="en"){
  const config=await json(PARA+"config.json");
  // Prepare the real English phoneme resources during warm-up, not first playback.
  await phonemes("Hello.","af_heart","kokoro");
  return {session:await session(PARA+"onnx/paradee_int8.onnx"),vocab:config.vocab,voices:config.voices};
 }
 throw Error("Unsupported learning speech language "+id);
}
function tokenIds(p,vocab,kitten){
 if(!vocab||typeof vocab!=="object")throw Error("缺少音素字典");
 const ids=[];for(const c of p){if(Object.hasOwn(vocab,c))ids.push(vocab[c]);else if(kitten&&(c==="("||c===")")&&vocab[","]!==undefined)ids.push(vocab[","])}
 if(!ids.length||ids.length>(kitten?350:510))throw Error("有效音素數量不符，請縮短文字");
 return kitten?[0,...ids,10,0]:[0,...ids,0]
}
function wav(samples,rate=24000){
 if(!samples.length||!samples.every(Number.isFinite)||!samples.some(x=>Math.abs(x)>1e-6))throw Error("模型回傳無效或無聲音訊");
 const pad=Math.round(rate*.1),n=samples.length+2*pad,b=new ArrayBuffer(44+n*2),v=new DataView(b);
 const str=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};str(0,"RIFF");v.setUint32(4,36+n*2,true);str(8,"WAVE");str(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,"data");v.setUint32(40,n*2,true);
 for(let i=0;i<samples.length;i++){const x=Math.max(-1,Math.min(1,samples[i]));v.setInt16(44+2*(i+pad),x<0?x*32768:x*32767,true)}return b
}
async function speakSelected(text,language,speed){
 if(model==="ja"){const a=await engine.speak(text,"female",speed);return wav(a.audio,a.sampleRate)}
 if(model==="ko"){
  const p=koreanMisaki(await espeakText(text,"ko")),ids=tokenIds(p,engine.vocab,true),emb=engine.voices[KOREAN_VOICE];
  const row=Math.min(ids.length-1,emb.rows-1),style=emb.data.slice(row*emb.cols,(row+1)*emb.cols);
  const t=ort.Tensor,feeds={input_ids:new t("int64",BigInt64Array.from(ids,BigInt),[1,ids.length]),style:new t("float32",style,[1,style.length]),speed:new t("float32",Float32Array.of(speed),[1])};
  const out=await engine.session.run(feeds),samples=out.waveform?.data||Object.values(out).find(t=>t.data instanceof Float32Array)?.data;
  if(!samples)throw Error("Kitten empty audio");return wav(samples);
 }
 const voice=language==="en-GB"?"bf_isabella":"af_heart";
 const p=await phonemes(text,voice,"kokoro"),ids=tokenIds(p,engine.vocab,false);
 const order=Array.isArray(engine.voices)&&engine.voices.every(v=>typeof v==="string")?engine.voices:["af_heart","bf_isabella","am_puck","bm_fable","hf_alpha","hm_omega","ff_siwis","em_alex"],index=order.indexOf(voice);
 if(index<0)throw Error("Missing Paradee voice "+voice);
 const t=ort.Tensor,feeds={input_ids:new t("int64",BigInt64Array.from(ids,BigInt),[1,ids.length]),speed:new t("float32",Float32Array.of(speed),[1]),voice:new t("int64",BigInt64Array.of(BigInt(index)),[1])};
 const out=await engine.session.run(feeds),samples=out.waveform?.data||Object.values(out).find(t=>t.data instanceof Float32Array)?.data;
 if(!samples)throw Error("Paradee empty audio");return wav(samples);
}
let queue=Promise.resolve();
self.onmessage=({data})=>{
 queue=queue.catch(()=>{}).then(async()=>{
  try{
   const id=selectedLanguage(data.language);
   if(!engine||model!==id){engine=await loadSelected(id);model=id}
   if(data.type==="prepare"){self.postMessage({id:data.id,ok:true});return}
   if(data.type!=="generate"||typeof data.text!=="string")throw Error("Invalid speech request");
   const buffer=await speakSelected(data.text,data.language,data.speed==="slow"?.85:1);
   self.postMessage({id:data.id,ok:true,buffer},[buffer]);
  }catch(e){self.postMessage({id:data.id,ok:false,error:e.message||String(e)})}
 });
};
