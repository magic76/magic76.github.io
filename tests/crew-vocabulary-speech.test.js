const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const source=fs.readFileSync("web-spa/src/teacher/vocabularySpeech.ts","utf8");
function loadModule(store=new Map()){
 const code=stripTypeScriptTypes(source.replace(/\bexport\s+(?=(?:const|function|type)\b)/g,""),{mode:"strip"});
 const storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
 return vm.runInNewContext("(function(localStorage){"+code+"\nreturn {localEnglishVoices,selectLocalEnglishVoice,voiceId,speechRate,readSpeechPreferences,saveSpeechPreferences};})")(storage);
}
const voice=(name,lang,localService=true,isDefault=false)=>({
 name,lang,localService,default:isDefault,voiceURI:name+"-"+lang
});

test("prefers installed English voices and never selects a cloud voice by name",()=>{
 const helper=loadModule();
 const available=[
  voice("Cloud Neural English","en-US",false,true),
  voice("Basic English UK","en-GB"),
  voice("Local Natural English US","en-US"),
  voice("Italian local","it-IT"),
  voice("Basic English US","en-US")
 ];
 const local=helper.localEnglishVoices(available);
 assert.equal(local.length,3);
 assert.equal(local[0].name,"Local Natural English US");
 assert.ok(local.every(item=>item.localService&&item.lang.startsWith("en")));
 assert.equal(helper.selectLocalEnglishVoice(available,"").name,"Local Natural English US");
 assert.equal(helper.selectLocalEnglishVoice(available,helper.voiceId(available[1])).name,"Basic English UK");
 assert.equal(helper.selectLocalEnglishVoice([voice("remote","en-US",false)],""),undefined);
});

test("default speech speed is natural 1.0; slow playback is optional",()=>{
 const helper=loadModule();
 assert.equal(helper.speechRate("normal"),1);
 assert.equal(helper.speechRate("slow"),0.8);
});

test("voice preferences persist locally and unsupported values degrade safely",()=>{
 const store=new Map(),helper=loadModule(store);
 assert.equal(helper.readSpeechPreferences().speed,"normal");
 assert.equal(helper.readSpeechPreferences().voice,"");
 helper.saveSpeechPreferences("local-en-US-id","slow");
 assert.equal(helper.readSpeechPreferences().voice,"local-en-US-id");
 assert.equal(helper.readSpeechPreferences().speed,"slow");
 store.set("crew_vocab_speech_speed_v1","invalid");
 assert.equal(helper.readSpeechPreferences().speed,"normal");
});

test("vocabulary page uses lazy Kokoro English without Gemini",()=>{
 const page=fs.readFileSync("web-spa/src/teacher/VocabularyPage.tsx","utf8");
 const speech=fs.readFileSync("web-spa/src/teacher/learningSpeech.ts","utf8");
 const worker=fs.readFileSync("web-spa/src/teacher/learningSpeech.worker.ts","utf8");
 assert.match(page,/speakLearningText\(text,"en",\{speed:slow\?"slow":"normal",mode:"word",onModelStatus:/);
 assert.match(page,/onClick=\{\(\)=>pronounce\(word\[0\],true\)\}/);
 assert.match(speech,/if\(code==="en"\)return"kokoro"/);
 assert.match(speech,/const PICO_LANGUAGES=new Set\(\["de","es","fr","it","pt"\]\)/);
 assert.match(speech,/new Worker\(new URL\("\.\/learningSpeech\.worker\.ts",import\.meta\.url\)/);
 assert.match(fs.readFileSync("web-spa/src/teacher/learningSpeech.kokoro.worker.ts","utf8"),/KokoroTTS\.from_pretrained/);
 assert.match(worker,/uccharan@1\.0\.0/);
 assert.match(speech,/await speakText\(text,\{speed\}\)/);
 assert.match(speech,/kokoro-js@1\.2\.1|Kokoro-82M/);
 assert.doesNotMatch(page,/geminiKey\(|CrewAI\.call|useLiveSession|fetch\(/);
 assert.doesNotMatch(page,/synth\.getVoices\(\)|selectLocalEnglishVoice|changeSpeechPreferences/);
 assert.match(page,/recordVocab\(word\[0\],correct\)/);
 for(const locale of ["zh-TW","en"]){
  const dict=JSON.parse(fs.readFileSync("web-spa/src/i18n/locales/"+locale+"/teacher.json","utf8"));
  assert.ok(dict.vocabulary.speechFailed,locale+" speechFailed");
 }
});
