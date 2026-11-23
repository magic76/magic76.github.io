(()=>{
"use strict";
const $=s=>document.querySelector(s);
const text=$("#text"),speed=$("#speed"),voice=$("#voice"),player=$("#player"),now=$("#now");
const presets={
 natural:"At first, I thought learning English meant memorizing every word perfectly, but after I started speaking a little every day, I realized that rhythm, confidence, and the courage to keep going mattered much more than sounding perfect.",
 pronunciation:"Three thoughtful travelers quietly crossed the crowded railway station, checking their schedules, sharing a comfortable conversation, and wondering whether the weather would change before their early flight tomorrow morning.",
 story:"On Saturday evening, Zoe walked into a small coffee shop near the river, ordered a warm drink, and told her friend about an unexpected idea that had completely changed the way she wanted to spend the next year."
};
for(const b of document.querySelectorAll("[data-preset]"))b.addEventListener("click",()=>{text.value=presets[b.dataset.preset]||presets.natural;});

const KOKORO_URL="https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js";
const KITTEN_WEB="https://cdn.jsdelivr.net/gh/KittenML/KittenTTS-web@c846fe92858f3447f4912226471f5a63983b3f94/examples/html/assets/kittentts-web.js";
const ORT_JS="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/ort.min.js";
const ORT_BASE="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/";
const PAKO_JS="https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js";
const HF="https://huggingface.co/KittenML/";
const TINY_MODELS={
 nano2:{repo:"kitten-tts-2-nano",model:"kitten_tts_2_nano_en_int4.onnx",male:"danny"},
 pico2:{repo:"kitten-tts-2-pico",model:"kitten_tts_2_pico_en_int4.onnx",male:"otis"}
};
const engines={};
const scripts=new Map();
let currentUrl="",busy=false;

function sample(){const v=text.value.trim();if(!v)throw Error("請先輸入測試句子。");return v;}
function setStatus(id,msg,error=false){const el=$("#status-"+id);if(!el)return;el.textContent=msg;el.classList.toggle("error",error);}
function setProgress(id,p){const el=$("#progress-"+id);if(el)el.style.width=Math.max(0,Math.min(100,p))+"%";}
function loadScript(url){
 if(scripts.has(url))return scripts.get(url);
 const p=new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=url;s.onload=resolve;s.onerror=()=>reject(Error("載入 runtime 失敗："+url));document.head.append(s);});
 scripts.set(url,p);return p;
}
function stopAll(){
 try{speechSynthesis?.cancel()}catch{}
 player.pause();
}
function playBlob(blob,label,elapsed){
 if(currentUrl)URL.revokeObjectURL(currentUrl);
 currentUrl=URL.createObjectURL(blob);player.src=currentUrl;player.hidden=false;
 now.textContent=label+(elapsed?" · "+elapsed:"");
 return player.play().catch(()=>{});
}
function wavBlob(samples,rate=24000){
 const n=samples.length,b=new ArrayBuffer(44+n*2),v=new DataView(b);
 const str=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
 str(0,"RIFF");v.setUint32(4,36+n*2,true);str(8,"WAVE");str(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
 v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,"data");v.setUint32(40,n*2,true);
 for(let i=0;i<n;i++){const x=Math.max(-1,Math.min(1,samples[i]));v.setInt16(44+i*2,x<0?x*32768:x*32767,true)}
 return new Blob([b],{type:"audio/wav"});
}
async function fetchCached(url,id,label){
 const cacheName="koolo-tts-lab-models-v2";
 try{const c=await caches.open(cacheName),hit=await c.match(url);if(hit){setStatus(id,label+"（快取）");return new Uint8Array(await hit.arrayBuffer())}
  setStatus(id,"下載 "+label+"…");const r=await fetch(url);if(!r.ok)throw Error("HTTP "+r.status+" "+label);const clone=r.clone();try{await c.put(url,clone)}catch{}
  return new Uint8Array(await r.arrayBuffer());
 }catch(e){const r=await fetch(url);if(!r.ok)throw Error("HTTP "+r.status+" "+label);return new Uint8Array(await r.arrayBuffer())}
}
async function loadKittenBundle(){await loadScript(KITTEN_WEB);if(!window.KittenTTSWeb)throw Error("Kitten Web SDK 未初始化");return window.KittenTTSWeb;}

async function systemTts(){
 const v=sample();stopAll();if(!("speechSynthesis"in window))throw Error("瀏覽器沒有 speechSynthesis");
 const u=new SpeechSynthesisUtterance(v);u.lang="en-US";u.rate=Number(speed.value);
 const voices=speechSynthesis.getVoices().filter(x=>/^en/i.test(x.lang));const female=/female|samantha|zira|aria|jenny|ava/i,male=/male|david|mark|guy|ryan/i;
 const chosen=voices.find(x=>(voice.value==="female"?female:male).test(x.name))||voices[0];if(chosen)u.voice=chosen;
 setStatus("system","播放中："+(chosen?.name||"系統預設"));now.textContent="系統 TTS";
 speechSynthesis.speak(u);
}

async function kokoroTts(){
 const v=sample();stopAll();const started=performance.now();setStatus("kokoro","載入 Kokoro…");
 if(!engines.kokoro){const {KokoroTTS}=await import(KOKORO_URL);const hasGpu="gpu"in navigator;
  engines.kokoro=await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX",{device:hasGpu?"webgpu":"wasm",dtype:hasGpu?"fp32":"q8",progress_callback:i=>{if(i?.status==="progress"&&typeof i.progress==="number")setProgress("kokoro",i.progress)}});
  setProgress("kokoro",100);
 }
 setStatus("kokoro","生成長句…");const a=await engines.kokoro.generate(v,{voice:voice.value==="female"?"af_heart":"am_michael",speed:Number(speed.value)});
 await playBlob(a.toBlob(),"Kokoro",((performance.now()-started)/1000).toFixed(1)+" 秒");
 setStatus("kokoro","完成。");
}

async function kitten08Tts(){
 const v=sample();stopAll();const started=performance.now(),sdk=await loadKittenBundle();
 if(!engines.kitten08){setStatus("kitten08","準備官方 Web SDK…");
  engines.kitten08=await sdk.KittenTTS.create({model:"nano-int8",defaultVoice:voice.value==="female"?"bella":"jasper",analytics:false},(p,info)=>{setProgress("kitten08",p*100);if(info?.asset)setStatus("kitten08",(info.stage||"載入")+" · "+info.asset)});
 }
 setStatus("kitten08","生成長句…");const r=await engines.kitten08.generate(v,{voice:voice.value==="female"?"bella":"jasper",speed:Number(speed.value)});
 await playBlob(new Blob([r.wavData()],{type:"audio/wav"}),"Kitten 0.8 Nano int8",((performance.now()-started)/1000).toFixed(1)+" 秒");
 setProgress("kitten08",100);setStatus("kitten08","完成。匿名 analytics 已關閉。");
}

function parseNPZ(data){
 const out={},view=new DataView(data.buffer,data.byteOffset,data.byteLength),dec=new TextDecoder();let off=0;
 while(off+30<=data.length&&view.getUint32(off,true)===0x04034b50){
  const method=view.getUint16(off+8,true),cs=view.getUint32(off+18,true),nameLen=view.getUint16(off+26,true),extraLen=view.getUint16(off+28,true);
  const ns=off+30,ds=ns+nameLen+extraLen,de=ds+cs;if(de>data.length)break;const name=dec.decode(data.slice(ns,ns+nameLen));
  if(name.endsWith(".npy")){let raw=data.slice(ds,de);if(method===8)raw=window.pako.inflateRaw(raw);else if(method!==0){off=de;continue}
   const emb=parseNPY(raw);if(emb)out[name.slice(0,-4)]=emb;
  }off=de;
 }return out;
}
function parseNPY(data){
 if(data.length<10||data[0]!==0x93)return null;const view=new DataView(data.buffer,data.byteOffset,data.byteLength),major=data[6];
 const hl=major>=2?view.getUint32(8,true):view.getUint16(8,true),base=major>=2?12:10,head=new TextDecoder().decode(data.slice(base,base+hl));
 const m=head.match(/shape[^\(]*\(([^\)]*)\)/);if(!m)return null;const shape=m[1].split(",").map(x=>Number(x.trim())).filter(Number.isFinite),start=base+hl;
 const big=head.includes(">f4"),count=Math.floor((data.length-start)/4),floats=new Float32Array(count),dv=new DataView(data.buffer,data.byteOffset+start,data.length-start);
 for(let i=0;i<count;i++)floats[i]=dv.getFloat32(i*4,!big);
 return{rows:shape.length>=2?shape[0]:1,cols:shape.length>=2?shape[1]:shape[0],data:floats};
}
async function tinyRuntime(){
 if(engines.tinyRuntime)return engines.tinyRuntime;
 await Promise.all([loadKittenBundle(),loadScript(PAKO_JS),loadScript(ORT_JS)]);
 const sdk=window.KittenTTSWeb,ort=window.ort;if(!sdk?.CEPhonemizer||!ort)throw Error("Tiny runtime 初始化失敗");
 ort.env.wasm.numThreads=1;ort.env.wasm.wasmPaths=ORT_BASE;
 const phon=new sdk.CEPhonemizer({dialect:"en-us"});await phon.downloadIfNeeded("KooloTtsLabTiny");
 return engines.tinyRuntime={sdk,ort,phon};
}
async function loadTiny(kind){
 if(engines[kind])return engines[kind];
 const cfg=TINY_MODELS[kind],base=HF+cfg.repo+"/resolve/main/";
 setStatus(kind,"準備 ONNX runtime / phonemizer…");const rt=await tinyRuntime();setProgress(kind,8);
 const [model,voicesData,vocabData]=await Promise.all([
  fetchCached(base+cfg.model,kind,"int4 ONNX"),
  fetchCached(base+"voices_en.npz",kind,"英文 voice pack"),
  fetchCached(base+"vocab.json",kind,"vocab")
 ]);
 setProgress(kind,70);const vocab=JSON.parse(new TextDecoder().decode(vocabData)),voices=parseNPZ(voicesData),key=voice.value==="female"?"eleanor":"danny";
 const embedding=voices[Object.keys(voices)[0]];if(!embedding)throw Error("找不到 voice embedding");
 setStatus(kind,"建立 ONNX session…");const session=await rt.ort.InferenceSession.create(model,{executionProviders:["wasm"],graphOptimizationLevel:"all",intraOpNumThreads:1});
 setProgress(kind,100);return engines[kind]={...rt,session,vocab,voices,cfg};
}
function encodeTiny(phonemes,vocab){
 const ids=[];for(const ch of phonemes){if(Object.prototype.hasOwnProperty.call(vocab,ch))ids.push(vocab[ch]);else if(ch==="("||ch===")")ids.push(vocab[","])}
 return[0,...ids,10,0];
}
function tinyResult(results){
 const entries=Object.entries(results),wave=entries.find(([,t])=>t.data instanceof Float32Array)?.[1];if(!wave)throw Error("ONNX 沒有 waveform");
 const dur=entries.find(([,t])=>t.data instanceof BigInt64Array||t.data instanceof Int32Array||t.data instanceof Uint32Array)?.[1];
 return{samples:new Float32Array(wave.data),durations:dur?Array.from(dur.data,x=>typeof x==="bigint"?Number(x):Number(x)):[]};
}
function finishTiny(samples,durations){
 let w=samples;if(durations.length){const total=durations.reduce((a,b)=>a+b,0),spf=Math.max(1,Math.round(w.length/Math.max(total,1))),trail=Math.max(0,(durations[durations.length-1]-1)*spf);if(trail&&trail<w.length)w=w.slice(0,w.length-trail)}
 const out=new Float32Array(w);const f=Math.min(120,Math.floor(out.length/8));for(let i=0;i<f;i++){out[i]*=i/Math.max(1,f-1);out[out.length-1-i]*=i/Math.max(1,f-1)}return out;
}
async function tinyTts(kind){
 const label=kind==="nano2"?"Kitten TTS 2 Nano int4":"Kitten TTS 2 Pico int4",v=sample();stopAll();const started=performance.now(),e=await loadTiny(kind);
 setStatus(kind,"phonemize + 生成長句…");const phonemes=await e.phon.phonemize(v),tokens=encodeTiny(phonemes,e.vocab);if(tokens.length>353)throw Error("這句對 tiny 實驗 port 太長，請換短一點的範例。");
 const key=voice.value==="female"?"eleanor":e.cfg.male,emb=e.voices[key]||e.voices[Object.keys(e.voices)[0]],row=Math.min(tokens.length-1,emb.rows-1),style=emb.data.slice(row*emb.cols,(row+1)*emb.cols);
 const feeds={input_ids:new e.ort.Tensor("int64",BigInt64Array.from(tokens.map(BigInt)),[1,tokens.length]),style:new e.ort.Tensor("float32",style,[1,style.length]),speed:new e.ort.Tensor("float32",Float32Array.of(Number(speed.value)),[1])};
 const r=tinyResult(await e.session.run(feeds)),pcm=finishTiny(r.samples,r.durations);await playBlob(wavBlob(pcm,24000),label,((performance.now()-started)/1000).toFixed(1)+" 秒");
 setStatus(kind,"完成 · 實驗 port（非官方 Web frontend）。");
}

const handlers={system:systemTts,kokoro:kokoroTts,kitten08:kitten08Tts,nano2:()=>tinyTts("nano2"),pico2:()=>tinyTts("pico2")};
for(const b of document.querySelectorAll("[data-engine]"))b.addEventListener("click",async()=>{if(busy)return;busy=true;const id=b.dataset.engine;b.disabled=true;try{await handlers[id]()}catch(e){console.error(e);setStatus(id,"失敗："+(e instanceof Error?e.message:String(e)),true)}finally{b.disabled=false;busy=false}});
window.addEventListener("pagehide",()=>{stopAll();if(currentUrl)URL.revokeObjectURL(currentUrl);try{engines.kitten08?.dispose?.()}catch{}try{engines.tinyRuntime?.phon?.dispose?.()}catch{}});
})();