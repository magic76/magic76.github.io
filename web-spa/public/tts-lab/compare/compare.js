(()=>{
"use strict";
const $=s=>document.querySelector(s);
const language=$("#language"),text=$("#text"),speed=$("#speed"),voice=$("#voice"),player=$("#player"),now=$("#now");
const presets={
 word:"Comfortable.",
 short:"Would you like to practice English with me?",
 natural:"At first, I thought learning English meant memorizing every word perfectly, but after I started speaking a little every day, I realized that rhythm, confidence, and the courage to keep going mattered much more than sounding perfect.",
 pronunciation:"Three thoughtful travelers quietly crossed the crowded railway station, checking their schedules, sharing a comfortable conversation, and wondering whether the weather would change before their early flight tomorrow morning.",
 story:"On Saturday evening, Zoe walked into a small coffee shop near the river, ordered a warm drink, and told her friend about an unexpected idea that had completely changed the way she wanted to spend the next year."
};
const languagePresets={
 en:presets,
 es:{
  word:"Cómodo.",
  short:"¿Te gustaría practicar español conmigo todos los días?",
  natural:"Al principio pensaba que aprender español consistía en memorizar cada palabra a la perfección. Después de hablar un poco cada día, descubrí que el ritmo, la confianza y las ganas de seguir practicando eran más importantes.",
  pronunciation:"Tres tristes tigres tragaban trigo en un trigal. El perro de Rosa corre rápido por el ferrocarril.",
  story:"El sábado por la tarde, una amiga entró en una pequeña cafetería junto al río, pidió una bebida caliente y habló de sus planes para el próximo año."
 },
 zh:{
  word:"舒服。",
  short:"你願意每天和我一起練習說中文嗎？",
  natural:"一開始，我以為學習中文就是要把每個單字背得很熟。後來我每天試著開口說一點，才發現自然的節奏、信心和繼續練習的勇氣，比追求完美更重要。",
  pronunciation:"四是四，十是十，十四是十四，四十是四十。今天下午四點十四分，我們一起去市場買水果。",
  story:"星期六傍晚，小雨走進河邊的一間咖啡店，點了一杯熱茶，和朋友聊起最近的一個新想法。"
 },
 ja:{
  word:"心地よい。",
  short:"毎日、私と一緒に日本語を練習しませんか？",
  natural:"最初は、単語を全部覚えることが日本語の勉強だと思っていました。でも毎日少しずつ話してみると、完璧に話すことよりも、自然なリズムと自信を持つことが大切だと気づきました。",
  pronunciation:"東京特許許可局。今日は四月十四日です。午後四時に新宿駅で友達と会いましょう。",
  story:"土曜日の夕方、友達は川沿いの小さなカフェに入り、温かい飲み物を注文しました。窓の外を眺めながら、来年の計画について話しました。"
 },
 ko:{
  word:"편안하다.",
  short:"매일 저와 함께 한국어를 연습해 볼까요?",
  natural:"처음에는 모든 단어를 완벽하게 외우는 것이 한국어 공부라고 생각했어요. 그런데 매일 조금씩 말하다 보니 완벽한 발음보다 자연스러운 리듬과 자신감, 그리고 계속 도전하는 용기가 더 중요하다는 것을 알게 되었어요.",
  pronunciation:"간장 공장 공장장은 강 공장장이고, 된장 공장 공장장은 장 공장장입니다. 오늘 오후 네 시에 역에서 만나요.",
  story:"토요일 저녁에 친구는 강가에 있는 작은 카페에 들어갔어요. 따뜻한 차를 주문하고 창밖을 바라보면서 내년 계획에 대해 이야기했어요."
 }
};
const locales={en:"en-US",zh:"zh-TW",ja:"ja-JP",ko:"ko-KR",es:"es-ES"};
const languageNames={en:"英文",zh:"中文",ja:"日文",ko:"韓文",es:"西班牙文"};
const engineLanguages={
 system:["en","zh","ja","ko","es"],
 kokoro:["en"],kokoroGpuQ8:["en"],kokoroGpuFp32:["en"],
 piper:["en","zh","es"],piperPlus:["en","zh","ja","es"],piperJapanese:["ja"],
 supertonicWasm:["en","ja","ko","es"],supertonicGpu:["en","ja","ko","es"],
 kitten08:["en"],nano2:["en","es"],pico2:["en","es"]
};
let activePreset="natural";
const drafts={};
for(const b of document.querySelectorAll("[data-preset]"))b.addEventListener("click",()=>{activePreset=b.dataset.preset;text.value=languagePresets[language.value][activePreset];});
function supports(id,lang){return engineLanguages[id]?.includes(lang)===true;}
function updateLanguageButtons(reset=false){
 for(const el of document.querySelectorAll("[data-extra-langs]"))el.hidden=!el.dataset.extraLangs.split(",").includes(language.value);
 $("#external-candidates").hidden=language.value==="en";
 for(const b of document.querySelectorAll("[data-engine]")){
  const id=b.dataset.engine,available=supports(id,language.value);
  b.disabled=busy||!available;
  if(reset){
   setStatus(id,available?"按下試聽 · "+languageNames[language.value]:"目前此模型／瀏覽器發音管線不支援"+languageNames[language.value]+"。");
   setProgress(id,0);
  }
 }
}
$("#copy-sample").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(text.value);$("#copy-status").textContent="已複製";}catch{$("#copy-status").textContent="無法使用剪貼簿，請手動選取文字。";}});
let previousLanguage=language.value;
language.addEventListener("change",()=>{
 drafts[previousLanguage]=text.value;stopAll();
 if(currentUrl){URL.revokeObjectURL(currentUrl);currentUrl="";}
 player.removeAttribute("src");player.hidden=true;player.load();now.textContent="尚未播放";
 previousLanguage=language.value;
 text.value=drafts[previousLanguage]??languagePresets[previousLanguage][activePreset];
 text.lang=locales[previousLanguage];
 $("#language-info").textContent=languageNames[previousLanguage]+" · "+Object.keys(engineLanguages).filter(id=>supports(id,previousLanguage)).length+" 個可試選項（仍依裝置支援）";
 updateLanguageButtons(true);
});

const KOKORO_URL="https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js";
const PIPER_URL="https://cdn.jsdelivr.net/npm/@realtimex/piper-tts-web@1.1.1/+esm";
const TRANSFORMERS_URL="https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";
const SUPERTONIC_MODEL="open-world-group/Supertonic-3-ONNX";
const KITTEN_WEB="https://cdn.jsdelivr.net/gh/KittenML/KittenTTS-web@c846fe92858f3447f4912226471f5a63983b3f94/examples/html/assets/kittentts-web.js";
const ORT_JS="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/ort.min.js";
const ORT_BASE="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/";
const UCCHARAN_URL="https://esm.sh/uccharan@1.0.0";
const PAKO_JS="https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js";
const HF="https://huggingface.co/KittenML/";
const TINY_MODELS={
 nano2:{repo:"kitten-tts-2-nano",model:"kitten_tts_2_nano_en_int4.onnx",esModel:"kitten_tts_2_nano_es_int4.onnx",male:"danny"},
 pico2:{repo:"kitten-tts-2-pico",model:"kitten_tts_2_pico_en_int4.onnx",esModel:"kitten_tts_2_pico_es_int4.onnx",male:"otis"}
};
const engines={};
const scripts=new Map();
let currentUrl="",busy=false;
const gpuAdapter=Promise.resolve().then(()=>navigator.gpu?.requestAdapter()).catch(()=>null);
gpuAdapter.then(adapter=>{$("#device-info").textContent="WebGPU Adapter："+(adapter?"可用":"不可用")+" · crossOriginIsolated："+(window.crossOriginIsolated?"是":"否")+" · WASM 多執行緒條件："+(window.crossOriginIsolated&&typeof SharedArrayBuffer!=="undefined"?"具備（仍依 runtime 設定）":"不具備")+" · 邏輯核心："+(navigator.hardwareConcurrency||"未知");});

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
 currentUrl=URL.createObjectURL(blob);player.src=currentUrl;player.playbackRate=1;player.hidden=false;
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
 const lang=language.value,locale=locales[lang];
 const u=new SpeechSynthesisUtterance(v);u.lang=locale;u.rate=Number(speed.value);
 if(!speechSynthesis.getVoices().length)await new Promise(resolve=>{
  const done=()=>{clearTimeout(timer);speechSynthesis.removeEventListener("voiceschanged",done);resolve();};
  const timer=setTimeout(done,1000);speechSynthesis.addEventListener("voiceschanged",done,{once:true});
 });
 const voices=speechSynthesis.getVoices().filter(x=>x.lang.toLowerCase().split(/[-_]/)[0]===lang).sort((a,b)=>Number(b.lang.toLowerCase().replace("_","-")===locale.toLowerCase())-Number(a.lang.toLowerCase().replace("_","-")===locale.toLowerCase()));const female=/female|samantha|zira|aria|jenny|ava/i,male=/\bmale\b|david|mark|guy|ryan/i;
 const chosen=voices.find(x=>(voice.value==="female"?female:male).test(x.name))||voices[0];if(!chosen)throw Error("此裝置沒有"+languageNames[lang]+"系統音色，請先安裝對應語言語音。");u.voice=chosen;
 setStatus("system","播放中："+chosen.name+" · "+chosen.lang+(chosen.localService?" · 本機":" · 系統可能使用網路"));now.textContent="系統 TTS · "+languageNames[lang];
 u.onerror=e=>{if(!["canceled","interrupted"].includes(e.error)&&language.value===lang)setStatus("system","播放失敗："+e.error,true);};
 u.onend=()=>{if(language.value===lang)setStatus("system","完成："+chosen.name+" · "+chosen.lang);};
 speechSynthesis.speak(u);
}

function timing(prep,gen,warm){
 return (warm?"已載入":"首次準備")+" "+(prep/1000).toFixed(2)+" 秒 · 生成 "+(gen/1000).toFixed(2)+" 秒";
}
async function requireGpu(){if(!await gpuAdapter)throw Error("此裝置沒有可用 WebGPU Adapter；請改試 WASM 卡片。");}
async function kokoroTts(id="kokoro",device="wasm",dtype="q8"){
 const v=sample(),selectedVoice=voice.value==="female"?"af_heart":"am_michael",rate=Number(speed.value);stopAll();
 const started=performance.now(),warm=!!engines[id];if(device==="webgpu")await requireGpu();
 setStatus(id,"載入 Kokoro "+device+" "+dtype+"…");
 if(!engines[id]){
  const {KokoroTTS}=await import(KOKORO_URL);
  engines[id]=await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX",{device,dtype,progress_callback:i=>{if(i?.status==="progress"&&typeof i.progress==="number")setProgress(id,i.progress)}});
  setProgress(id,100);
 }
 const ready=performance.now();setStatus(id,"生成語音…");
 const a=await engines[id].generate(v,{voice:selectedVoice,speed:rate});
 const result=timing(ready-started,performance.now()-ready,warm);
 await playBlob(a.toBlob(),"Kokoro "+device+" "+dtype,result);setStatus(id,result);
}
async function piperTts(){
 const v=sample(),rate=Number(speed.value),voiceId=language.value==="zh"?"zh_CN-huayan-medium":language.value==="es"?"es_ES-carlfm-x_low":voice.value==="female"?"en_US-hfc_female-medium":"en_US-hfc_male-medium";stopAll();
 const id="piper",started=performance.now();setStatus(id,"載入 Piper runtime…");
 const sdk=engines.piperSDK||(engines.piperSDK=await import(PIPER_URL));
 const key="piper:"+voiceId,warm=!!engines[key];
 if(!warm){
  const progress=p=>{if(p.total>0)setProgress(id,p.loaded/p.total*100);};
  const stored=await sdk.stored().catch(()=>[]);
  if(!stored.includes(voiceId)){setStatus(id,"下載 "+voiceId+"…");await sdk.download(voiceId,progress);}
  engines[key]=true;
 }
 const ready=performance.now();setStatus(id,"生成語音（首次生成可能含 session 初始化）…");
 let blob;try{blob=await sdk.predict({text:v,voiceId});}catch(e){delete engines[key];throw e;}
 const result=timing(ready-started,performance.now()-ready,warm);
 await playBlob(blob,"Piper WASM",result);player.playbackRate=rate;setProgress(id,100);setStatus(id,result+" · "+voiceId);
}
async function piperPlusTts(id="piperPlus"){
 const v=sample(),lang=language.value,rate=Number(speed.value),model=id==="piperJapanese"?"ayousanz/piper-plus-tsukuyomi-chan":"ayousanz/piper-plus-css10-ja-6lang";stopAll();
 const started=performance.now(),warm=!!engines[id];
 if(!warm){
  setStatus(id,"準備 Piper Plus 與發音字典…");
  const [{PiperPlus},ort]=await Promise.all([import("piper-plus"),import("onnxruntime-web")]);
  engines[id]=await PiperPlus.initialize({model,ort,onProgress:({progress,message})=>{
   if(Number.isFinite(progress))setProgress(id,progress*100);
   if(message)setStatus(id,message);
  }});
 }
 const ready=performance.now();setStatus(id,"生成"+languageNames[lang]+"…");
 const a=await engines[id].synthesize(v,{language:lang,lengthScale:1/rate});
 if(!a.samples?.length)throw Error("Piper Plus 未回傳有效 PCM");
 const result=timing(ready-started,performance.now()-ready,warm);
 await playBlob(a.toBlob(),(id==="piperJapanese"?"Piper Plus:つくよみちゃん":"Piper Plus CSS10")+" · "+languageNames[lang],result);
 setProgress(id,100);setStatus(id,result+" · 固定音色（不受男女聲選擇影響）");
}
function splitSupertonic(value,lang){
 const limit=lang==="ja"||lang==="ko"?120:280,chars=Array.from(value.trim()),chunks=[];
 let offset=0;
 while(offset<chars.length){
  let end=Math.min(offset+limit,chars.length);
  if(end<chars.length){
   for(let i=end;i>offset+Math.floor(limit/2);i--){
    if(/[。！？.!?；;、，,\s]/u.test(chars[i-1])){end=i;break;}
   }
  }
  const chunk=chars.slice(offset,end).join("").trim();
  if(chunk)chunks.push(chunk);
  offset=end;
 }
 return chunks;
}
async function supertonicTts(id,device){
 const v=sample(),lang=language.value,rate=Number(speed.value),style=voice.value==="female"?"F1":"M1";stopAll();
 const started=performance.now(),warm=!!engines[id];if(device==="webgpu")await requireGpu();
 if(!warm){
  setStatus(id,"載入 Supertonic 3（大型模型）…");
  const {pipeline}=await import(TRANSFORMERS_URL);
  const dtype=device==="webgpu"?"fp16":{text_encoder:"fp32",latent_denoiser:"q8",voice_decoder:"fp32"};
  engines[id]=await pipeline("text-to-speech",SUPERTONIC_MODEL,{device,dtype,progress_callback:i=>{if(i?.status==="progress"&&typeof i.progress==="number")setProgress(id,i.progress);}});
  setProgress(id,100);
 }
 const ready=performance.now(),chunks=splitSupertonic(v,lang),parts=[];
 let sampleRate=0;for(let i=0;i<chunks.length;i++){
  setStatus(id,"生成 "+(i+1)+"/"+chunks.length+"…");
  const a=await engines[id]("<"+lang+">"+chunks[i]+"</"+lang+">",{speaker_embeddings:"https://huggingface.co/"+SUPERTONIC_MODEL+"/resolve/main/voices/"+style+".bin",num_inference_steps:5,speed:rate});
  if(!a.audio?.length||!a.sampling_rate)throw Error("Supertonic 未回傳有效 PCM");
  if(sampleRate&&sampleRate!==a.sampling_rate)throw Error("音訊取樣率不一致");
  sampleRate=a.sampling_rate;parts.push(a.audio);
 }
 const gap=Math.round(sampleRate*0.12),pcm=new Float32Array(parts.reduce((n,a)=>n+a.length,0)+gap*(parts.length-1));let offset=0;
 for(const a of parts){pcm.set(a,offset);offset+=a.length+gap;}
 const result=timing(ready-started,performance.now()-ready,warm);
 await playBlob(wavBlob(pcm,sampleRate),"Supertonic 3 "+device,result);setStatus(id,result+" · "+(pcm.length/sampleRate).toFixed(1)+" 秒音訊");
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
async function loadTiny(kind,lang){
 const cacheKey=kind+":"+lang;
 if(engines[cacheKey])return engines[cacheKey];
 const cfg=TINY_MODELS[kind],base=HF+cfg.repo+"/resolve/main/";
 setStatus(kind,"準備 ONNX runtime / phonemizer…");
 let rt;
 if(lang==="es"){
  await Promise.all([loadScript(PAKO_JS),loadScript(ORT_JS)]);
  const ort=window.ort;if(!ort)throw Error("ONNX runtime 初始化失敗");
  ort.env.wasm.numThreads=1;ort.env.wasm.wasmPaths=ORT_BASE;
  const {phonemize}=await import(UCCHARAN_URL);
  rt={ort,phon:{phonemize:async value=>String(await phonemize(value,{lang:"es"}))}};
 }else rt=await tinyRuntime();
 setProgress(kind,8);
 const [model,voicesData,vocabData]=await Promise.all([
  fetchCached(base+(lang==="es"?cfg.esModel:cfg.model),kind,"int4 ONNX"),
  fetchCached(base+"voices_"+lang+".npz",kind,languageNames[lang]+" voice pack"),
  fetchCached(base+"vocab.json",kind,"vocab")
 ]);
 setProgress(kind,70);const vocab=JSON.parse(new TextDecoder().decode(vocabData)),voices=parseNPZ(voicesData),key=voice.value==="female"?"eleanor":"danny";
 const embedding=voices[Object.keys(voices)[0]];if(!embedding)throw Error("找不到 voice embedding");
 setStatus(kind,"建立 ONNX session…");const session=await rt.ort.InferenceSession.create(model,{executionProviders:["wasm"],graphOptimizationLevel:"all",intraOpNumThreads:1});
 setProgress(kind,100);return engines[cacheKey]={...rt,session,vocab,voices,cfg};
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
 const label=kind==="nano2"?"Kitten TTS 2 Nano int4":"Kitten TTS 2 Pico int4",v=sample(),lang=language.value;stopAll();const started=performance.now(),warm=!!engines[kind+":"+lang],e=await loadTiny(kind,lang),ready=performance.now();
 setStatus(kind,"phonemize + 生成長句…");const phonemes=await e.phon.phonemize(v),tokens=encodeTiny(phonemes,e.vocab);if(tokens.length<4||tokens.length>353)throw Error("此文字的有效音素數量不適合 tiny 實驗 port，請換短一點的範例。");
 const key=lang==="es"?(voice.value==="female"?"sofia":"pablo"):(voice.value==="female"?"eleanor":e.cfg.male),emb=e.voices[key];if(!emb)throw Error("找不到指定音色："+key);const row=Math.min(tokens.length-1,emb.rows-1),style=emb.data.slice(row*emb.cols,(row+1)*emb.cols);
 const feeds={input_ids:new e.ort.Tensor("int64",BigInt64Array.from(tokens.map(BigInt)),[1,tokens.length]),style:new e.ort.Tensor("float32",style,[1,style.length]),speed:new e.ort.Tensor("float32",Float32Array.of(Number(speed.value)),[1])};
 const r=tinyResult(await e.session.run(feeds)),pcm=finishTiny(r.samples,r.durations);const result=timing(ready-started,performance.now()-ready,warm);await playBlob(wavBlob(pcm,24000),label+" · "+languageNames[lang],result);
 setStatus(kind,result+" · "+key+" · 實驗 port");
}

const handlers={system:systemTts,kokoro:()=>kokoroTts(),kokoroGpuQ8:()=>kokoroTts("kokoroGpuQ8","webgpu","q8"),kokoroGpuFp32:()=>kokoroTts("kokoroGpuFp32","webgpu","fp32"),piper:piperTts,piperPlus:()=>piperPlusTts(),piperJapanese:()=>piperPlusTts("piperJapanese"),supertonicWasm:()=>supertonicTts("supertonicWasm","wasm"),supertonicGpu:()=>supertonicTts("supertonicGpu","webgpu"),kitten08:kitten08Tts,nano2:()=>tinyTts("nano2"),pico2:()=>tinyTts("pico2")};
for(const b of document.querySelectorAll("[data-engine]"))b.addEventListener("click",async()=>{const id=b.dataset.engine;if(busy||!supports(id,language.value))return;busy=true;language.disabled=true;updateLanguageButtons();try{await handlers[id]()}catch(e){console.error(e);setStatus(id,"失敗："+(e instanceof Error?e.message:String(e)),true)}finally{busy=false;language.disabled=false;updateLanguageButtons()}});
updateLanguageButtons();
window.addEventListener("pagehide",()=>{try{engines.piperPlus?.dispose?.()}catch{}try{engines.piperJapanese?.dispose?.()}catch{}stopAll();if(currentUrl)URL.revokeObjectURL(currentUrl);try{engines.kitten08?.dispose?.()}catch{}try{engines.tinyRuntime?.phon?.dispose?.()}catch{}});
})();