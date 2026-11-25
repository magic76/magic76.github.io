const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(p,"utf8");
const scope={};
vm.runInNewContext(stripTypeScriptTypes(read("web-spa/src/teacher/targetLanguages.ts"),{mode:"strip"}).replace(/^export /gm,"")+"\nthis.hints=inputTranscriptionLanguages;this.targets=TARGET_LANGUAGES;",scope);
const hints=(...args)=>Array.from(scope.hints(...args));
test("native and learning language hints are deduplicated without guessing unrelated languages",()=>{
 assert.deepEqual(hints("英文","zh-TW"),["zh-TW","en-US"]);
 assert.deepEqual(hints("日文","zh-TW"),["zh-TW","ja-JP"]);
 assert.deepEqual(hints("中文","zh-CN"),["zh-CN"]);
 assert.deepEqual(hints("英文","en"),["en-US"]);
 assert.deepEqual(hints("unknown",undefined),[]);
 assert.deepEqual(hints(undefined,"zh-TW"),["zh-TW"]);
 for(const target of scope.targets)assert.match(hints(target.value)[0],/^[a-z]{2}-[A-Z]{2}$/);
});
test("Friend hints use the effective native language independently of reply mode",()=>{
 const page=read("web-spa/src/friends/FriendLiveConversation.tsx");
 const hook=read("web-spa/src/live/useLiveSession.ts");
 assert.match(page,/inputLanguageCodes:inputTranscriptionLanguages\(language,friendNativeLanguage\)/);
 assert.match(hook,/inputLanguageCodes:configRef\.current\.inputLanguageCodes/);
 assert.match(hook,/inputTranscriptionLanguages\(configRef\.current\.language,configRef\.current\.nativeLanguage\)/);
});
