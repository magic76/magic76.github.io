const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const read=name=>fs.readFileSync(path.resolve(__dirname,"..",name),"utf8");
function loadTs(name,names){
 const src=read(name).replace(/^import .*$/gm,"");
 const js=stripTypeScriptTypes(src).replace(/^export /gm,"");
 const exports={};
 new Function("exports",js+"\nObject.assign(exports,{"+names.join(",")+"});")(exports);
 return exports;
}

test("stage responds to transcript events but never represents the effect as a Gemini judgment",()=>{
 const page=read("web-spa/src/games/NonsenseChampionshipPage.tsx");
 const css=read("web-spa/src/games/nonsenseChampionship.css");
 assert.match(page,/Date\.now\(\)-lastActivityRef\.current<1100/);
 assert.match(page,/nonsense-phase-track/);
 assert.match(page,/stageFaces/);
 assert.match(page,/Stage expressions and lights are visual effects, not AI judgments/);
 assert.match(page,/Recent speech transcript activity/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media\(max-width:620px\)/);
});

test("Live narration is opt-in, after the scored result, and cancels on exit",()=>{
 const page=read("web-spa/src/games/NonsenseChampionshipPage.tsx");
 const host=read("web-spa/src/games/nonsenseHost.ts");
 assert.match(page,/phaseRef\.current!=="result"\|\|recognitionRef\.current/);
 assert.match(page,/stopNonsenseLiveFeedback\(\)/);
 assert.match(page,/if\(hostVoice\)speakNonsenseHost/);
 assert.match(host,/session\.toggleMic\(\)/);
 assert.match(host,/timeout=setTimeout\(fail,25000\)/);
 assert.match(host,/maxLiveAttempts:1/);
 assert.match(host,/onTurnComplete:/);
 assert.match(host,/No second score is generated/);
});

test("device TTS reads actual text without fetching or accessing a mic",()=>{
 const api=loadTs("web-spa/src/games/nonsenseHost.ts",["speakNonsenseHost","stopNonsenseHost"]);
 const oldWindow=globalThis.window,oldSpeech=globalThis.SpeechSynthesisUtterance;
 const played=[];
 globalThis.window={speechSynthesis:{cancel:()=>played.push("cancel"),speak:u=>played.push(u)}}; 
 globalThis.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
 try{
  assert.equal(api.speakNonsenseHost("zh","這是評語"),true);
  assert.equal(played[1].lang,"zh-TW");
  assert.equal(played[1].text,"這是評語");
  api.stopNonsenseHost();
  assert.equal(played[2],"cancel");
 }finally{globalThis.window=oldWindow;globalThis.SpeechSynthesisUtterance=oldSpeech;}
});

test("score card draws real verdict text, not any private transcript",()=>{
 const {renderNonsenseCard}=loadTs("web-spa/src/games/nonsenseShare.ts",["renderNonsenseCard"]);
 const oldDocument=globalThis.document;
 const drawn=[];
 const ctx={
  createLinearGradient:()=>({addColorStop:()=>{}}),fillRect:()=>{},beginPath:()=>{},
  roundRect:()=>{},rect:()=>{},fill:()=>{},fillText:(value)=>drawn.push(value),
  measureText:value=>({width:Array.from(value).length*24})
 };
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
 try{
  const card=renderNonsenseCard({
   language:"en",topic:"All office chairs should become trampolines",judgeName:"Roast Host",
   score:{creativity:21,logic:15,relevance:15,delivery:16,total:67,highlight:"",
    comment:"The chair argument had a funny twist, but needed a clearer ending.",transcript:"PRIVATE_SECRET_DO_NOT_INCLUDE"},
   link:"https://www.3sssi.com/games/nonsense"
  });
  assert.equal(card.width,1080);
  assert.equal(card.height,1350);
  assert.ok(drawn.some(x=>x.includes("chair")));
  assert.ok(drawn.some(x=>x.includes("Roast Host")));
  assert.ok(!drawn.some(x=>x.includes("PRIVATE_SECRET_DO_NOT_INCLUDE")));
 }finally{globalThis.document=oldDocument;}
});

test("sharing offers native image, downloadable PNG and clipboard fallbacks",()=>{
 const src=read("web-spa/src/games/nonsenseShare.ts");
 assert.match(src,/navigator\.canShare/);
 assert.match(src,/image\/png/);
 assert.match(src,/a\.download="crew-nonsense-score.png"/);
 assert.match(src,/navigator\.clipboard\?\.writeText/);
});
