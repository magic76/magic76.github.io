const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const source=read("web-spa/src/fortune/zoeDailyReading.ts");
const code=stripTypeScriptTypes(source,{mode:"strip"}).replace(/^import[^\n]*;\s*$/gm,"").replace(/^export\s+/gm,"");
const store=new Map();
global.localStorage={getItem:key=>store.get(key)||null,setItem:(key,val)=>store.set(key,String(val))};
const moduleModel=Function(code+"\nreturn {ZOE_DAILY_CACHE_KEY,zoeDailySlot,readZoeDaily,readZoeDailyFailure,saveZoeDaily,zoeDailyPrompt,zoeFollowupPrompt,zoeDailyFailure,generateZoeDaily,retryZoeDaily};")();
const c={version:1,date:"2026-11-13",kind:"bazi",headline:"Great changes",theme:"Keep a steady pace",do:["Plan one thing","Listen"],avoid:"Rushing",luckyColor:{name:"Blue",hex:"#0000ff",element:"水"},basis:["Daily influence"],deepLink:"/fortune/reading"};
const profile="1".repeat(64);
test("Zoe only receives allowlisted daily-card facts, never underlying profile data",()=>{
 const p=moduleModel.zoeDailyPrompt(c,"zh-TW");
 for(const field of ["headline","theme","avoid","luckyColor","basis","kind","date"])assert.ok(p.includes(field),field);
 for(const sensitive of ["birthDate","birthTime","city","gender","latitude","longitude","profileHash","dailyProfileHash"])
  assert.ok(!p.includes(sensitive),sensitive);
 assert.ok(!p.includes(profile));
 assert.match(p,/400–800/);
 const f=moduleModel.zoeFollowupPrompt(c,"zh-TW","first answer","more?",[]);
 assert.ok(f.includes("more?"));assert.ok(!f.includes(profile));
 assert.doesNotMatch(source,/DailyRecord\.ai|findExistingAiForKind|saveCachedDaily|readCachedDaily/);
});
test("same date + kind + hash + locale coalesces requests and serves cached answer on revisit",async()=>{
 let calls=0,resolve;
 const invoke=()=>{calls++;return new Promise(done=>{resolve=done})};
 const first=moduleModel.generateZoeDaily(c,profile,"zh-TW",invoke);
 const second=moduleModel.generateZoeDaily(c,profile,"zh-TW",invoke);
 assert.strictEqual(first,second);
 await Promise.resolve();assert.equal(calls,1);
 resolve("Hello! Today matters.");
 const [a,b]=await Promise.all([first,second]);assert.deepEqual(a,b);
 const third=await moduleModel.generateZoeDaily(c,profile,"zh-TW",invoke);
 assert.equal(third.text,"Hello! Today matters.");assert.equal(calls,1);
 const slot=moduleModel.zoeDailySlot(c.date,c.kind,profile,"zh-TW");
 assert.equal(moduleModel.readZoeDaily(slot).source,"ai");
 assert.equal(moduleModel.ZOE_DAILY_CACHE_KEY,"crew_fortune_zoe_daily_v1");
 assert.equal(moduleModel.readZoeDaily(moduleModel.zoeDailySlot(c.date,"numerology",profile,"zh-TW")),null);
 assert.equal(moduleModel.readZoeDaily(moduleModel.zoeDailySlot(c.date,c.kind,profile,"en")),null);
});
test("failed request does not loop automatically; explicit retry works; quota classified",async()=>{
 const hash="2".repeat(64);let calls=0;
 const reject=async()=>{calls++;throw Error("429 quota exceeded")};
 await assert.rejects(moduleModel.generateZoeDaily(c,hash,"zh-TW",reject));
 assert.equal(moduleModel.zoeDailyFailure(Error("429 quota exceeded")),"quota");
 assert.equal(await moduleModel.generateZoeDaily(c,hash,"zh-TW",reject),null);
 assert.equal(calls,1);
 assert.equal(moduleModel.readZoeDailyFailure(moduleModel.zoeDailySlot(c.date,c.kind,hash,"zh-TW")),"quota");
 moduleModel.retryZoeDaily(moduleModel.zoeDailySlot(c.date,c.kind,hash,"zh-TW"));
 await moduleModel.generateZoeDaily(c,hash,"zh-TW",async()=>{calls++;return "After retry"});
 assert.equal(calls,2);
 assert.equal(moduleModel.readZoeDailyFailure(moduleModel.zoeDailySlot(c.date,c.kind,hash,"zh-TW")),null);
});
test("14-day retention and bounded, separate follow-up history",()=>{
 const slot=moduleModel.zoeDailySlot(c.date,c.kind,"3".repeat(64),"en");
 moduleModel.saveZoeDaily(slot,{source:"fallback",text:"Static interpretation",at:Date.now()-15*86400000});
 assert.equal(moduleModel.readZoeDaily(slot),null);
 moduleModel.saveZoeDaily(slot,{source:"fallback",text:"Static interpretation",at:Date.now(),followups:Array.from({length:12},(_,i)=>({q:"Q"+i,a:"A"+i,at:i}))});
 assert.equal(moduleModel.readZoeDaily(slot).followups.length,8);
});
test("Zoe renders only for explicit intent, supports static fallback and never silently starts voice",()=>{
 const card=read("web-spa/src/fortune/FortuneDailyCard.tsx"),panel=read("web-spa/src/fortune/FortuneZoeReading.tsx");
 assert.match(card,/searchParams\.get\("zoe"\)==="1"&&<FortuneZoeReading/);
 assert.match(card,/\^\[a-f0-9\]\{64\}\$/);
 assert.match(panel,/cached\?\.source==="ai"\|\|!hasKey/);
 assert.match(panel,/zoeReading\.fallback/);assert.match(panel,/card\.do\[0\]/);
 assert.match(panel,/card\.luckyColor\.name/);assert.match(panel,/!hasKey&&<>/);
 assert.match(panel,/GeminiSetupNotice/);
 assert.match(panel,/friend\/live\?id=zoe&from=home&chat=text&quote=daily&chart=/);
 assert.match(panel,/onSubmit=\{e=>\{e\.preventDefault\(\);void ask\(\)\}\}/);
 assert.doesNotMatch(panel,/live\.start\(|startMicrophone|sendMessage\(/);
 assert.match(panel,/prefers-reduced-motion: reduce/);
 const css=read("web-spa/src/fortune/dailyCard.css");
 for(const selector of [".fortune-zoe-reading-chat",".fortune-zoe-reading-followup button"]){
  const match=css.slice(css.indexOf(selector)).match(/\{([^}]+)\}/);
  assert.ok(match);assert.match(match[1],/min-height:44px/);
 }
 assert.match(css,/\.fortune-zoe-reading.*font-size:14px/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.fortune-zoe-reading/);
});
test("all 11 locale labels exist, translations are nonempty, interpolation tokens agree",()=>{
 const langs=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];
 let reference;
 for(const lang of langs){
  const translations=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/fortuneDaily.json`)).zoeReading;
  assert.ok(translations);
  const names=Object.keys(translations).sort();
  if(!reference)reference=names;else assert.deepEqual(names,reference);
  for(const [key,val] of Object.entries(translations))assert.ok(typeof val==="string"&&val.trim(),lang+" "+key);
  const tokens=[...translations.fallback.matchAll(/\{\{([^}]+)\}\}/g)].map(x=>x[1]).sort();
  assert.deepEqual(tokens,["avoid","color","do","headline","kind","theme"]);
 }
 assert.match(JSON.parse(read("web-spa/src/i18n/locales/zh-TW/fortuneDaily.json")).zoeReading.fallback,/今天|運勢/);
});
