const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
function load(file,entries,deps={}){
 const src=stripTypeScriptTypes(read(file),{mode:"strip"})
  .replace(/^import[^\n]*;\s*$/gm,"").replace(/^export\s+/gm,"");
 return Function(...Object.keys(deps),src+"\nreturn {"+entries.join(",")+"};")(...Object.values(deps));
}
const pure=load("web-spa/src/fortune/dailyCard.ts",["dailyProfileHash","buildDailyCard","localDateKey"]);
const solar=load("web-spa/src/fortune/dailySolar.ts",["dailyGanZhi","DAILY_SOLAR"]);
const memory=new Map();
const oldStorage=global.localStorage;
global.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v))};
const store=load("web-spa/src/fortune/dailyStore.ts",
 ["readDailyKind","readDailyKindChoice","resolveDailyKind","readCachedDaily","saveCachedDaily","DAILY_COPY_REVISION"],{localDateKey:pure.localDateKey});
const baziSource=load("web-spa/src/fortune/dailyBaziSource.ts",["readSavedBaziResult"],{dailyProfileHash:pure.dailyProfileHash});
const profile={birthDate:"1990-12-01",birthTime:"08:30",gender:"1"},hash=pure.dailyProfileHash(profile);
const saved={mode:"bazi",profile,result:{dayMaster:"庚",dayPillar:"庚子",yearPillar:"庚午",balancingElements:["土","金"]}};
const translate=key=>key;
const i18n={t:(key,options)=>{const bundle=JSON.parse(read(`web-spa/src/i18n/locales/${options.lng}/fortuneDaily.json`));
 const value=key.split(".").reduce((cur,part)=>cur?.[part],bundle);
 return String(value).replace(/\{\{(\w+)\}\}/g,(_,k)=>String(options[k]??""));}};
const line=load("web-spa/src/pages/personalDailyLine.ts",["personalDailyLine"],{
 i18n,loadUiNamespace:async()=>{},buildDailyCard:pure.buildDailyCard,localDateKey:pure.localDateKey,
 readDailyKindChoice:store.readDailyKindChoice,resolveDailyKind:store.resolveDailyKind,
 readCachedDaily:store.readCachedDaily,readSavedBaziResult:baziSource.readSavedBaziResult,
 DAILY_COPY_REVISION:store.DAILY_COPY_REVISION,DAILY_SOLAR:solar.DAILY_SOLAR,
 readDailyProfiles:()=>[{hash,profile,mode:"bazi"}],chooseDailyProfile:(charts,h)=>charts.find(x=>x.hash===h)
});

test("A: manual choice is distinct from an absent choice and overrides profile defaults",()=>{
 memory.clear();assert.equal(store.readDailyKind(),"numerology");assert.equal(store.readDailyKindChoice(),null);
 assert.equal(store.resolveDailyKind("bazi",profile.birthTime),"bazi");
 assert.equal(store.resolveDailyKind("tarot",profile.birthTime),"numerology");
 assert.equal(store.resolveDailyKind("vedic",profile.birthTime),"numerology");
 assert.equal(store.resolveDailyKind("bazi",null),"numerology");
 memory.set("crew_fortune_daily_kind_v1","numerology");
 assert.equal(store.resolveDailyKind("bazi",profile.birthTime),"numerology");
 memory.set("crew_fortune_daily_kind_v1","bazi");
 assert.equal(store.resolveDailyKind("vedic",profile.birthTime),"bazi");
 assert.equal(store.resolveDailyKind("bazi",null),"numerology");
});

test("A: lightweight solar adapter matches known day pillars",()=>{
 assert.equal(solar.dailyGanZhi(1970,1,1),"辛巳");
 assert.equal(solar.dailyGanZhi(2026,11,13),"辛卯");
 assert.equal(solar.DAILY_SOLAR.fromYmd(2026,11,13).getLunar().getDayInGanZhi(),"辛卯");
 assert.doesNotMatch(read("web-spa/src/pages/personalDailyLine.ts"),/ensureFortuneServices/);
});

test("A: saved same-hash BaZi produces the same theme as buildDailyCard; missing result falls back honestly",async()=>{
 memory.clear();memory.set("crew_fortune_readings_v2",JSON.stringify([saved]));
 const bazi=await line.personalDailyLine("zh-TW","2026-11-13",hash);
 assert.equal(bazi.kind,"bazi");
 const expected=pure.buildDailyCard({kind:"bazi",profile,bazi:saved.result,lunar:solar.DAILY_SOLAR,
  localDate:"2026-11-13",lang:"zh-TW",translate,almanac:"optional"});
 // The selected copy index is deterministic even if the translator is different.
 const translated=pure.buildDailyCard({kind:"bazi",profile,bazi:saved.result,lunar:solar.DAILY_SOLAR,
  localDate:"2026-11-13",lang:"zh-TW",almanac:"optional",
  translate:(k,v)=>i18n.t(k,{lng:"zh-TW",...v})});
 assert.equal(bazi.text,translated.theme);
 assert.equal(bazi.card.kind,"bazi");assert.equal(bazi.card.theme,bazi.text);
 assert.equal(expected.kind,"bazi");
 memory.delete("crew_fortune_readings_v2");
 const fallback=await line.personalDailyLine("zh-TW","2026-11-13",hash);
 assert.equal(fallback.kind,"numerology");assert.notEqual(fallback.text,"");
});

test("A: BaZi cache is reused only when locale and copy revision match",async()=>{
 memory.clear();
 const card=pure.buildDailyCard({kind:"bazi",profile,bazi:saved.result,lunar:solar.DAILY_SOLAR,
  localDate:"2026-11-13",lang:"zh-TW",almanac:"optional",translate:(k,v)=>i18n.t(k,{lng:"zh-TW",...v})});
 store.saveCachedDaily(card,hash,undefined,"zh-TW");
 assert.equal((await line.personalDailyLine("zh-TW","2026-11-13",hash)).kind,"bazi");
 assert.equal((await line.personalDailyLine("ja","2026-11-13",hash)).kind,"numerology");
 const data=JSON.parse(memory.get("crew_fortune_daily_v1"));data["2026-11-13"]["bazi:"+hash].copyRevision=0;
 memory.set("crew_fortune_daily_v1",JSON.stringify(data));
 assert.equal((await line.personalDailyLine("zh-TW","2026-11-13",hash)).kind,"numerology");
});

test("B: direct setup and after-reading daily deep link contain only hash and kind",()=>{
 const home=read("web-spa/src/pages/DailyTopicCards.tsx"),reading=read("web-spa/src/fortune/ReadingPage.tsx");
 assert.match(home,/to="\/fortune\/reading\?mode=bazi&from=daily"/);
 assert.match(home,/trackUsageEvent\("home_entry_click","fortune"\)/);
 assert.match(reading,/fromDaily=params.get\("from"\)==="daily"/);
 assert.match(reading,/setParams\(fromDaily\?\{mode:m,from:"daily"\}/);
 assert.match(reading,/className="fortune-daily-next-link" to=\{dailyNextHref\}/);
 assert.match(reading,/"\/fortune\?daily=1&chart="\+dailyProfileHash\(reading.profile\)\+"&kind="/);
 assert.doesNotMatch(reading,/birthDate\+"&/);
});

test("C: home personal fortune uses a compact header, full-width message and shared footer",()=>{
 const home=read("web-spa/src/pages/DailyTopicCards.tsx");
 const css=read("web-spa/src/pages/dailyTopicCards.css");
 const detail=read("web-spa/src/fortune/FortuneDailyCard.tsx");
 assert.doesNotMatch(home,/dailyQuote\.basisBazi|dailyQuote\.basisNumerology|daily-quote-action-hint/);
 assert.match(detail,/t\("basisLabel"\)/);
 assert.match(home,/className="daily-quote-heading">[\s\S]*?<select className="daily-quote-chart"[\s\S]*?<\/select>[\s\S]*?<strong className="daily-quote-headline"/);
 assert.match(home,/className="daily-quote-actions">[\s\S]*?className="daily-quote-color"[\s\S]*?t\("dailyQuote\.fortuneFull"\)/);
 assert.match(css,/\.daily-quote-card--personal \.daily-quote-actions\{[^}]*display:flex;flex-wrap:wrap/);
 assert.match(css,/\.daily-quote-card--personal \.daily-quote-text\{[^}]*white-space:normal;overflow:visible/);
 assert.doesNotMatch(css,/float:right|position:absolute|max-height:680px/);
 for(const lang of ["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"]){
  const data=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/home.json`)).dailyQuote;
  const fortune=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/fortune.json`)).reading;
  for(const key of ["basisBazi","basisNumerology","setupHint"])assert.ok(data[key]?.trim(),lang+key);
  for(const key of ["dailySetupHint","dailyNext"])assert.ok(fortune[key]?.trim(),lang+key);
 }
});
process.on("exit",()=>{global.localStorage=oldStorage;});
