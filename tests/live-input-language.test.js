const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(p,"utf8");
const source=p=>stripTypeScriptTypes(read(p),{mode:"strip"}).replace(/^import .*\r?\n/gm,"").replace(/^export /gm,"");
const context={};
vm.runInNewContext(source("web-spa/src/teacher/targetLanguages.ts")+"\n"+source("web-spa/src/live/inputTranscriptionLanguages.ts")+"\nthis.resolve=inputTranscriptionLanguages;this.targets=TARGET_LANGUAGES;",context);
const hints=(...args)=>Array.from(context.resolve(...args));
test("ASR uses known language selections without guessing a third language",()=>{
 assert.deepEqual(hints("英文","zh-TW","native-first"),["zh-TW","en-US"]);
 assert.deepEqual(hints("日文","zh-TW","target-only"),["ja-JP"]);
 assert.deepEqual(hints("韓文","zh-TW"),["ko-KR","zh-TW"]);
 assert.deepEqual(hints("中文","zh-CN"),["zh-CN"]);
 assert.deepEqual(hints("英文","en"),["en-US"]);
 assert.deepEqual(hints("unknown"),[]);
 assert.deepEqual(hints(undefined,"zh-TW"),["zh-TW"]);
 for(const lang of context.targets)assert.match(hints(lang.value)[0],/^[a-z]{2}-[A-Z]{2}$/);
});
test("shared live hook passes language hints without adding STT engines",()=>{
 const hook=read("web-spa/src/live/useLiveSession.ts");
 assert.match(hook,/inputLanguageCodes:inputTranscriptionLanguages\(configRef\.current\.language,configRef\.current\.nativeLanguage,configRef\.current\.inputLanguageMode\)/);
 assert.doesNotMatch(hook,/SpeechRecognition|whisper/i);
 assert.doesNotMatch(read("web-spa/src/analytics/UsageDashboardPage.tsx"),/stt-lab/);
 assert.equal(fs.existsSync("web-spa/public/stt-lab/index.html"),false);
});
