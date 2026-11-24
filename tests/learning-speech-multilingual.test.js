const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(p,"utf8");
const speech=read("web-spa/src/teacher/learningSpeech.ts");
const worker=read("web-spa/src/teacher/learningSpeech.worker.ts");

function extract(start,end){
 const a=speech.indexOf(start),b=speech.indexOf(end,a);
 assert.ok(a>=0&&b>a,start+" remains available");
 return stripTypeScriptTypes(speech.slice(a,b).replace(/\bexport\s+/g,""),{mode:"strip"});
}

test("en/US/GB use Nano; de/es/fr/it/pt use Pico; other learning languages use device TTS",()=>{
 const code=extract("export function normalizeLearningLanguage(","export function picoLearningLanguages(");
 const {normalizeLearningLanguage,preferredLearningEngine}=vm.runInNewContext(
  code+";({normalizeLearningLanguage,preferredLearningEngine})",
  {TARGET_LANGUAGES:[],PICO_LANGUAGES:new Set(["de","es","fr","it","pt"])});
 for(const language of ["en","en-US","en-GB","EN-us","EN-gb"])assert.equal(preferredLearningEngine(language),"nano",language);
 for(const language of ["de","es","fr","it","pt","pt-BR"])assert.equal(preferredLearningEngine(language),"pico",language);
 for(const language of ["ja","ko","zh-TW","hi","vi","th","id","ru"])assert.equal(preferredLearningEngine(language),"system",language);
 assert.equal(normalizeLearningLanguage("en-GB"),"en-GB");
 assert.match(speech,/modelLanguage\(message.language\)/,"worker receives canonical Nano en");
 assert.match(worker,/language==="en"\?"en-us":language/,"Nano G2P uses real en-us data pack");
 assert.match(worker,/language==="en"\?"eleanor":/,"Nano selects Eleanor voice");
});

test("no learning path imports Kokoro runtimes or WebGPU models",()=>{
 assert.doesNotMatch(speech+worker,/kokoro-js@|kokoro-js-jp|@uzen|learningSpeechKokoro|learningSpeech\.kokoro\.worker|KokoroTTS|probeWebGpu|model_quantized\.onnx/);
 for(const file of ["learningSpeechKokoro.ts","learningSpeech.kokoro.worker.ts","learningSpeechRoutes.ts"]){
  assert.equal(fs.existsSync("web-spa/src/teacher/"+file),false,file+" removed from learning runtime");
 }
 assert.match(speech,/new Worker\(new URL\("\.\/learningSpeech\.worker\.ts",import\.meta\.url\),\{type:"classic"\}\)/);
 assert.match(speech,/cleanupLegacyKokoroCache\(\)/);
});

test("cold, cached-weight and failed preparation all speak immediately without obsolete UI hints",async()=>{
 const fn=extract("export async function speakLearningText(","\n}",).replace(/\s*$/,"")+"\n}"; // replaced below with exact function source
 // The final speech function reaches EOF, so extract its full text directly.
 const code=stripTypeScriptTypes(speech.slice(speech.indexOf("export async function speakLearningText(")).replace("export ",""),{mode:"strip"});
 for(const hit of [false,true]){
  const statuses=[],played=[];let rejectPreparation;
  const preparation=new Promise((_,reject)=>{rejectPreparation=reject});
  const context={
   playbackId:1,stopLearningSpeech(){},cleanupLegacyKokoroCache(){},
   normalizeLearningLanguage:x=>x,preferredLearningEngine:()=> "nano",
   cacheKey:()=>"",generated:new Map(),ready:new Set(),hasCachedTinyModel:async()=>hit,
   ensureTiny:()=>preparation,systemSpeak:async text=>played.push(text),console:{warn(){}}
  };
  const speak=vm.runInNewContext(code+";speakLearningText",context);
  const result=await speak("Nice to meet you, Zoe.","en",{onModelStatus:(status,lang)=>statuses.push([status,lang])});
  assert.equal(result.engine,"system");
  assert.deepEqual(played,["Nice to meet you, Zoe."]);
  assert.deepEqual(statuses,hit?[]:[["loading","en"]]);
  rejectPreparation(Error("offline"));
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(statuses,hit?[]:[["loading","en"],["ready","en"]]);
 }
 assert.doesNotMatch(speech,/約\s*\d+\s*MB|這次先用系統語音|語音模型已準備好|只需一次/);
});

test("successful preparation requests storage persistence once and avoids duplicate workers",async()=>{
 const code=extract("function ensureTiny(","async function generateTiny(");
 let attempts=0,persisted=0;
 const ctx={ready:new Set(),warming:new Map(),requestWorker:async()=>{attempts++},
  requestPersistentStorage(){persisted++}};
 const ensure=vm.runInNewContext(code+";ensureTiny",ctx);
 await Promise.all([ensure("en"),ensure("en")]);
 await ensure("en");
 assert.equal(attempts,1);
 assert.equal(persisted,1);
 assert.equal(ctx.ready.has("en"),true);
 assert.equal(ctx.warming.size,0);
});
