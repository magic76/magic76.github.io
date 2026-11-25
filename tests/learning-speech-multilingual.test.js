const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const source=fs.readFileSync("web-spa/src/teacher/learningSpeech.ts","utf8");
const code=stripTypeScriptTypes(source.replace(/^import .*;$/gm,"").replace(/\bexport\s+/g,""),{mode:"strip"});
const voice=(lang,localService=true,isDefault=false)=>({lang,localService,default:isDefault});
function load({mode="browser",voices=[],autoEnd=true}={}){
 const said=[],native=[];
 const synth={getVoices:()=>voices,cancel(){},speak(u){said.push(u);if(autoEnd)u.onend()}};
 class Utterance{constructor(text){this.text=text}}
 const context={TARGET_LANGUAGES:[{code:"ja",value:"日文",spoken:"Japanese"}],window:{speechSynthesis:synth},SpeechSynthesisUtterance:Utterance,
  getDeviceCapabilities:()=>({tts:mode}),speakText:async(text,options)=>native.push([text,options.speed])};
 const api=vm.runInNewContext(code+";({normalizeLearningLanguage,selectLearningVoice,speakLearningText,stopLearningSpeech})",context);
 return {...api,said,native};
}
test("all learning languages use explicit locale and matching device voice, never an unrelated voice",async()=>{
 const us=voice("en-US"),gb=voice("en-GB"),ja=voice("ja-JP"),de=voice("de-DE"),zh=voice("zh-TW");
 const api=load({voices:[us,gb,ja,de,zh]});
 for(const [lang,locale,expected] of [["en","en-US",us],["en-GB","en-GB",gb],["日文","ja-JP",ja],["de","de-DE",de],["zh","zh-TW",zh],["fr","fr-FR",undefined]]){
  await api.speakLearningText("test",lang);
  const u=api.said.at(-1);assert.equal(u.lang,locale);assert.equal(u.voice,expected);assert.equal(u.rate,1);
 }
 assert.equal(api.native.length,0);
});
test("exact locale wins over another accent; default then local within exact matches",()=>{
 const gb=voice("en-GB",true,true),remote=voice("en-US",false),local=voice("en-US"),def=voice("en-US",false,true);
 const api=load();
 assert.equal(api.selectLearningVoice([gb,remote,local],"en-US"),local);
 assert.equal(api.selectLearningVoice([gb,remote,local,def],"en-US"),def);
 assert.equal(api.selectLearningVoice([gb],"en-US"),gb);
});
test("native Android English preserves rate; other languages keep browser locale",async()=>{
 for(const mode of ["native-message","native-legacy"]){
  const api=load({mode});
  await api.speakLearningText("negotiate","en",{speed:"slow"});
  assert.deepEqual(api.native,[["negotiate","slow"]]);
  await api.speakLearningText("bonjour","fr",{speed:"slow"});
  assert.equal(api.said[0].lang,"fr-FR");assert.equal(api.said[0].rate,0.8);
 }
});
test("browser waits for playback end, settles interrupted speech and reports synthesis failures",async()=>{
 const api=load({autoEnd:false});
 let ended=false;const first=api.speakLearningText("first","en").then(()=>{ended=true});
 await Promise.resolve();assert.equal(ended,false);
 const second=api.speakLearningText("second","en");
 await first;assert.equal(ended,true);
 api.said[1].onend();await second;
 const failed=api.speakLearningText("third","en");
 api.said[2].onerror({error:"synthesis-failed"});
 await assert.rejects(failed,/synthesis-failed/);
 await assert.rejects(api.speakLearningText(" ","en"),/EMPTY_SPEECH_TEXT/);
});
