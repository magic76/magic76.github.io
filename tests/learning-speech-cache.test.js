const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const speech=fs.readFileSync("web-spa/src/teacher/learningSpeech.ts","utf8");

test("Pico uccharan loads the pinned jsDelivr ESM, WASM and language pack through Cache Storage",()=>{
 assert.match(speech,/const UCCHARAN_BASE="https:\/\/cdn\.jsdelivr\.net\/npm\/uccharan@1\.0\.0\/"/);
 assert.match(speech,/const UCCHARAN_URL=UCCHARAN_BASE\+"index\.js"/);
 assert.doesNotMatch(speech,/esm\.sh\/uccharan/);
 assert.match(speech,/fetchCached\(UCCHARAN_BASE\+"dist\/uccharan_wasm_bg\.wasm"\)/);
 assert.match(speech,/fetchCached\(UCCHARAN_BASE\+"data\/"\+language\+"\.ucd"\)/);
 assert.match(speech,/await init\(\{wasm\}\)/);
 assert.match(speech,/await loadLanguage\(language,pack\)/);
 assert.match(speech,/phonemize:phonemizeSync/);
 assert.match(speech,/engine\.phonemize\(text,\{lang:language,profile:"kitten"\}\)/);
 assert.match(speech,/const cacheName="koolo-learning-speech-v1"/);
 assert.match(speech,/fetchCached\(PICO_BASE\+"voices_"\+language\+"\.npz"\)/);
 assert.match(speech,/fetchCached\(PICO_BASE\+"vocab\.json"\)/);
 assert.match(speech,/fetchCached\(PICO_BASE\+"kitten_tts_2_pico_"\+language\+"_int4\.onnx"\)/);
});

test("Kokoro q8 WASM resumes from the model cache without showing cold-download status",()=>{
 assert.match(speech,/from_pretrained\(KOKORO_MODEL,\{device:"wasm",dtype:"q8"\}\)/);
 assert.match(speech,/if\(preferred==="kokoro"&&!kokoroReady\)\{\s*if\(await hasCachedKokoroModel\(\)\)/);
 assert.match(speech,/try\{await loadKokoro\(\);options\.onModelStatus\?\.\("ready"\)\}/);
 assert.match(speech,/\}else\{\s*options\.onModelStatus\?\.\("loading"\)/);
 assert.match(speech,/await systemSpeak\(value,language,speed\)/);
});

test("storage persistence is requested once only when model cache checks find weights",async()=>{
 const start=speech.indexOf("async function hasCachedModel(");
 const end=speech.indexOf("async function loadKokoro()",start);
 assert.ok(start>=0&&end>start);
 const source=stripTypeScriptTypes(speech.slice(start,end),{mode:"strip"});
 let requests=0;
 const stores={
  "transformers-cache":["https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/onnx/model_quantized.onnx"],
  "koolo-learning-speech-v1":["https://huggingface.co/KittenML/kitten-tts-2-pico/resolve/main/kitten_tts_2_pico_fr_int4.onnx"]
 };
 const context={
  window:{caches:true},
  caches:{open:async name=>({keys:async()=>((stores[name]||[]).map(url=>({url})))})},
  navigator:{storage:{persist:()=>{requests++;return Promise.reject(new Error("denied"))}}},
  PICO_BASE:"https://huggingface.co/KittenML/kitten-tts-2-pico/resolve/main/"
 };
 const funcs=vm.runInNewContext("let persistenceRequested=false;\n"+source+
  "\n({hasCachedKokoroModel,hasCachedPicoModel,requestPersistentStorage})",context);
 assert.equal(await funcs.hasCachedKokoroModel(),true);
 assert.equal(await funcs.hasCachedPicoModel("fr"),true);
 assert.equal(await funcs.hasCachedPicoModel("de"),false);
 funcs.requestPersistentStorage();
 funcs.requestPersistentStorage();
 await Promise.resolve();
 assert.equal(requests,1);
 stores["transformers-cache"]=[];
 assert.equal(await funcs.hasCachedKokoroModel(),false);
});
