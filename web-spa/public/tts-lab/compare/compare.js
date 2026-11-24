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
 nano2:["es"],pico2:["en","es"],sano:["zh","es"],eeh:["ja"],korean:["ko"]
};
let activePreset="word";
const drafts={};
for(const b of document.querySelectorAll("[data-preset]"))b.addEventListener("click",()=>{activePreset=b.dataset.preset;text.value=languagePresets[language.value][activePreset];});
function supports(id,lang){return engineLanguages[id]?.includes(lang)===true;}
function updateLanguageButtons(reset=false){
 for(const el of document.querySelectorAll("[data-extra-langs]"))el.hidden=!el.dataset.extraLangs.split(",").includes(language.value);
 $("#external-candidates").hidden=![...document.querySelectorAll("[data-extra-langs]")].some(el=>!el.hidden);
 for(const b of document.querySelectorAll("[data-engine]")){
  const id=b.dataset.engine,available=supports(id,language.value);
  b.closest(".model").hidden=!available;
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
 $("#language-info").textContent=languageNames[previousLanguage]+" · "+Object.keys(engineLanguages).filter(id=>supports(id,previousLanguage)).length+" 個本站試聽選項（仍依裝置支援）";
 updateLanguageButtons(true);
});

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


// Research engines have their own workers, with language-keyed sessions. Nothing
// loads on first visit; no engine silently substitutes system speech on failure.
const researchWorkers=new Map();
let requestCounter=0;
function workerRequest(worker,id,message){
 const req=++requestCounter;
 return new Promise((resolve,reject)=>{
  let timer;
  const cleanup=()=>{clearTimeout(timer);worker.removeEventListener("message",onMessage);worker.removeEventListener("error",onError);worker.removeEventListener("messageerror",onError);};
  const fail=err=>{cleanup();reject(err);};
  const onError=event=>fail(Error(event.message||"本機推論環境載入失敗"));
  const onMessage=({data})=>{
   if(data.type==="status"){
    setStatus(id,data.text);if(Number.isFinite(data.progress))setProgress(id,data.progress*100);
    return;
   }
   if(data.id!==req)return;
   if(data.type==="error")fail(Error(data.message));
   else if(data.type==="ready"||data.type==="done"){cleanup();resolve(data);}
  };
  worker.addEventListener("message",onMessage);worker.addEventListener("error",onError);worker.addEventListener("messageerror",onError);
  timer=setTimeout(()=>fail(Error("本機模型操作逾時，請重試")),message.type==="load"?240000:60000);
  try{worker.postMessage({...message,id:req});}catch(e){fail(e);}
 });
}
async function researchTts(id){
 const lang=language.value,v=sample(),rate=Number(speed.value),selected=voice.value,key=id+":"+lang;
 if(id==="korean"&&!researchWorkers.has(key)&&!window.confirm("韓文 KSS 模型僅供個人非商業研究；首次下載約 40 MB 或更多。確定繼續？"))return;
 stopAll();
 const started=performance.now(),warm=researchWorkers.has(key);
 let worker=researchWorkers.get(key);
 try{
  if(!worker){
   worker=new Worker("./lightweight-worker.js");
   setStatus(id,"準備本機模型…");setProgress(id,0);
   await workerRequest(worker,id,{type:"load",engine:id,lang});
   researchWorkers.set(key,worker);
  }
  const ready=performance.now();
  setProgress(id,100);setStatus(id,"生成語音…");
  const result=await workerRequest(worker,id,{type:"speak",text:v,voice:selected,speed:rate});
  if(!(result.audio instanceof Float32Array)||!result.audio.length||!Number.isFinite(result.sampleRate)||result.sampleRate<=0)throw Error("未回傳有效音訊");
  const elapsed=timing(ready-started,performance.now()-ready,warm),name={sano:"sanoTTS",eeh:"eeh-1",korean:"Tiny Voca 韓文"}[id];
  await playBlob(wavBlob(result.audio,result.sampleRate),name+" · "+result.voice,elapsed);
  setStatus(id,elapsed+" · "+result.voice+" · "+(result.audio.length/result.sampleRate).toFixed(1)+" 秒音訊");
 }catch(e){
  worker?.terminate();researchWorkers.delete(key);throw e;
 }
}

const handlers={system:systemTts,nano2:()=>tinyTts("nano2"),pico2:()=>tinyTts("pico2"),sano:()=>researchTts("sano"),eeh:()=>researchTts("eeh"),korean:()=>researchTts("korean")};
for(const b of document.querySelectorAll("[data-engine]"))b.addEventListener("click",async()=>{const id=b.dataset.engine;if(busy||!supports(id,language.value))return;busy=true;language.disabled=true;updateLanguageButtons();try{await handlers[id]()}catch(e){console.error(e);setStatus(id,"失敗："+(e instanceof Error?e.message:String(e)),true)}finally{busy=false;language.disabled=false;updateLanguageButtons()}});
$("#language-info").textContent="英文 · 2 個本站試聽選項";
updateLanguageButtons();
window.addEventListener("pagehide",()=>{for(const worker of researchWorkers.values())worker.terminate();researchWorkers.clear();stopAll();if(currentUrl)URL.revokeObjectURL(currentUrl);try{engines.tinyRuntime?.phon?.dispose?.()}catch{}});
})();