const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(p,"utf8");
const routeCode=stripTypeScriptTypes(read("web-spa/src/teacher/learningSpeechRoutes.ts").replace(/\bexport\s+/g,""),{mode:"strip"});
const route=vm.runInNewContext(routeCode+";learningSpeechRoute");
test("multilingual routes use the Lab models and language-specific voices",()=>{
 for(const [language,engine,model,voice,g2p] of [
  ["en","kokoro","base","af_heart"],["en-US","kokoro","base","af_heart"],["en-GB","kokoro","base","bf_emma"],
  ["fr","kokoro","base","ff_siwis","fr"],["es","kokoro","base","ef_dora","es"],["it","kokoro","base","if_sara","it"],
  ["pt-BR","kokoro","base","pf_dora","pt-br"],["hi","kokoro","base","hf_alpha","hi"],
  ["ja","kokoro","ja","jf_alpha"],["zh-TW","kokoro","zh","zf_001"],["de","pico","pico"],["ko","system"]
 ]){
  const info=route(language);assert.equal(info.engine,engine,language);assert.equal(info.model,model,language);assert.equal(info.voice,voice,language);assert.equal(info.g2p,g2p,language);
 }
});
test("runtime shares base weights and uses Lab generation APIs",()=>{
 const runtime=read("web-spa/src/teacher/learningSpeechKokoro.ts");
 assert.match(runtime,/key=model\+"\|"\+device/);
 assert.match(runtime,/KokoroJP\.load\(/);
 assert.match(runtime,/tts\.speak\(text,route.voice,rate\)/);
 assert.match(runtime,/Kokoro-82M-v1\.1-zh-ONNX/);
 assert.match(runtime,/phonemizeSync\(text,\{lang:route.g2p,profile:"kokoro"\}\)/);
 assert.match(runtime,/generate_from_ids\(/);
 assert.match(runtime,/cache\.put\(url,res.clone\(\)\)/);
});
test("cold, cached and failed preparation never wait for local inference before system speech",async()=>{
 const source=read("web-spa/src/teacher/learningSpeech.ts");
 const fn=stripTypeScriptTypes(source.slice(source.indexOf("export async function speakLearningText")).replace("export ",""),{mode:"strip"});
 for(const hit of [false,true]){
  const statuses=[],played=[];
  let fail;
  const preparation=new Promise((_,reject)=>{fail=reject});
  const context={playbackId:1,stopLearningSpeech(){},normalizeLearningLanguage:x=>x,preferredLearningEngine:()=> "kokoro",cacheKey:()=>"",generated:new Map(),ready:new Set(),hasCachedTinyModel:async()=>hit,ensureTiny:()=>preparation,systemSpeak:async text=>played.push(text),console:{warn(){}}};
  const speak=vm.runInNewContext(fn+";speakLearningText",context);
  const result=await speak("bonjour","fr",{onModelStatus:s=>statuses.push(s)});
  assert.equal(result.engine,"system");assert.deepEqual(played,["bonjour"]);assert.deepEqual(statuses,hit?[]:["loading"]);
  fail(Error("offline"));await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(statuses,hit?[]:["loading","ready"]);
 }
});
