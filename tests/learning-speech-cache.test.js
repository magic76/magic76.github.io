const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const speech=fs.readFileSync("web-spa/src/teacher/learningSpeech.ts","utf8");
const worker=fs.readFileSync("web-spa/src/teacher/learningSpeech.worker.ts","utf8");

test("Kitten Nano and Pico share cache; uccharan assets stay pinned to jsDelivr",()=>{
 assert.match(worker,/const UCCHARAN_BASE="https:\/\/cdn\.jsdelivr\.net\/npm\/uccharan@1\.0\.0\/"/);
 assert.match(worker,/const UCCHARAN_URL=UCCHARAN_BASE\+"index\.js"/);
 assert.doesNotMatch(worker,/esm\.sh\/uccharan/);
 assert.match(worker,/fetchCached\(UCCHARAN_BASE\+"dist\/uccharan_wasm_bg\.wasm"\)/);
 assert.match(worker,/fetchCached\(UCCHARAN_BASE\+"data\/"\+g2pLang\+"\.ucd"\)/);
 assert.match(worker,/await init\(\{wasm\}\)/);
 assert.match(worker,/await loadLanguage\(g2pLang,pack\)/);
 assert.match(worker,/phonemize:phonemizeSync/);
 assert.match(worker,/engine\.phonemize\(text,\{lang:g2pLanguage\(language\),profile:"kitten"\}\)/);
 assert.match(worker,/const cacheName="koolo-learning-speech-v1"/);
 assert.match(worker,/fetchCached\(base\+modelName\)/);
 assert.match(worker,/fetchCached\(base\+"voices_"\+language\+"\.npz"\)/);
 assert.match(worker,/fetchCached\(base\+"vocab\.json"\)/);
 assert.match(worker,/scope\.importScripts\(ORT_JS\)/);
 assert.match(worker,/await engine\.session\.run\(feeds\)/);
 assert.match(worker,/scope\.postMessage\(\{id:request\.id,ok:true,buffer\},\[buffer\]\)/);
 assert.doesNotMatch(worker,/window\.|document\./);
});

test("warm model cache avoids the cold download hint and persistence is requested once",async()=>{
 const start=speech.indexOf("function modelUrl("),end=speech.indexOf("function getWorker()",start);
 assert.ok(start>=0&&end>start);
 const code=stripTypeScriptTypes(speech.slice(start,end),{mode:"strip"});
 const nano="https://huggingface.co/KittenML/kitten-tts-2-nano/resolve/main/kitten_tts_2_nano_en_int4.onnx";
 const pico="https://huggingface.co/KittenML/kitten-tts-2-pico/resolve/main/kitten_tts_2_pico_fr_int4.onnx";
 const stored=new Set([nano,pico]);
 let requests=0;
 const ctx={
  window:{caches:true},
  caches:{open:async name=>{
   assert.equal(name,"koolo-learning-speech-v1");
   return{match:async url=>stored.has(url)?{ok:true}:undefined};
  }},
  navigator:{storage:{persist:()=>{requests++;return Promise.reject(new Error("denied"))}}}
 };
 const module=vm.runInNewContext(
  'const NANO_BASE="https://huggingface.co/KittenML/kitten-tts-2-nano/resolve/main/";'+
  'const PICO_BASE="https://huggingface.co/KittenML/kitten-tts-2-pico/resolve/main/";'+
  'const MODEL_CACHE="koolo-learning-speech-v1";let persistenceRequested=false;'+code+
  ';({hasCachedTinyModel,requestPersistentStorage})',ctx);
 assert.equal(await module.hasCachedTinyModel("en"),true);
 assert.equal(await module.hasCachedTinyModel("fr"),true);
 assert.equal(await module.hasCachedTinyModel("de"),false);
 module.requestPersistentStorage();module.requestPersistentStorage();
 await Promise.resolve();
 assert.equal(requests,1);
 stored.delete(nano);
 assert.equal(await module.hasCachedTinyModel("en"),false);
 assert.match(speech,/if\(!hit\)options\.onModelStatus\?\.\("loading"\)/);
 assert.match(speech,/void ensureTiny\(language\)\.then/);
 assert.match(speech,/await systemSpeak\(value,language,speed\)/);
});

test("short speech is one segment; long text produces ordered playable clauses",()=>{
 const start=speech.indexOf("export function segmentLearningSpeech("),end=speech.indexOf("async function systemSpeak(",start);
 assert.ok(start>=0&&end>start);
 const code=stripTypeScriptTypes(speech.slice(start,end).replace("export function","function"),{mode:"strip"});
 const segment=vm.runInNewContext(code+"; segmentLearningSpeech",{});
 assert.deepEqual(Array.from(segment("Nice to meet you, Zoe.")),["Nice to meet you, Zoe."]);
 const long="At first, I thought learning English meant memorizing every word perfectly, but after I started speaking a little every day, I realized that rhythm, confidence, and the courage to keep going mattered more than sounding perfect.";
 const chunks=Array.from(segment(long));
 assert.ok(chunks.length>=2);
 assert.ok(chunks.every(part=>part.length<=100));
 assert.match(chunks[0],/^At first,/);
});

test("English Nano requests en-us.ucd, never en.ucd; French Pico retains fr.ucd",async()=>{
 const start=worker.indexOf("function g2pLanguage("),end=worker.indexOf("function encodeTiny(",start);
 assert.ok(start>=0&&end>start);
 const code=stripTypeScriptTypes(worker.slice(start,end),{mode:"strip"});
 const requests=[],loaded=[];
 const ctx={
  tinyEngines:new Map(),NANO_BASE:"https://nano/",PICO_BASE:"https://pico/",
  UCCHARAN_BASE:"https://cdn.jsdelivr.net/npm/uccharan@1.0.0/",
  UCCHARAN_URL:"https://cdn.jsdelivr.net/npm/uccharan@1.0.0/index.js",
  TextDecoder,fetchCached:async url=>{requests.push(url);return new Uint8Array([123,125])},
  getRuntime:async()=>({InferenceSession:{create:async()=>({})}}),
  importExternal:async()=>({init:async()=>{},loadLanguage:async(lang,pack)=>loaded.push(lang),phonemizeSync:()=>""}),
  parseNPZ:async()=>({})
 };
 const load=vm.runInNewContext(code+";loadTiny",ctx);
 await load("en");await load("fr");
 assert.ok(requests.includes(ctx.UCCHARAN_BASE+"data/en-us.ucd"));
 assert.ok(requests.includes(ctx.UCCHARAN_BASE+"data/fr.ucd"));
 assert.ok(!requests.includes(ctx.UCCHARAN_BASE+"data/en.ucd"));
 assert.deepEqual(loaded,["en-us","fr"]);
 assert.match(worker,/lang:g2pLanguage\(language\),profile:"kitten"/);
});
