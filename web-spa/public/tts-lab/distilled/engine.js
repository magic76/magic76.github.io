/* Independent TTS lab; no production routing. */
const CDN="https://cdn.jsdelivr.net/npm/",ORT=CDN+"onnxruntime-web@1.24.3/dist/",UC=CDN+"uccharan@1.0.0/",HF="https://huggingface.co/";
const PARA=HF+"sahilmahendrakar/Paradee-8M-v1.3/resolve/main/";
const KOKORO=CDN+"kokoro-js@1.2.1/dist/kokoro.web.js";
let engine,model,ctxId,ort,g2p;const langs=new Set();
function status(text){self.postMessage({id:ctxId,status:text})}
async function bytes(url){
 let cache;try{cache=await caches.open("koolo-tts-distilled-v1");const hit=await cache.match(url);if(hit)return new Uint8Array(await hit.arrayBuffer())}catch{}
 let error;for(let i=0;i<2;i++)try{const r=await fetch(url);if(!r.ok)throw Error("HTTP "+r.status+" "+url);const copy=r.clone(),data=new Uint8Array(await r.arrayBuffer());if(!data.length)throw Error("資源為空");try{await cache?.put(url,copy)}catch{}return data}catch(e){error=e}throw error
}
async function runtime(){
 if(!ort){importScripts(ORT+"ort.min.js");ort=self.ort;ort.env.wasm.numThreads=1;ort.env.wasm.wasmPaths=ORT;}return ort
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
 if(!header.includes("f4")||dims.length!==2)throw Error("不支援的 voice pack 格式");const start=base+len,raw=new DataView(data.buffer,data.byteOffset+start,data.length-start),floats=new Float32Array(raw.byteLength/4);for(let i=0;i<floats.length;i++)floats[i]=raw.getFloat32(i*4,!header.includes(">f4"));return{rows:dims[0],cols:dims[1],data:floats}
}
async function parseNPZ(data){
 const {inflateRaw}=await import(CDN+"pako@2.1.0/dist/pako.esm.mjs"),out={},view=new DataView(data.buffer,data.byteOffset,data.byteLength),dec=new TextDecoder();let off=0;
 while(off+30<=data.length&&view.getUint32(off,true)===0x04034b50){const method=view.getUint16(off+8,true),size=view.getUint32(off+18,true),nl=view.getUint16(off+26,true),xl=view.getUint16(off+28,true),ds=off+30+nl+xl,de=ds+size;if(de>data.length||!size)throw Error("無效的 NPZ");const name=dec.decode(data.slice(off+30,off+30+nl));if(name.endsWith(".npy")){let raw=data.slice(ds,de);if(method===8)raw=inflateRaw(raw);else if(method!==0)throw Error("不支援的 NPZ 壓縮");out[name.slice(0,-4)]=parseNPY(raw)}off=de}return out
}
const json=async url=>JSON.parse(new TextDecoder().decode(await bytes(url)));
async function session(url){await runtime();status("下載或讀取模型快取…");const data=await bytes(url);status("建立 WASM 推論環境…");return ort.InferenceSession.create(data,{executionProviders:["wasm"],intraOpNumThreads:1,graphOptimizationLevel:"all"})}
async function load(id){
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
 if(model==="kokoro"){const a=await engine.tts.generate(text,{voice,speed});return{buffer:wav(a.audio,a.sampling_rate||24000),voice}}
 if(model==="phonon"){const samples=await engine.tts.synth(text);return{buffer:wav(samples),voice:"Phonon 預設音色 · 原速"}}
 const kitten=model==="nano8"||model==="mini4",p=await phonemes(text,voice,kitten?"kitten":"kokoro"),ids=tokenIds(p,engine.vocab,kitten);
 const feeds={input_ids:new ort.Tensor("int64",BigInt64Array.from(ids,BigInt),[1,ids.length]),speed:new ort.Tensor("float32",Float32Array.of(speed),[1])};
 let name=voice;
 if(kitten){name=voice.includes("f_")?"eleanor":"danny";const emb=engine.voices[name];if(!emb)throw Error("找不到音色 "+name);const row=Math.min(ids.length-1,emb.rows-1),style=emb.data.slice(row*emb.cols,(row+1)*emb.cols);feeds.style=new ort.Tensor("float32",style,[1,style.length])}
 else{const order=["af_heart","bf_isabella","am_puck","bm_fable","hf_alpha","hm_omega","ff_siwis","em_alex"],index=order.indexOf(voice);if(index<0)throw Error("未知音色");feeds.voice=new ort.Tensor("int64",BigInt64Array.of(BigInt(index)),[1])}
 const outputs=await engine.session.run(feeds),samples=outputs.waveform?.data||Object.values(outputs).find(t=>t.data instanceof Float32Array)?.data;
 if(!samples)throw Error("模型沒有 waveform");return{buffer:wav(samples),voice:name}
}
self.onmessage=async({data})=>{ctxId=data.id;try{
 if(data.type==="load"){model=data.model;engine=await load(model);self.postMessage({id:data.id,ready:true})}
 else if(data.type==="speak"&&engine&&data.model===model){const r=await speak(data.text,data.voice,data.speed);self.postMessage({id:data.id,...r},[r.buffer])}
 else throw Error("模型尚未初始化")
 }catch(e){self.postMessage({id:data.id,error:e.message||String(e)})}};
