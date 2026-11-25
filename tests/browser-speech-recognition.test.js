const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(p,"utf8");
const source=p=>stripTypeScriptTypes(read(p),{mode:"strip"}).replace(/^import .*\r?\n/gm,"").replace(/^export /gm,"");
const context={setTimeout,clearTimeout};
vm.runInNewContext(source("web-spa/src/teacher/targetLanguages.ts")+"\n"+source("web-spa/src/live/browserSpeechRecognition.ts")+"\nthis.api={browserSpeechLocale,browserSpeechLanguagePair,transcriptLanguageEvidence,resolveBrowserSpeechLanguage,browserSpeechConstructor,startBrowserSpeech};",context);
const {browserSpeechLocale,browserSpeechLanguagePair,transcriptLanguageEvidence,resolveBrowserSpeechLanguage,browserSpeechConstructor,startBrowserSpeech}=context.api;
test("browser STT uses the existing conversation language",()=>{
 assert.equal(browserSpeechLocale("英文","zh-TW","natural"),"zh-TW");
 assert.equal(browserSpeechLocale("英文","zh-TW","bilingual"),"en-US");
 assert.equal(browserSpeechLocale("日文","zh-TW","immersion"),"ja-JP");
 assert.equal(browserSpeechLocale("中文","zh-CN","bilingual"),"zh-CN");
 assert.equal(browserSpeechLocale("unknown","zh-TW","immersion"),undefined);
});
test("native recognition is explicitly language-bound and stops on cleanup/error",()=>{
 let current,aborts=0,failures=0;const texts=[];
 class Mock{constructor(){current=this}start(){}abort(){aborts++}}
 assert.equal(browserSpeechConstructor({webkitSpeechRecognition:Mock}),Mock);
 const stop=startBrowserSpeech(Mock,"zh-TW",v=>texts.push(v),()=>failures++);
 assert.equal(current.lang,"zh-TW");assert.equal(current.maxAlternatives,1);
 current.onresult({results:[Object.assign([{transcript:"你好"}],{isFinal:true})]});
 assert.deepEqual(texts,["你好"]);
 const late=current.onresult;current.onerror({error:"audio-capture"});
 assert.equal(failures,1);assert.equal(aborts,1);late({results:[]});stop();assert.equal(aborts,1);
});
test("friend call opt-in is isolated from Gemini input and STT lab is removed",()=>{
 const hook=read("web-spa/src/live/useBrowserSpeechCaptions.ts"),page=read("web-spa/src/friends/FriendLiveConversation.tsx");
 assert.match(hook,/useState\(false\)/);
 assert.match(read("web-spa/src/friends/useFriendRecognition.ts"),/live\.state==="listening"&&live\.micEnabled&&!live\.muted&&!live\.openingProtected/);
 assert.match(page,/browserInput=\{browserSpeech\.text\}/);
 assert.doesNotMatch(hook,/sendText|sendControl|getUserMedia|fetch\(/);
 assert.equal(fs.existsSync("web-spa/public/stt-lab/index.html"),false);
});

test("all three conversation modes accept both configured languages",()=>{
 for(const mode of ["natural","bilingual","immersion"]){
  const pair=Array.from(browserSpeechLanguagePair("英文","zh-TW",mode));
  assert.deepEqual(pair,mode==="natural"?["zh-TW","en-US"]:["en-US","zh-TW"]);
 }
 assert.deepEqual(Array.from(browserSpeechLanguagePair("中文","zh-TW","natural")),["zh-TW"]);
});
test("auto recognition switches both ways only after consecutive strong completed inputs",()=>{
 const pair=["zh-TW","en-US"],turn=input=>({input,output:"reply"}),resolve=inputs=>resolveBrowserSpeechLanguage(pair,inputs.map(turn));
 const en1="How was your day at work?",en2="I went to work today.",zh1="今天工作真的很忙",zh2="我想和你聊聊最近的生活";
 assert.equal(resolve([en1]),"zh-TW");
 assert.equal(resolve([en1,en2]),"en-US");
 assert.equal(resolve([en1,en2,zh1]),"en-US");
 assert.equal(resolve([en1,en2,zh1,zh2]),"zh-TW");
 assert.equal(resolve([en1,"OK",en2]),"zh-TW");
 assert.equal(resolve([en1,"今天我想學 English",en2]),"zh-TW");
 assert.equal(resolve(["Eu eu gaste um grande mini","Eu quero falar com você hoje"]),"zh-TW");
 assert.equal(resolveBrowserSpeechLanguage(pair,[turn(en1),{input:en2}]),"zh-TW");
 assert.equal(resolveBrowserSpeechLanguage(["en-US","zh-TW"],[turn(zh1),turn(zh2)]),"zh-TW");
});
test("ambiguous mixed and same-script evidence does not invent a language",()=>{
 assert.equal(transcriptLanguageEvidence("今天工作",["zh-TW","ja-JP"]),undefined);
 assert.equal(transcriptLanguageEvidence("今日は仕事をしています",["zh-TW","ja-JP"]),"ja-JP");
 assert.equal(transcriptLanguageEvidence("I want to talk with you today",["en-US","es-ES"]),"en-US");
 assert.equal(transcriptLanguageEvidence("Yo quiero hablar contigo hoy",["en-US","es-ES"]),"es-ES");
 assert.equal(transcriptLanguageEvidence("Yes",["zh-TW","en-US"]),undefined);
 assert.equal(transcriptLanguageEvidence("今天想說 hello how are you",["zh-TW","en-US"]),undefined);
 assert.equal(transcriptLanguageEvidence("Eu eu gaste um grande mini",["zh-TW","en-US"]),undefined);
});
test("manual recognition override stays inside the allowed pair and leaves conversation mode alone",()=>{
 const page=read("web-spa/src/friends/FriendLiveConversation.tsx");
 const recognition=read("web-spa/src/friends/useFriendRecognition.ts");
 assert.match(recognition,/recognitionLanguages\.includes\(recognitionOverride\)\?recognitionOverride:automaticRecognitionLanguage/);
 assert.match(recognition,/resolveBrowserSpeechLanguage\(recognitionLanguages,live\.turns\)/);
 assert.match(page,/onChange=\{e=>setRecognitionOverride\(e\.target\.value\)\}/);
});

test("automatic recognition label uses the language returned by the recognition hook",()=>{
 const page=read("web-spa/src/friends/FriendLiveConversation.tsx");
 const recognition=read("web-spa/src/friends/useFriendRecognition.ts");
 assert.match(recognition,/return \{[^}]*automaticRecognitionLanguage[^}]*\}/);
 assert.match(page,/const \{[^}]*automaticRecognitionLanguage[^}]*\}=useFriendRecognition/);
 assert.match(page,/browserRecognitionAuto"\)\} · \{automaticRecognitionLanguage\}/);
});

test("Gemini native ASR experiment uses both configured languages, independent of chat mode",()=>{
 const page=read("web-spa/src/friends/FriendLiveConversation.tsx");
 const hook=read("web-spa/src/live/useLiveSession.ts");
 assert.match(page,/inputLanguageCodes:params\.get\("asrHints"\)==="1"\?browserSpeechLanguagePair\(language,friendNativeLanguage,"natural"\):undefined/);
 assert.match(hook,/inputLanguageCodes:configRef\.current\.inputLanguageCodes/);
});
