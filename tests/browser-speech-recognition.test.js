const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(p,"utf8");
const source=p=>stripTypeScriptTypes(read(p),{mode:"strip"}).replace(/^import .*\r?\n/gm,"").replace(/^export /gm,"");
const context={setTimeout,clearTimeout};
vm.runInNewContext(source("web-spa/src/teacher/targetLanguages.ts")+"\n"+source("web-spa/src/live/browserSpeechRecognition.ts")+"\nthis.api={browserSpeechLocale,browserSpeechConstructor,startBrowserSpeech};",context);
const {browserSpeechLocale,browserSpeechConstructor,startBrowserSpeech}=context.api;
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
 assert.match(page,/live\.state==="listening"&&live\.micEnabled&&!live\.muted&&!live\.openingProtected/);
 assert.match(page,/browserInput=\{browserSpeech\.text\}/);
 assert.doesNotMatch(hook,/sendText|sendControl|getUserMedia|fetch\(/);
 assert.equal(fs.existsSync("web-spa/public/stt-lab/index.html"),false);
});
