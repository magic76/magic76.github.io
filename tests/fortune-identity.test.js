const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {stripTypeScriptTypes} = require("node:module");

const read = file => fs.readFileSync(path.join(__dirname,"../web-spa/src/fortune",file),"utf8");
const ts = stripTypeScriptTypes(read("identity.ts"),{mode:"strip"})
 .replace(/\bexport\s+(?=(?:const|function)\b)/g,"");
const identity = {};
new Function("exports", ts+"\nexports.buildFortuneIdentity=buildFortuneIdentity;exports.FORTUNE_IDENTITY_VERSION=FORTUNE_IDENTITY_VERSION;")(identity);
const {buildFortuneIdentity:build, FORTUNE_IDENTITY_VERSION:version}=identity;

const masters=["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const signs=["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

test("all 10 BaZi day masters have stable, distinct named identities",()=>{
 const titles=new Set();
 for(const dayMaster of masters){
  const card=build("bazi",{dayMaster,dayMasterStrength:"中和"},"zh-TW");
  assert.ok(card,dayMaster);assert.equal(card.id,"bazi-"+dayMaster);
  assert.ok(card.core.length>20);assert.equal(card.evidence[0],"日主："+dayMaster);
  titles.add(card.title);
  assert.equal(card.version,version);
 }
 assert.equal(titles.size,10);
});
test("BaZi secondary behavior needs a unique, recorded, sufficiently large ten-god group",()=>{
 const make=(outputCount,resourceCount,officerCount)=>build("bazi",{
  dayMaster:"壬",careerProfile:{outputCount,resourceCount,officerCount}
 });
 const output=make(4,1,2);assert.match(output.rule,/output/);
 assert.match(output.behavior,/自己的做法/);
 assert.match(output.tension,/作品/);
 const scholar=make(1,4,2);assert.match(scholar.rule,/resource/);
 assert.notEqual(scholar.behavior,output.behavior);
 const officer=make(0,1,3);assert.match(officer.rule,/officer/);
 for(const card of [make(2,2,1),make(1,1,1),build("bazi",{dayMaster:"壬"})]){
  assert.equal(card.behavior,undefined);
  assert.equal(card.tension,undefined);
  assert.equal(card.evidence.length,1);
 }
});
test("all 22 tarot personality cards map deterministically; 22 is The Fool",()=>{
 const titles=new Set();
 for(let n=1;n<=22;n++){
  const card=build("tarot",{personalityCardNumber:n,personalityCardName:n===22?"愚者":"計算牌",lifePathNumber:7},"zh-TW");
  assert.ok(card);assert.equal(card.id,"tarot-"+n);
  assert.ok(card.behavior);assert.ok(card.tension);
  titles.add(card.title);
 }
 assert.equal(titles.size,22);
 assert.equal(build("tarot",{personalityCardNumber:22}).title,"自由冒險家");
 assert.equal(build("tarot",{personalityCardNumber:11}).title,"公平裁決者");
 assert.equal(build("tarot",{personalityCardNumber:4}).title,"秩序建構者");
});
test("all 12 Vedic ascendants have distinct identities; moon is only a secondary source",()=>{
 const titles=new Set();
 for(const sign of signs){
  const card=build("vedic",{lagnaSign:sign+" 測試",moonSign:"Virgo 處女",moonNakshatra:"Hasta"},"zh-TW");
  assert.ok(card);assert.equal(card.id,"vedic-"+sign.toLowerCase());
  assert.match(card.rule,/moon-Virgo/);assert.ok(card.behavior);
  titles.add(card.title);
 }
 assert.equal(titles.size,12);
 const noMoon=build("vedic",{lagnaSign:"Leo 獅子",moonSign:"INVALID",moonNakshatra:"Hasta"});
 assert.equal(noMoon.behavior,undefined);
 assert.ok(noMoon.evidence.every(x=>!x.includes("Hasta")));
});
test("fail closed on absent or invalid chart identities",()=>{
 assert.equal(build("bazi",{}, "zh-TW"),null);
 assert.equal(build("bazi",{dayMaster:"?"}),null);
 assert.equal(build("tarot",{personalityCardNumber:99}),null);
 assert.equal(build("vedic",{lagnaSign:"Unknown"}),null);
 assert.equal(build("bazi",null),null);
});
test("English fallback and privacy: generated content never embeds raw private profile fields",()=>{
 const sensitive="1985-07-06";
 const privateResult={dayMaster:"癸",dayMasterStrength:"偏旺",birthDate:sensitive,birthTime:"04:10",city:"secret-city",name:"secret-name"};
 const card=build("bazi",privateResult,"en-US");
 assert.equal(card.title,"Quiet Observer");
 const serialized=JSON.stringify(card);
 for(const value of [sensitive,"04:10","secret-city","secret-name"])assert.ok(!serialized.includes(value));
 const share=read("identityShare.ts");
 assert.ok(share.includes("identity:FortuneIdentity"));
 assert.ok(!share.includes("reading.profile"));
 assert.ok(!share.includes("birthDate"));
 assert.ok(share.includes("navigator.canShare"));
});
test("integration keeps an existing detailed report share button and adds identity sharing",()=>{
 const page=read("ReadingPage.tsx");
 const ui=read("FortuneIdentityCard.tsx");
 assert.match(page,/<FortuneIdentityCard reading=\{reading!\}/);
 assert.match(page,/shareFortuneReading\(reading!\)/);
 assert.match(ui,/shareIdentityCard\(card,locale\)/);
 assert.match(ui,/aria-pressed=\{rating===value\}/);
 assert.match(ui,/localStorage\.setItem\(key,value\)/);
});
