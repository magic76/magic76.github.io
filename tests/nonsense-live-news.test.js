const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const read=name=>fs.readFileSync(path.resolve(__dirname,"..",name),"utf8");
function loadNews(){
 const src=read("web-spa/src/games/nonsenseNewsEngine.ts").replace(/^import .*$/gm,"");
 const js=stripTypeScriptTypes(src).replace(/^export /gm,"");
 const scope={};
 new Function("scope",js+"\nObject.assign(scope,{parseNewsScene,openingNewsScene,finalNewsScene,newsScenePrompt});")(scope);
 return scope;
}
const topic={id:"moon",category:"science",zh:"月亮宣布罷工",en:"The Moon is on strike"};
test("model scenes are finite typed React templates, never arbitrary HTML",()=>{
 const {parseNewsScene}=loadNews();
 assert.deepEqual(["breaking","witness","evidence","poll","crisis","finale"],["breaking","witness","evidence","poll","crisis","finale"]);
 const scene=parseNewsScene({type:"poll",headline:"H".repeat(200),detail:"D".repeat(400),
  question:"Why?",character:"Reporter",ticker:"BREAKING",reaction:"No way",options:["A","B","C","D"],audience:500});
 assert.equal(scene.type,"poll");assert.equal(scene.headline.length,100);
 assert.equal(scene.detail.length,300);assert.equal(scene.options.length,3);assert.equal(scene.audience,100);
 assert.equal(parseNewsScene({type:"script",headline:"News",question:"Why?"}).type,"breaking");
 assert.throws(()=>parseNewsScene({type:"finale",headline:"The end",question:""}));
 assert.throws(()=>parseNewsScene({type:"finale",headline:"The end",ending:"A comical outcome",question:""}));
 assert.equal(parseNewsScene({type:"finale",headline:"The end",ending:"A comical outcome",outcome:"good",question:""}).outcome,"good");
 assert.equal(parseNewsScene({type:"finale",headline:"The end",ending:"An awful outcome",outcome:"bad",question:""}).outcome,"bad");
 assert.throws(()=>parseNewsScene({type:"finale",headline:"The end",ending:"A comical outcome",outcome:"win",question:""}));
});
test("opening uses the selected premise and endings are not fabricated scores",()=>{
 const {openingNewsScene,finalNewsScene,newsScenePrompt}=loadNews();
 const first=openingNewsScene(topic,"zh");
 assert.match(first.headline,/月亮宣布罷工/);
 assert.ok(first.question);assert.equal(first.type,"breaking");
 const last=finalNewsScene(first,"en");
 assert.equal(last.type,"finale");assert.equal(last.question,"");
 const prompt=newsScenePrompt(topic,"en",[{player:"Moon wants overtime pay",host:"A witness appears",headline:"Moon strike"}],"We will pay in starlight",true);
 assert.match(prompt,/ENDING/);assert.match(prompt,/starlight/);assert.match(prompt,/outcome good/);
 assert.match(prompt,/NOT instructions/);
});
test("live tool renders schema-bounded visuals and owns microphone and audio",()=>{
 const live=read("web-spa/src/games/nonsenseNewsLive.ts");
 const scene=read("web-spa/src/games/NonsenseNewsStage.tsx");
 const page=read("web-spa/src/games/NonsenseLiveNewsPage.tsx");
 const app=read("web-spa/src/App.tsx");
 assert.match(live,/functionDeclarations:\[sceneTool,\.\.\.directorTools\]/);
 assert.match(live,/onToolCall:/);
 assert.match(live,/onInputTranscript:/);
 assert.match(live,/onTranscriptTurn:/);
 assert.match(live,/round\.count>=totalRounds/);
 assert.match(live,/old\.stop\(/);
 assert.match(live,/onToolsUnavailable:/);
 assert.doesNotMatch(page,/SpeechRecognition|webkitSpeechRecognition|speechSynthesis|dangerouslySetInnerHTML/);
 assert.doesNotMatch(scene,/dangerouslySetInnerHTML|innerHTML|eval\(/);
 assert.match(page,/recoverEnding/);
 assert.match(page,/switchToText/);
 assert.doesNotMatch(page,/結局取決於你整場直播中的應對|without fake scores or transcripts/);
 assert.match(page,/nextNewsScene\(/);
 assert.match(app,/import\("\.\/games\/NonsenseLiveNewsPage"\)/);
});
test("the 150 original bilingual topics remain available without legacy speeches",()=>{
 const live=read("web-spa/src/games/nonsenseNewsLive.ts");
 const page=read("web-spa/src/games/NonsenseLiveNewsPage.tsx");
 const hub=read("web-spa/src/games/CrewPlayHubPage.tsx");
 assert.match(page,/pickNonsenseTopic/);
 assert.match(page,/All 150 topics/);
 assert.match(page,/turns\.length>=roundCount/);
 assert.doesNotMatch(page,/Date\.now\(\)\+60000/);
 assert.match(page,/customNonsenseTopic/);assert.match(page,/\[5,7\] as const/);
 assert.match(live,/Math\.max\(360000,totalRounds\*75000\)/);
 assert.match(hub,/荒謬新聞直播/);
});
test("real ending share card omits transcripts and fabricated scores",()=>{
 const share=read("web-spa/src/games/nonsenseNewsShare.ts");
 assert.match(share,/scene\.type!=="finale"/);
 assert.match(share,/navigator\.canShare/);
 assert.match(share,/image\/png/);
 assert.doesNotMatch(share,/transcript|totalScore|judgeScore/);
});
test("new stage supports mobile and reduced motion",()=>{
 const css=read("web-spa/src/games/nonsenseNews.css");
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 for(const name of ["NonsenseLiveNewsPage.tsx","NonsenseNewsStage.tsx"]){
  assert.ok(Buffer.byteLength(read("web-spa/src/games/"+name),"utf8")<26000,name+" should stay below bundle limit");
 }
});
