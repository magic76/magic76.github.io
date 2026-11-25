const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(p,"utf8");
const source=p=>stripTypeScriptTypes(read(p),{mode:"strip"}).replace(/^import .*\r?\n/gm,"").replace(/^export /gm,"");
const scope={URLSearchParams};
vm.runInNewContext(["web-spa/src/teacher/targetLanguages.ts","web-spa/src/live/browserSpeechRecognition.ts","web-spa/src/live/geminiInputLanguageHints.ts"].map(source).join("\n")+"\nthis.resolve=geminiInputLanguageHints;",scope);
const hints=(...args)=>Array.from(scope.resolve(...args));
test("Gemini language hints are limited to explicit URL opt-in and the intended conversation surfaces",()=>{
 const pair=["zh-TW","en-US"];
 assert.deepEqual(hints("?id=zoe","friend-zoe","friend","英文","zh-TW"),[]);
 assert.deepEqual(hints("?asrHints=0","friend-zoe","friend","英文","zh-TW"),[]);
 assert.deepEqual(hints("?asrHints=1&id=zoe","friend-zoe","friend","英文","zh-TW"),pair);
 assert.deepEqual(hints("?asrHints=1","teacher",undefined,"英文","zh-TW"),pair);
 assert.deepEqual(hints("?asrHints=1","teacher-board","teacher","日文","zh-TW"),["zh-TW","ja-JP"]);
 assert.deepEqual(hints("?asrHints=1","fortune",undefined,"中文","zh-TW"),[]);
 assert.deepEqual(hints("?asrHints=1","friend-zoe","friend","中文","zh-CN"),["zh-CN"]);
 assert.deepEqual(hints("?asrHints=1","friend-zoe","friend",undefined,undefined),[]);
});
test("shared Live setup passes hints without changing the browser recognizer",()=>{
 assert.match(read("web-spa/src/live/useLiveSession.ts"),/inputLanguageCodes:geminiInputLanguageHints\(window\.location\.search/);
 assert.match(read("web-spa/src/friends/FriendLiveConversation.tsx"),/language,nativeLanguage:friendNativeLanguage,teacherReport:false/);
});
