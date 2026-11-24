const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const speech=fs.readFileSync("web-spa/src/teacher/learningSpeech.ts","utf8");
const worker=fs.readFileSync("web-spa/src/teacher/learningSpeech.worker.ts","utf8");
function slice(source,start,end){
 const a=source.indexOf(start),b=source.indexOf(end,a);
 assert.ok(a>=0&&b>a,start+" exists");
 return stripTypeScriptTypes(source.slice(a,b),{mode:"strip"});
}

test("Nano and Pico use pinned ONNX/WASM assets and the same persistent cache",()=>{
 assert.match(worker,/const UCCHARAN_BASE="https:\/\/cdn\.jsdelivr\.net\/npm\/uccharan@1\.0\.0\/"/);
 assert.match(worker,/fetchCached\(UCCHARAN_BASE\+"data\/"\+g2pLang\+"\.ucd"\)/);
 assert.match(worker,/fetchCached\(base\+modelName\)/);
 assert.match(worker,/fetchCached\(base\+"voices_"\+language\+"\.npz"\)/);
 assert.match(worker,/fetchCached\(base\+"vocab\.json"\)/);
 assert.match(worker,/scope\.importScripts\(ORT_JS\)/);
 assert.match(worker,/await engine\.session\.run\(feeds\)/);
 assert.match(worker,/const cacheName="koolo-learning-speech-v1"/);
 assert.match(worker,/kitten_tts_2_nano_en_int4\.onnx/);
 assert.match(worker,/g2pLanguage\(language\).*?"en-us"/);
 assert.match(speech,/storage\.persist\(\)/);
 assert.doesNotMatch(speech+worker,/from_pretrained|kokoro-js@|onnx-community\/Kokoro.*resolve\/main/);
});

test("cache hits for en/US/GB share Nano weights and never require Kokoro weights",async()=>{
 const code=slice(speech,"function modelLanguage(","function requestPersistentStorage(");
 const nano="https://huggingface.co/KittenML/kitten-tts-2-nano/resolve/main/";
 const pico="https://huggingface.co/KittenML/kitten-tts-2-pico/resolve/main/";
 const stored=new Set([nano+"kitten_tts_2_nano_en_int4.onnx",pico+"kitten_tts_2_pico_de_int4.onnx"]);
 const context={NANO_BASE:nano,PICO_BASE:pico,MODEL_CACHE:"koolo-learning-speech-v1",
  preferredLearningEngine:code=>code.toLowerCase().startsWith("en")?"nano":"pico",
  window:{caches:true},caches:{open:async()=>({match:async url=>stored.has(url)?{ok:true}:undefined})}};
 const {modelUrl,hasCachedTinyModel}=vm.runInNewContext(code+";({modelUrl,hasCachedTinyModel})",context);
 for(const en of ["en","en-US","en-GB"]){
  assert.equal(modelUrl(en),nano+"kitten_tts_2_nano_en_int4.onnx");
  assert.equal(await hasCachedTinyModel(en),true,en);
 }
 assert.equal(await hasCachedTinyModel("de"),true);
 assert.equal(await hasCachedTinyModel("fr"),false);
 assert.match(speech,/if\(!hit\)options\.onModelStatus\?\.\("loading",language\)/);
 assert.match(speech,/\.finally\(\(\)=>\{if\(id===playbackId&&!hit\)options\.onModelStatus\?\.\("ready",language\)\}\)/);
});

test("obsolete model cleanup deletes only old Kokoro entries, never other ML weights",async()=>{
 const code=slice(speech,"let legacyCleanupRequested=","const NANO_BASE=");
 const deleted=[],kept="https://huggingface.co/another-model/resolve/main/model.onnx";
 const cache={keys:async()=>[{url:"https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/onnx/model.onnx"},{url:kept}],delete:async req=>{deleted.push(req.url);return true}};
 const names=["transformers-cache","kokoro-voices"];
 const caches={keys:async()=>names,open:async name=>{assert.equal(name,"transformers-cache");return cache},delete:async name=>{deleted.push(name);return true}};
 const cleanup=vm.runInNewContext(code+";cleanupLegacyKokoroCache",{caches});
 cleanup();cleanup();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(deleted.filter(x=>x==="kokoro-voices").length,1);
 assert.equal(deleted.filter(x=>x.includes("Kokoro-82M")).length,1);
 assert.ok(!deleted.includes(kept));
});

test("uccharan maps English only to real en-us.ucd; French remains fr.ucd",async()=>{
 const code=slice(worker,"function g2pLanguage(","function encodeTiny(");
 const requests=[],loaded=[];
 const ctx={tinyEngines:new Map(),PICO_BASE:"https://pico/",NANO_BASE:"https://nano/",
  UCCHARAN_BASE:"https://cdn.jsdelivr.net/npm/uccharan@1.0.0/",
  UCCHARAN_URL:"https://cdn.jsdelivr.net/npm/uccharan@1.0.0/index.js",
  TextDecoder,fetchCached:async url=>{requests.push(url);return new Uint8Array([123,125])},
  getRuntime:async()=>({InferenceSession:{create:async()=>({})}}),
  importExternal:async()=>({init:async()=>{},loadLanguage:async lang=>loaded.push(lang),phonemizeSync:()=>""}),
  parseNPZ:async()=>({})
 };
 const load=vm.runInNewContext(code+";loadTiny",ctx);
 await load("en");await load("fr");
 assert.ok(requests.includes("https://nano/kitten_tts_2_nano_en_int4.onnx"));
 assert.ok(requests.includes("https://pico/kitten_tts_2_pico_fr_int4.onnx"));
 assert.ok(requests.includes(ctx.UCCHARAN_BASE+"data/en-us.ucd"));
 assert.ok(requests.includes(ctx.UCCHARAN_BASE+"data/fr.ucd"));
 assert.ok(!requests.some(url=>url.endsWith("/data/en.ucd")));
 assert.deepEqual(loaded,["en-us","fr"]);
});

test("every Kitten chunk retains opening consonant and tail, with at least 80ms edge silence",async()=>{
 const code=slice(worker,"function trimTiny(","async function tinyBlob(");
 const {trimTiny,wavBlob}=vm.runInNewContext(code+";({trimTiny,wavBlob})",{Float32Array,ArrayBuffer,DataView,Blob});
 const samples=new Float32Array(24000);
 // Voiced onset and tail deliberately lie inside frames older duration trimming removed.
 samples.fill(0.65,150,500);
 samples.fill(0.45,23500,23800);
 const durations=[16,4,12];
 for(const keepStart of [true,false]){
  const padded=trimTiny(samples,durations,keepStart);
  assert.equal(padded.length,samples.length+4800,"no waveform samples may be dropped");
  assert.ok(Math.abs(padded[2400+150]-0.65)<1e-5,"early onset survives");
  assert.ok(Math.abs(padded[2400+23750]-0.45)<1e-5,"late sound survives");
  for(const value of padded.subarray(0,2400))assert.equal(value,0);
  for(const value of padded.subarray(-2400))assert.equal(value,0);
  const wav=new DataView(await wavBlob(padded).arrayBuffer());
  assert.equal(wav.getUint32(24,true),24000);
  assert.equal(wav.getUint32(40,true),padded.length*2);
 }
 assert.match(worker,/const padSamples=2400/);
 assert.match(speech,/generateTiny\(chunks\[0\],language,speed,true\)/);
 assert.match(speech,/generateTiny\(chunks\[index\+1\],language,speed,false\)/);
 assert.match(worker,/request\.keepStart!==false/);
});

test("short phrases remain one chunk and long sentences split into ordered clauses",()=>{
 const code=slice(speech,"export function segmentLearningSpeech(","async function systemSpeak(").replace("export function","function");
 const segment=vm.runInNewContext(code+";segmentLearningSpeech",{});
 assert.deepEqual(Array.from(segment("Nice to meet you, Zoe.")),["Nice to meet you, Zoe."]);
 const long="At first, I thought learning English meant memorizing every word perfectly, but after I started speaking a little every day, I realized that rhythm, confidence, and the courage to keep going mattered more than sounding perfect.";
 const chunks=Array.from(segment(long));
 assert.ok(chunks.length>=2&&chunks.every(part=>part.length<=100));
 assert.match(chunks[0],/^At first,/);
});
