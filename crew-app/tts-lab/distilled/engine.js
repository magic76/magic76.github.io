/* Independent TTS lab; no production routing. */
const CDN="https://cdn.jsdelivr.net/npm/",ORT=CDN+"onnxruntime-web@1.24.3/dist/",UC=CDN+"uccharan@1.0.0/",HF="https://huggingface.co/";
const PARA=HF+"sahilmahendrakar/Paradee-8M-v1.3/resolve/main/";
const KOKORO=CDN+"kokoro-js@1.2.1/dist/kokoro.web.js";
let engine,model,ctxId,ort,g2p;
const ORT_BASES=[ORT,"https://unpkg.com/onnxruntime-web@1.24.3/dist/"];
const importModule=url=>import(url);const langs=new Set();
function status(text){self.postMessage({id:ctxId,status:text})}
async function bytes(url){
 let cache;try{cache=await caches.open("koolo-tts-distilled-v1");const hit=await cache.match(url);if(hit)return new Uint8Array(await hit.arrayBuffer())}catch{}
 let error;for(let i=0;i<2;i++)try{const r=await fetch(url);if(!r.ok)throw Error("HTTP "+r.status+" "+url);const copy=r.clone(),data=new Uint8Array(await r.arrayBuffer());if(!data.length)throw Error("資源為空");try{await cache?.put(url,copy)}catch{}return data}catch(e){error=e}throw error
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
 if(!g2p){g2p=await import(UC+"index.js");await g2p.init({wasm:await bytes(UC+"dist/uccharan_wasm_bg.wasm"),dataBaseUrl:UC+"data/"})}
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
 const {inflateRaw}=await import(CDN+"pako@2.1.0/dist/pako.esm.mjs"),out={},view=new DataView(data.buffer,data.byteOffset,data.byteLength),dec=new TextDecoder();let off=0;
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
const KOREAN_VOICES=["seoyeon","minjun","jihoon"];
const PIPER_ROOT=HF+"rhasspy/piper-voices/resolve/main/zh/zh_CN/huayan/";
const PIPER_MODELS={piperLow:{tier:"x_low",size:20628813,rate:16000},piperMedium:{tier:"medium",size:63201294,rate:22050}};
let espeakPromise,openccPromise;
async function espeakText(text,language){
 if(!espeakPromise)espeakPromise=import(CDN+"phonemizer@1.2.1").catch(e=>{espeakPromise=null;throw e});
 const {phonemize,list_voices}=await espeakPromise;
 const voices=await list_voices();
 if(!voices.some(v=>v.languages?.some(l=>l.name===language)))throw Error("eSpeak 不支援 "+language);
 const result=await phonemize(text,language);
 if(!Array.isArray(result)||!result.length)throw Error("發音轉換失敗");
 return result.join(" ").trim();
}
async function simplified(text){
 if(!openccPromise)openccPromise=import(CDN+"opencc-js@1.4.2/dist/esm/full.js").then(m=>m.Converter({from:"tw",to:"cn"})).catch(e=>{openccPromise=null;throw e});
 return (await openccPromise)(text);
}
function koreanMisaki(p){
 const map={"aɪ":"I","aʊ":"W","dz":"ʣ","dʒ":"ʤ","eɪ":"A","oʊ":"O","əʊ":"Q","ss":"S","ts":"ʦ","tʃ":"ʧ","ɔɪ":"Y","œ̃":"B","ɔ̃":"C","ɑ̃":"D","ɛ̃":"E","ʊ̃":"V","ũ":"U","õ":"X","ɐ̃":"Z"};
 let result=p.replace(/[\u0361\u035c^]/gu,"").replace(/\([a-z-]+\)/gu,"");
 for(const [a,b] of Object.entries(map))result=result.split(a).join(b);
 return result.replace(/[\u0329\u032a]/gu,"");
}
function piperIds(p,map){
 if(!map?.["^"]||!map?.["_"]||!map?.["$"])throw Error("Piper 發音字典不完整");
 const ids=[...map["^"],...map["_"]];let count=0;
 for(const ch of p.normalize("NFD"))if(map[ch]){ids.push(...map[ch],...map["_"]);count++}
 if(!count||ids.length>900)throw Error("有效音素不足或句子太長");ids.push(...map["$"]);return ids;
}
async function loadPiper(id){
 const cfg=PIPER_MODELS[id],base=PIPER_ROOT+cfg.tier+"/zh_CN-huayan-"+cfg.tier+".onnx";
 const config=await json(base+".json");
 if(config.audio?.sample_rate!==cfg.rate||!config.phoneme_id_map||!["cmn","zh"].includes(config.espeak?.voice))throw Error("Piper 發音設定不符");
 return {session:await session(base,cfg.size),config,rate:cfg.rate};
}
function requestSano(worker,message,onStatus=status){
 return new Promise((resolve,reject)=>{
  let timer;const cleanup=()=>{clearTimeout(timer);worker.removeEventListener("message",onMessage);worker.removeEventListener("error",onError)};
  const fail=e=>{cleanup();reject(e)};
  const onError=e=>fail(Error(e.message||"sanoTTS Worker 失敗"));
  const onMessage=({data})=>{if(data.type==="status"){onStatus(data.text);return}if(data.id!==message.id)return;cleanup();if(data.type==="error")reject(Error(data.message));else resolve(data)};
  worker.addEventListener("message",onMessage);worker.addEventListener("error",onError);timer=setTimeout(()=>fail(Error("sanoTTS 操作逾時")),message.type==="load"?240000:90000);
  worker.postMessage(message);
 });
}
async function load(id){
 if(id==="piperLow"||id==="piperMedium")return loadPiper(id);
 if(id==="sanoZh"){
  const worker=new Worker("../compare/lightweight-worker.js?v=903");
  try{await requestSano(worker,{type:"load",engine:"sano",lang:"zh",id:ctxId});return {worker}}catch(e){worker.terminate();throw e}
 }
 if(id==="mini4ko"||id==="mini8ko"){
  const root=HF+"KittenML/kitten-tts-2-mini/resolve/main/";
  const [vocab,voices]=await Promise.all([json(root+"vocab.json"),bytes(root+"voices_ko.npz").then(parseNPZ)]);
  if(!KOREAN_VOICES.every(v=>voices[v]))throw Error("韓文音色包不完整");
  return {session:await session(root+(id==="mini4ko"?"kitten_tts_2_mini_int4.onnx":"kitten_tts_2_mini.onnx")),vocab,voices};
 }
 if(id.startsWith("paradee")){
 const config=await json(PARA+"config.json");return{session:await session(PARA+"onnx/"+(id==="paradee8"?"paradee_int8.onnx":"paradee.onnx")),vocab:config.vocab,voices:config.voices}
 }
 if(id==="nano8"||id==="mini4"){
 const root=HF+"KittenML/kitten-tts-2-"+(id==="nano8"?"nano":"mini")+"/resolve/main/";
 const [vocab,voices]=await Promise.all([json(root+"vocab.json"),bytes(root+"voices_en.npz").then(parseNPZ)]);
 return{session:await session(root+(id==="nano8"?"kitten_tts_2_nano_en.onnx":"kitten_tts_2_mini_int4.onnx")),vocab,voices}
 }
 if(id==="kokoro"){
 status("載入 Kokoro WASM q8…");const {KokoroTTS}=await import(KOKORO);
 return{tts:await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX",{device:"wasm",dtype:"q8",progress_callback:p=>{if(p.status==="progress")status("下載 "+p.file+" · "+Math.round(p.progress||0)+"%")}})}
 }
 if(id==="phonon"){
 status("載入 Phonon 31M Q8…");
 // Phonon uses a nested dedicated module worker. A same-origin wrapper is required when the SDK is on a CDN.
 const base=CDN+"phonon-tts@0.4.2/";
 const {PhononTTS}=await import(base+"index.js");
 const workerUrl=URL.createObjectURL(new Blob(['import "'+base+'worker.js";'],{type:"text/javascript"}));
 try{return{tts:await PhononTTS.load({lang:"en",quant:"q8",device:"cpu",threads:1,workerUrl,onProgress:p=>status("下載 "+p.file+" · "+(p.cached?"快取":p.total?Math.round(p.loaded/p.total*100)+"%":"處理中"))})}}finally{URL.revokeObjectURL(workerUrl)}
 }
 throw Error("未知模型")
}
function tokenIds(p,vocab,kitten){
 if(!vocab||typeof vocab!=="object")throw Error("缺少音素字典");
 const ids=[];for(const c of p){if(Object.hasOwn(vocab,c))ids.push(vocab[c]);else if(kitten&&(c==="("||c===")")&&vocab[","]!==undefined)ids.push(vocab[","])}
 if(!ids.length||ids.length>(kitten?350:510))throw Error("有效音素數量不符，請縮短文字");
 return kitten?[0,...ids,10,0]:[0,...ids,0]
}
function wav(samples,rate=24000){
 if(!samples.length||!samples.every(Number.isFinite)||!samples.some(x=>Math.abs(x)>1e-6))throw Error("模型回傳無效或無聲音訊");
 const pad=2400,n=samples.length+2*pad,b=new ArrayBuffer(44+n*2),v=new DataView(b);
 const str=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};str(0,"RIFF");v.setUint32(4,36+n*2,true);str(8,"WAVE");str(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,"data");v.setUint32(40,n*2,true);
 for(let i=0;i<samples.length;i++){const x=Math.max(-1,Math.min(1,samples[i]));v.setInt16(44+2*(i+pad),x<0?x*32768:x*32767,true)}return b
}
async function speak(text,voice,speed){
 if(model==="sanoZh"){
  const r=await requestSano(engine.worker,{type:"speak",text,voice:"female",speed,id:ctxId});return {buffer:wav(r.audio,r.sampleRate),voice:r.voice};
 }
 if(model==="piperLow"||model==="piperMedium"){
  const config=engine.config,p=await espeakText(await simplified(text),config.espeak.voice),ids=piperIds(p,config.phoneme_id_map);
  const t=ort.Tensor,feeds={input:new t("int64",BigInt64Array.from(ids,BigInt),[1,ids.length]),input_lengths:new t("int64",BigInt64Array.of(BigInt(ids.length)),[1]),scales:new t("float32",Float32Array.of(config.inference.noise_scale,config.inference.length_scale/speed,config.inference.noise_w),[3])};
  if(engine.session.inputNames.includes("sid"))feeds.sid=new t("int64",BigInt64Array.of(0n),[1]);
  const out=await engine.session.run(feeds),samples=Object.values(out).find(t=>t.data instanceof Float32Array)?.data;
  if(!samples)throw Error("Piper 沒有有效 waveform");return {buffer:wav(samples,engine.rate),voice:"Huayan"};
 }
 if(model==="mini4ko"||model==="mini8ko"){
  if(!KOREAN_VOICES.includes(voice))throw Error("請選韓文音色");
  const p=koreanMisaki(await espeakText(text,"ko")),ids=tokenIds(p,engine.vocab,true),emb=engine.voices[voice];
  const row=Math.min(ids.length-1,emb.rows-1),style=emb.data.slice(row*emb.cols,(row+1)*emb.cols);
  const t=ort.Tensor,feeds={input_ids:new t("int64",BigInt64Array.from(ids,BigInt),[1,ids.length]),style:new t("float32",style,[1,style.length]),speed:new t("float32",Float32Array.of(speed),[1])};
  const out=await engine.session.run(feeds),samples=out.waveform?.data||Object.values(out).find(t=>t.data instanceof Float32Array)?.data;
  if(!samples)throw Error("Kitten 沒有有效 waveform");return {buffer:wav(samples),voice};
 }
 if(model==="kokoro"){const a=await engine.tts.generate(text,{voice,speed});return{buffer:wav(a.audio,a.sampling_rate||24000),voice}}
 if(model==="phonon"){const samples=await engine.tts.synth(text);return{buffer:wav(samples),voice:"Phonon 預設音色 · 原速"}}
 const kitten=model==="nano8"||model==="mini4",p=await phonemes(text,voice,kitten?"kitten":"kokoro"),ids=tokenIds(p,engine.vocab,kitten);
 const feeds={input_ids:new ort.Tensor("int64",BigInt64Array.from(ids,BigInt),[1,ids.length]),speed:new ort.Tensor("float32",Float32Array.of(speed),[1])};
 let name=voice;
 if(kitten){name=voice.includes("f_")?"eleanor":"danny";const emb=engine.voices[name];if(!emb)throw Error("找不到音色 "+name);const row=Math.min(ids.length-1,emb.rows-1),style=emb.data.slice(row*emb.cols,(row+1)*emb.cols);feeds.style=new ort.Tensor("float32",style,[1,style.length])}
 else{const order=Array.isArray(engine.voices)&&engine.voices.every(v=>typeof v==="string")?engine.voices:["af_heart","bf_isabella","am_puck","bm_fable","hf_alpha","hm_omega","ff_siwis","em_alex"],index=order.indexOf(voice);if(index<0)throw Error("未知音色");feeds.voice=new ort.Tensor("int64",BigInt64Array.of(BigInt(index)),[1])}
 const outputs=await engine.session.run(feeds),samples=outputs.waveform?.data||Object.values(outputs).find(t=>t.data instanceof Float32Array)?.data;
 if(!samples)throw Error("模型沒有 waveform");return{buffer:wav(samples),voice:name}
}
self.onmessage=async({data})=>{ctxId=data.id;try{
 if(data.type==="load"){model=data.model;engine=await load(model);self.postMessage({id:data.id,ready:true})}
 else if(data.type==="speak"&&engine&&data.model===model){const r=await speak(data.text,data.voice,data.speed);self.postMessage({id:data.id,...r},[r.buffer])}
 else throw Error("模型尚未初始化")
 }catch(e){self.postMessage({id:data.id,error:e.message||String(e)})}};
