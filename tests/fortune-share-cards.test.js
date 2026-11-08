const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

function mockCanvas(){
 const calls=[];
 const ctx={
  createLinearGradient(){const stops=[];calls.push({kind:"gradient",stops});return {addColorStop:(x,color)=>stops.push([x,color])}},
  fillRect(){},roundRect(){},beginPath(){},fill(){},stroke(){},moveTo(){},lineTo(){},arc(){},clip(){},save(){},restore(){},
  drawImage(){calls.push({kind:"art"})},
  measureText(text){return {width:Array.from(text).length*17}},
  fillText(text,x,y){calls.push({kind:"text",text,x,y})}
 };
 return {calls,document:{createElement:tag=>{
  assert.equal(tag,"canvas");
  return {width:0,height:0,getContext:()=>ctx};
 }}};
}
function loadModule(file,context,exports){
 const code=stripTypeScriptTypes(read(file),{mode:"strip"})
  .replace(/\bexport\s+(?=(?:async\s+)?(?:const|function)\b)/g,"");
 const out={};
 new Function("document","exports",code+"\n"+exports.map(name=>"exports."+name+"="+name+";").join("\n"))(context.document,out);
 return out;
}
const reading={
 mode:"bazi",summary:"八字 · 甲子 戊辰 壬申 己酉",
 createdAt:"2026-11-08T08:27:47.000Z"
};

test("reading PNG uses approved identity palette, character art, headline, date and URL",()=>{
 const env=mockCanvas(),{renderFortuneShareCard,formatFortuneShareDate}=loadModule("web-spa/src/fortune/shareCard.ts",env,["renderFortuneShareCard","formatFortuneShareDate"]);
 const art={complete:true,naturalWidth:1536,naturalHeight:864};
 const canvas=renderFortuneShareCard(reading,"你在生活中習慣先觀察，再做選擇。",art);
 assert.equal(canvas.width,1080);assert.equal(canvas.height,1350);
 assert.ok(env.calls.some(x=>x.kind==="art"),"approved illustration must render");
 assert.ok(env.calls.some(x=>x.kind==="gradient"&&x.stops.some(([,color])=>color==="#f0ecff")));
 const texts=env.calls.filter(x=>x.kind==="text").map(x=>x.text);
 for(const str of ["CREW FORTUNE","命盤一句話","你在生活中習慣先觀察，再做選擇。","3sssi.com/fortune"])assert.ok(texts.includes(str),str);
 assert.ok(!texts.some(x=>x.includes("固定計算結果已完成")),"placeholder never belongs on the PNG");
 assert.ok(texts.some(x=>x.includes("2026/11/8")),"localized date must appear");
 assert.ok(!formatFortuneShareDate(reading.createdAt).includes("PM"));
});

test("identity renderer centers 1, 2 and 3 narrative sections instead of leaving 300px holes",()=>{
 const env=mockCanvas();
 const {renderIdentityShareCard}=loadModule("web-spa/src/fortune/identityShare.ts",env,["renderIdentityShareCard"]);
 const art={complete:true,naturalWidth:1536,naturalHeight:864};
 const base={mode:"bazi",title:"柔韌策士",symbol:"乙",core:"你觀察細膩且善於應變。",evidence:["日主：乙"],id:"bazi-乙"};
 function sectionYs(fields){
  env.calls.length=0;renderIdentityShareCard({...base,...fields},"zh-TW",art);
  return env.calls.filter(x=>x.kind==="text"&&["核心特質","最像你的地方","值得留意的另一面"].includes(x.text)).map(x=>x.y);
 }
 const one=sectionYs({}),two=sectionYs({behavior:"你會先理解對方。"}),three=sectionYs({behavior:"你會先理解對方。",tension:"有時想得太多。"});
 assert.equal(one.length,1);assert.equal(two.length,2);assert.equal(three.length,3);
 assert.ok(one[0]>two[0]&&two[0]>three[0],"sections must redistribute with count");
 assert.ok(one[0]<1105&&one[0]>800,"single section should be centered, not at the top");
 assert.ok(three[2]<1120,"sections stay above evidence");
 assert.ok(env.calls.some(x=>x.text==="你是哪一型？3sssi.com/fortune"));
});

test("reading page shares real visible headline and provides accessible result feedback",()=>{
 const page=read("web-spa/src/fortune/ReadingPage.tsx");
 const summary=read("web-spa/src/fortune/FortuneSummaryCard.tsx");
 const shell=read("scripts/prepare-cloudflare.mjs");
 const css=read("web-spa/src/styles.css");
 assert.match(page,/onHeadline=\{setOneLine\}/);
 assert.match(summary,/onHeadline\?\.\(displayedHeadline\)/);
 assert.match(page,/shareFortuneReading\(reading,oneLine\|\|reading.summary,shareArtRef.current\)/);
 assert.match(page,/className="fortune-share-status" role="status"/);
 assert.match(page,/formatFortuneShareDate\(reading!\.createdAt\)/);
 assert.match(page,/identityArtworkUrl\(identity.id\)/);
 assert.match(shell,/route==="\/fortune\/reading"\?privateShell\.replace\("<\/head>",readingShareMeta/);
 assert.match(css,/\.fortune-theme \.fortune-brand-compact\{display:inline\}/);
});
