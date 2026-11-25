const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(p,"utf8");
const source=p=>stripTypeScriptTypes(read(p),{mode:"strip"}).replace(/^import .*\r?\n/gm,"").replace(/^export /gm,"");
const context={};
vm.runInNewContext(source("web-spa/src/teacher/targetLanguages.ts")+"\n"+source("web-spa/src/live/inputTranscriptionLanguageCodes.ts")+"\nthis.codes=inputTranscriptionLanguageCodes;",context);
test("native ASR language hints include both configured languages without duplicate or unsupported codes",()=>{
 const codes=(target,native)=>Array.from(context.codes(target,native));
 assert.deepEqual(codes("英文","zh-TW"),["zh-TW","en-US"]);
 assert.deepEqual(codes("日文","zh-TW"),["zh-TW","ja-JP"]);
 assert.deepEqual(codes("中文","zh-CN"),["zh-CN"]);
 assert.deepEqual(codes("中文","zh-TW"),["zh-TW"]);
 assert.deepEqual(codes("英文","en"),["en-US"]);
 assert.deepEqual(codes("unknown","zh-TW"),["zh-TW"]);
 assert.deepEqual(codes("unknown","unknown"),[]);
});
test("Gemini experiment uses both languages independent of chat mode; browser call recognizer is removed",()=>{
 const page=read("web-spa/src/friends/FriendLiveConversation.tsx");
 const hook=read("web-spa/src/live/useLiveSession.ts");
 assert.match(page,/inputLanguageCodes:params\.get\("asrHints"\)==="1"\?inputTranscriptionLanguageCodes\(language,friendNativeLanguage\):undefined/);
 assert.match(hook,/inputLanguageCodes:configRef\.current\.inputLanguageCodes/);
 for(const path of ["web-spa/src/friends/useFriendRecognition.ts","web-spa/src/live/useBrowserSpeechCaptions.ts","web-spa/src/live/browserSpeechRecognition.ts","web-spa/public/stt-lab/index.html"])assert.equal(fs.existsSync(path),false,path);
 for(const path of ["web-spa/src/friends/FriendLiveConversation.tsx","web-spa/src/friends/FriendCallCaptions.tsx","web-spa/src/friends/FriendCallBubbleList.tsx"])assert.doesNotMatch(read(path),/browserSpeech|browserInput|browserLanguage|browserRecognition|useFriendRecognition/);
});
