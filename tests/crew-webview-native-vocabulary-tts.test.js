const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");

const read=path=>fs.readFileSync(path,"utf8");
const helper=read("web-spa/src/teacher/nativeVocabularySpeech.ts");
const api=vm.runInNewContext("(function(){"+stripTypeScriptTypes(
 helper.replace(/\bexport\s+(?=(?:const|function)\b)/g,""),{mode:"strip"})
 +";return {hasCrewNativeVocabularyTts,nativeVocabularyTtsUrl};})()");

test("only explicit CrewNativeTts/1 shell capability enables native pronunciation",()=>{
 assert.equal(api.hasCrewNativeVocabularyTts("Mozilla/5.0 Android wv"),false);
 assert.equal(api.hasCrewNativeVocabularyTts("CrewAndroidShell/1"),false);
 assert.equal(api.hasCrewNativeVocabularyTts("Mozilla/5.0 CrewAndroidShell/1 CrewNativeTts/1"),true);
 assert.equal(api.hasCrewNativeVocabularyTts("CrewNativeTts/10"),false);
});

test("native TTS navigation encodes vocabulary without modifying its rate",()=>{
 assert.equal(api.nativeVocabularyTtsUrl("take off","slow"),
  "crew-tts://speak?text=take%20off&rate=slow");
 assert.equal(api.nativeVocabularyTtsUrl("can't","normal"),
  "crew-tts://speak?text=can't&rate=normal");
 assert.equal(api.nativeVocabularyTtsUrl("a&b","normal"),
  "crew-tts://speak?text=a%26b&rate=normal");
});

test("vocabulary routes speech via the device adapter, preserving legacy and browser fallback",()=>{
 const page=read("web-spa/src/teacher/VocabularyPage.tsx");
 const adapter=read("web-spa/src/lib/deviceCapabilities.ts");
 assert.match(page,/getDeviceCapabilities\(\)\.tts/);
 assert.match(page,/void speakText\(text,/);
 assert.match(adapter,/webMessagePort\(\)\?"native-message"/);
 assert.match(adapter,/hasCrewNativeVocabularyTts\(\)\?"native-legacy"/);
 assert.match(adapter,/window\.location\.assign\(nativeVocabularyTtsUrl\(text,options\.speed\)\)/);
 assert.match(adapter,/new SpeechSynthesisUtterance\(text\)/);
 assert.match(page,/vocabulary\.androidVoiceHint/);
 const zh=JSON.parse(read("web-spa/src/i18n/locales/zh-TW/teacher.json"));
 const en=JSON.parse(read("web-spa/src/i18n/locales/en/teacher.json"));
 for(const dictionary of [zh,en]){
  assert.ok(dictionary.vocabulary.androidVoiceLabel);
  assert.ok(dictionary.vocabulary.androidVoiceHint);
 }
});
