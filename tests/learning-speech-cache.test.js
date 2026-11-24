const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const speech=fs.readFileSync("web-spa/src/teacher/learningSpeech.ts","utf8");
const worker=fs.readFileSync("web-spa/src/teacher/learningSpeech.worker.ts","utf8");

test("Pico retains pinned uccharan runtime and classic worker cache",()=>{
 assert.match(worker,/const UCCHARAN_BASE="https:\/\/cdn\.jsdelivr\.net\/npm\/uccharan@1\.0\.0\/"/);
 assert.match(worker,/fetchCached\(UCCHARAN_BASE\+"data\/"\+g2pLang\+"\.ucd"\)/);
 assert.match(worker,/fetchCached\(base\+modelName\)/);
 assert.match(worker,/fetchCached\(base\+"voices_"\+language\+"\.npz"\)/);
 assert.match(worker,/fetchCached\(base\+"vocab\.json"\)/);
 assert.match(worker,/scope\.importScripts\(ORT_JS\)/);
 assert.match(worker,/await engine\.session\.run\(feeds\)/);
 assert.match(worker,/const cacheName="koolo-learning-speech-v1"/);
 assert.doesNotMatch(worker,/kitten_tts_2_nano_en_int4|en-us\.ucd/);
});

test("Kokoro cache matches the actual WebGPU fp32 or WASM q8 ONNX file",async()=>{
 const start=speech.indexOf("function hasWebGpu("),end=speech.indexOf("function requestPersistentStorage()",start);
 assert.ok(start>=0&&end>start);
 const code=stripTypeScriptTypes(speech.slice(start,end).replace("export function","function"),{mode:"strip"});
 const model="https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/onnx/";
 const pico="https://huggingface.co/KittenML/kitten-tts-2-pico/resolve/main/kitten_tts_2_pico_fr_int4.onnx";
 const stored=new Set([model+"model.onnx",pico]),navigator={gpu:{}};
 const ctx={window:{caches:true},navigator,URL,caches:{open:async()=>({
  match:async url=>stored.has(url)?{ok:true}:undefined,keys:async()=>[...stored].map(url=>({url}))
 })}};
 const mod=vm.runInNewContext(
  'const KOKORO_MODEL_ID="onnx-community/Kokoro-82M-v1.0-ONNX";'+
  'const KOKORO_BASE="https://huggingface.co/"+KOKORO_MODEL_ID+"/resolve/main/onnx/";'+
  'const KOKORO_CACHE="transformers-cache";'+
  'const PICO_BASE="https://huggingface.co/KittenML/kitten-tts-2-pico/resolve/main/";'+
  'const MODEL_CACHE="koolo-learning-speech-v1";'+code+
  ';({hasCachedTinyModel,learningSpeechDownloadSettings})',ctx);
 assert.equal(await mod.hasCachedTinyModel("en"),true);
 assert.equal(await mod.hasCachedTinyModel("fr"),true);
 assert.equal(mod.learningSpeechDownloadSettings().size,310);
 delete navigator.gpu;
 assert.equal(await mod.hasCachedTinyModel("en"),false,"q8 must not inherit an fp32 cache hit");
 stored.add(model+"model_quantized.onnx");
 assert.equal(await mod.hasCachedTinyModel("en"),true);
 assert.equal(mod.learningSpeechDownloadSettings().size,88);
 assert.match(speech,/storage\.persist\(\)/);
 assert.match(speech,/if\(!hit\)options\.onModelStatus\?\.\("loading",language\)/);
 assert.match(speech,/void ensureTiny\(language\)\.then/);
 assert.match(speech,/await systemSpeak\(value,language,speed\)/);
});

test("short speech is one segment; long text produces ordered playable clauses",()=>{
 const start=speech.indexOf("export function segmentLearningSpeech("),end=speech.indexOf("async function systemSpeak(",start);
 assert.ok(start>=0&&end>start);
 const code=stripTypeScriptTypes(speech.slice(start,end).replace("export function","function"),{mode:"strip"});
 const segment=vm.runInNewContext(code+"; segmentLearningSpeech",{});
 assert.deepEqual(Array.from(segment("Nice to meet you, Zoe.")),["Nice to meet you, Zoe."]);
 const chunks=Array.from(segment("At first, I thought learning English meant memorizing every word perfectly, but after I started speaking a little every day, I realized that rhythm, confidence, and the courage to keep going mattered more than sounding perfect."));
 assert.ok(chunks.length>=2&&chunks.every(part=>part.length<=100));
 assert.match(chunks[0],/^At first,/);
});

test("French Pico still requests fr.ucd but English never reaches Pico loader",async()=>{
 const start=worker.indexOf("function g2pLanguage("),end=worker.indexOf("function encodeTiny(",start);
 const code=stripTypeScriptTypes(worker.slice(start,end),{mode:"strip"});
 const requests=[],loaded=[];
 const ctx={tinyEngines:new Map(),PICO_BASE:"https://pico/",
  UCCHARAN_BASE:"https://cdn.jsdelivr.net/npm/uccharan@1.0.0/",
  UCCHARAN_URL:"https://cdn.jsdelivr.net/npm/uccharan@1.0.0/index.js",
  TextDecoder,fetchCached:async url=>{requests.push(url);return new Uint8Array([123,125])},
  getRuntime:async()=>({InferenceSession:{create:async()=>({})}}),
  importExternal:async()=>({init:async()=>{},loadLanguage:async(lang,pack)=>loaded.push(lang),phonemizeSync:()=>""}),
  parseNPZ:async()=>({})
 };
 const load=vm.runInNewContext(code+";loadTiny",ctx);
 await assert.rejects(load("en"),/PICO_ONLY/);
 await load("fr");
 assert.ok(requests.includes(ctx.UCCHARAN_BASE+"data/fr.ucd"));
 assert.ok(!requests.some(url=>url.includes("en-us.ucd")||url.includes("nano")));
 assert.deepEqual(loaded,["fr"]);
});
test("Kitten postprocessing preserves the first start token, trims subsequent starts and pads each WAV",async()=>{
 const start=worker.indexOf("function trimTiny("),end=worker.indexOf("async function tinyBlob(",start);
 assert.ok(start>=0&&end>start);
 const code=stripTypeScriptTypes(worker.slice(start,end),{mode:"strip"});
 const {trimTiny,wavBlob}=vm.runInNewContext(code+";({trimTiny,wavBlob})",{Float32Array,ArrayBuffer,DataView,Blob});
 const spf=600,padding=2400,durations=[16,4,12],lead=(durations[0]-1)*spf,trail=(durations.at(-1)-1)*spf;
 const samples=new Float32Array(durations.reduce((sum,n)=>sum+n,0)*spf);
 // The first consonant starts 12.5 ms before the old trim point: it must survive.
 samples.fill(0.6,lead-300,lead+600);
 samples.fill(0.3,lead+1100,lead+2200);
 const first=trimTiny(samples,durations,true),later=trimTiny(samples,durations,false);
 assert.equal(first.length,samples.length-trail+2*padding);
 assert.equal(later.length,samples.length-lead-trail+2*padding);
 assert.ok(Math.abs(first[padding+lead-300]-0.6)<0.0001,"first chunk retains speech in start-token frames");
 assert.ok(Math.abs(later[padding+240]-0.6)<0.0001,"later chunks trim the start-token pause after the fade");
 for(const audio of [first,later]){
  const rms=(items)=>Math.sqrt(items.reduce((sum,s)=>sum+s*s,0)/items.length);
  assert.ok(rms(audio.subarray(0,padding))<0.005,"100 ms digital silence before audio");
  assert.ok(rms(audio.subarray(-padding))<0.005,"100 ms digital silence after audio");
  assert.ok(rms(audio.subarray(0,240))<0.005,"opening 10 ms contains no clipped speech");
  const wav=new DataView(await wavBlob(audio).arrayBuffer());
  assert.equal(wav.getUint32(24,true),24000);
  assert.equal(wav.getUint32(40,true),audio.length*2);
  for(let n=0;n<padding;n++){
   assert.equal(wav.getInt16(44+n*2,true),0,"WAV starts with digital silence");
   assert.equal(wav.getInt16(44+(audio.length-1-n)*2,true),0,"WAV ends with digital silence");
  }
 }
 assert.match(worker,/const lead=keepStart\?0:/);
 assert.match(worker,/const trail=Math\.max\(0,\(durations\[durations\.length-1\]-1\)\*spf\)/);
 assert.match(worker,/const padSamples=2400/);
 assert.doesNotMatch(worker,/\[5000:-10000\]/);
});

test("Pico keeps the first start token; Kokoro bypasses Kitten trimming",()=>{
 assert.match(speech,/generateTiny\(chunks\[0\],language,speed,true\)/);
 assert.match(speech,/generateTiny\(chunks\[index\+1\],language,speed,false\)/);
 assert.match(speech,/requestWorker\(\{type:"generate",language,text,speed,keepStart\}\)/);
 assert.match(worker,/request\.keepStart!==false/);
 assert.match(worker,/trimTiny\(new Float32Array\(waveform\.data\),durations,keepStart\)/);
 assert.doesNotMatch(fs.readFileSync("web-spa/src/teacher/learningSpeech.kokoro.worker.ts","utf8"),/trimTiny\(/);
});
