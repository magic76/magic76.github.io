const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const read=path=>fs.readFileSync(path,"utf8");
const speech=read("web-spa/src/teacher/learningSpeech.ts");
const high=read("web-spa/src/teacher/learningSpeechHighQuality.ts");
const ui=read("web-spa/src/teacher/learningSpeechOptIn.tsx");
const routes=read("web-spa/src/teacher/learningSpeechRoutes.ts");
function slice(source,start,end){
 const a=source.indexOf(start),b=source.indexOf(end,a);
 assert.ok(a>=0&&b>a,"Missing marker: "+start);
 return stripTypeScriptTypes(source.slice(a,b).replace(/^export /gm,""),{mode:"strip"});
}

test("default pronunciation never imports or downloads Kokoro before consent",async()=>{
 const body=stripTypeScriptTypes(speech.slice(speech.indexOf("export async function speakLearningText(")).replace(/^export /,""),{mode:"strip"});
 const played=[],ctx={
  stopLearningSpeech(){},playbackId:0,
  normalizeLearningLanguage:x=>x,preferredLearningEngine:()=>"system",generated:new Map(),
  cacheKey:()=>"",ready:new Set(),localStorage:{getItem:()=>null},
  systemSpeak:async text=>played.push(text),console:{warn(){}}
 };
 const speak=vm.runInNewContext(body+";speakLearningText",ctx);
 const result=await speak("It depends on the situation.","en");
 assert.equal(result.engine,"system");
 assert.deepEqual(played,["It depends on the situation."]);
 assert.match(speech,/if\(hasOptIn\)\{\s*try\{\s*const high=await import/);
 assert.doesNotMatch(speech,/cleanupLegacyKokoroCache/);
 assert.doesNotMatch(high,/^\s*(?:void )?importHighQuality\(/m,"no automatic import at module evaluation");
});

test("manual UI has 11 complete locales and presents loading only during an explicit import",()=>{
 const locales=['zh-TW','en','ja','ko','es','fr','de','pt-BR','id','vi','th'];
 for(const locale of locales)assert.match(ui,new RegExp('(?:^|\\s|")'+locale.replace("-","\\-")+'(?:"?:)'),locale);
 for(const key of ["add","loading","remove"])assert.equal((ui.match(new RegExp(key+":","g"))||[]).length,11,key);
 assert.match(ui,/status==="loading"&&<span[^>]*role="status"/);
 assert.match(ui,/await mod\.importHighQuality\(language\)/);
 assert.match(ui,/await mod\.removeHighQuality\(language\)/);
 for(const path of ["web-spa/src/teacher/PhrasebookPage.tsx","web-spa/src/teacher/VocabularyPage.tsx","web-spa/src/pages/SettingsPage.tsx","web-spa/src/live/TextChatPanel.tsx"])
  assert.match(read(path),/<LearningSpeechOptIn language=/,path);
 const css=read("web-spa/src/teacher/learningSpeechOptIn.css");
 assert.match(css,/min-height:44px/);
 assert.match(css,/font-size:14px/);
});

test("import routes the original #908 languages but keeps Nano and Pico as unimported defaults",()=>{
 for(const lang of ["en","en-US","en-GB","es","fr","it","pt","hi","ja","zh"])
  assert.match(routes,new RegExp('["]?'+lang+'["]?:\\{engine:"kokoro"'));
 assert.match(routes,/de:\{engine:"pico"/);
 assert.match(speech,/if\(code==="en"\|\|code==="en-US"\|\|code==="en-GB"\)return"nano"/);
 assert.match(speech,/const PICO_LANGUAGES=new Set\(\["de","es","fr","it","pt"\]\)/);
 assert.match(speech,/high\.generateHighQuality\(chunks\[0\],language,speed\)/);
 assert.match(speech,/console\.warn\("\[learning-speech\] Optional high-quality voice failed; falling back"/);
 assert.match(speech,/await systemSpeak\(value,language,speed\)/);
});

test("only the requested fp32 or q8 weight counts as an imported model",async()=>{
 const code=slice(high,"function modelId(","function markerUrl(");
 const fp32="https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/onnx/model.onnx";
 const cache={match:async url=>url===fp32?{ok:true}:undefined,keys:async()=>[{url:fp32}]};
 const ctx={
  BASE_MODEL:"onnx-community/Kokoro-82M-v1.0-ONNX",
  ZH_MODEL:"onnx-community/Kokoro-82M-v1.1-zh-ONNX",
  MODEL_CACHE:"transformers-cache",
  learningSpeechRoute:()=>({model:"base"}),
  caches:{open:async()=>cache},URL
 };
 const {modelFilename,hasCachedWeights}=vm.runInNewContext(code+";({modelFilename,hasCachedWeights})",ctx);
 assert.equal(modelFilename("en",true),"model.onnx");
 assert.equal(modelFilename("en",false),"model_quantized.onnx");
 assert.equal(await hasCachedWeights("en",true),true);
 assert.equal(await hasCachedWeights("en",false),false,"fp32 must not falsely count as WASM q8");
 assert.match(high,/cachedImport\(language\)/);
 assert.match(high,/if\(!await cachedImport\(language\)\)/);
 assert.match(high,/navigator\.storage\?\.persist\?\.\(\)/);
});

test("failed import is retryable; current voice engine remains available",async()=>{
 const code=slice(high,"export function importHighQuality(","/** On reload,");
 const importing=new Map(),logged=[];
 const ctx={
  languageKey:()=> "en",importing,notify(){},
  prepare:async()=>{throw Error("offline")},
  console:{warn:(...args)=>logged.push(args)}
 };
 const load=vm.runInNewContext(code+";importHighQuality",ctx);
 await assert.rejects(load("en"),/offline/);
 assert.equal(importing.size,0);
 await assert.rejects(load("en"),/offline/);
 assert.equal(logged.length,2);
 assert.match(high,/if\(!hasConsent\(language\)\)return false/);
 assert.match(high,/if\(importing\.has\(languageKey\(language\)\)\)return false/);
 assert.match(high,/return false; \/\/ Use the original voice on this tap/);
});
