const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
function loadTs(file,exports,imports={}){
 const code=stripTypeScriptTypes(read(file),{mode:"strip"})
  .replace(/^import[^\n]*;\s*$/gm,"").replace(/^export\s+/gm,"");
 return Function(...Object.keys(imports),code+"\nreturn {"+exports.join(",")+"};")(...Object.values(imports));
}
const pure=loadTs("web-spa/src/fortune/dailyCard.ts",
 ["buildDailyCard","localDateKey","dailyProfileHash","fnv1a","personalCycle","dayStemRelation","dayBranchRelation","traditionalAlmanacText"]);
const memory=new Map();
global.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),
 removeItem:key=>memory.delete(key)};
const store=loadTs("web-spa/src/fortune/dailyStore.ts",
 ["readDailyCache","readCachedDaily","saveCachedDaily","readDailyKind","saveDailyKind","readDailyStreak","markDailySeen","pruneDailyCache","DAILY_CACHE_KEY","DAILY_STREAK_KEY","isDailyCompleted","completeDailyExploration","recentDailyExplorations","readDailyCompletionStreak"],
 {localDateKey:pure.localDateKey});
const translate=(key,values={})=>key+JSON.stringify(values);
const profile={birthDate:"1985-07-06",birthTime:"04:10",gender:"1"};
const onDate=(kind,date,override=profile,extra={})=>pure.buildDailyCard({kind,profile:override,localDate:date,lang:"en",translate,...extra});
function getCard(value){assert.equal(value.version,1,JSON.stringify(value));return value;}
const fakeSolar={fromYmd:()=>({getLunar:()=>({getDayInGanZhi:()=>"丙午",
 getDayYi:()=>["造车器","出货财","开仓","祭祀"],getDayJi:()=>["动土","纳财","修门","祭祀"],getDayChongDesc:()=>"(戊辰)龙"})})};
const bazi={dayMaster:"庚",dayPillar:"庚辰",yearPillar:"乙丑",balancingElements:["金"]};

test("D1 deterministic daily cards and change of date/profile",()=>{
 const a=getCard(onDate("numerology","2026-10-27"));
 assert.deepEqual(a,getCard(onDate("numerology","2026-10-27")));
 const b=getCard(onDate("numerology","2026-10-28"));
 assert.notDeepEqual(a,b);
 const c=getCard(onDate("numerology","2026-10-27",{...profile,birthDate:"1985-07-07"}));
 assert.notEqual(a.basis[0],c.basis[0]);
 assert.ok(a.basis.length);assert.equal(a.do.length,2);
 assert.equal(a.luckyColor.hex.startsWith("#"),true);
 assert.deepEqual(pure.personalCycle(profile,"2026-10-27"),{personalYear:5,personalMonth:6,personalDay:6});
});

test("D2 local dates use wall clock, not UTC",()=>{
 const old=process.env.TZ;process.env.TZ="Asia/Taipei";
 try{
  assert.equal(pure.localDateKey(new Date("2026-10-26T23:59:00Z")),"2026-10-27");
  assert.equal(pure.localDateKey(new Date("2026-10-27T00:01:00Z")),"2026-10-27");
  assert.equal(pure.localDateKey(new Date("2026-10-26T15:59:00Z")),"2026-10-26");
  assert.equal(pure.localDateKey(new Date("2026-10-26T16:01:00Z")),"2026-10-27");
 }finally{if(old===undefined)delete process.env.TZ;else process.env.TZ=old;}
 assert.doesNotMatch(read("web-spa/src/fortune/dailyCard.ts"),/toISOString\(\)\.slice\(0,\s*10\)/);
});

test("D3 missing birth time, persisted kind, and cache fault tolerance",()=>{
 memory.clear();assert.equal(store.readDailyKind(),"numerology");
 assert.deepEqual(onDate("bazi","2026-10-27",{birthDate:"1985-07-06"}),{status:"unavailable",reason:"birthTime"});
 store.saveDailyKind("bazi");assert.equal(store.readDailyKind(),"bazi");
 const card=getCard(onDate("numerology","2026-10-27")),hash=pure.dailyProfileHash(profile);
 store.saveCachedDaily(card,hash,undefined,"en");
 assert.deepEqual(store.readCachedDaily(card.date,card.kind,hash).card,card);
 memory.set(store.DAILY_CACHE_KEY,"{bad");assert.deepEqual(store.readDailyCache(),{});
});

test("D4 14 day retention and local-day streak",()=>{
 memory.clear();
 const hash=pure.dailyProfileHash(profile);
 for(let i=1;i<=17;i++){
  const day=String(i).padStart(2,"0");
  store.saveCachedDaily(getCard(onDate("numerology","2026-10-"+day)),hash);
 }
 const days=Object.keys(store.pruneDailyCache(store.readDailyCache(),"2026-10-17"));
 assert.equal(days.length,14);
 assert.equal(days.includes("2026-10-03"),false);
 assert.equal(days.includes("2026-10-04"),true);
 assert.deepEqual(store.markDailySeen("2026-10-01"),{streak:1,best:1,lastSeen:"2026-10-01"});
 assert.equal(store.markDailySeen("2026-10-01").streak,1);
 assert.equal(store.markDailySeen("2026-10-02").streak,2);
 assert.equal(store.markDailySeen("2026-10-04").streak,1);
 memory.set(store.DAILY_STREAK_KEY,"broken");assert.equal(store.readDailyStreak().streak,0);
});

test("D1 bazi equivalence with original ten god and branch relations",()=>{
 const W={};vm.runInNewContext(read("features/fortune/bazi/calculator.js"),{window:W});
 for(const a of "甲乙丙丁戊己庚辛壬癸")for(const b of "甲乙丙丁戊己庚辛壬癸")
  assert.equal(pure.dayStemRelation(a,b),W.CrewFortuneBaZi.tenGod(a,b),a+b);
 for(const a of "子丑寅卯辰巳午未申酉戌亥")for(const b of "子丑寅卯辰巳午未申酉戌亥")
  assert.equal(pure.dayBranchRelation(a,b),W.CrewFortuneBaZi.branchRelation(a,b),a+b);
 const c=getCard(onDate("bazi","2026-10-27",profile,{bazi,lunar:fakeSolar,lang:"zh-TW"}));
 assert.equal(c.kind,"bazi");assert.equal(c.basis.length,3);
 assert.equal(c.almanac.yi.length,3);
});

test("D5 almanac only in zh locale, no non-zh UI almanac",()=>{
 const zh=getCard(onDate("bazi","2026-10-27",profile,{bazi,lunar:fakeSolar,lang:"zh-TW"}));
 assert.ok(zh.almanac);assert.deepEqual(Array.from(zh.almanac.yi),["造車器","出貨財","開倉"]);
 assert.deepEqual(Array.from(zh.almanac.ji),["動土","納財","修門"]);
 assert.equal(zh.almanac.chong,"(戊辰)龍");
 assert.equal(pure.traditionalAlmanacText("马鸡猪门规丧盖钟针药"),"馬雞豬門規喪蓋鐘針藥");
 for(const lang of ["en","ja","fr","vi"]){
  const c=getCard(onDate("bazi","2026-10-27",profile,{bazi,lunar:fakeSolar,lang}));
  assert.equal(Object.hasOwn(c,"almanac"),false);
  assert.match(c.basis[0],/Bing-Wu/);
 }
 const ui=read("web-spa/src/fortune/FortuneDailyCard.tsx");
 assert.match(ui,/\/\^zh\/i\.test\(locale\)&&full\.almanac/);
});

test("D5b optional almanac keeps zh personal theme without Solar but preserves strict Fortune default",()=>{
 const zh=onDate("numerology","2026-11-12",profile,{lang:"zh-TW",almanac:"optional"});
 assert.equal(zh.version,1);
 assert.ok(zh.theme);
 assert.equal(zh.almanac,undefined);
 assert.deepEqual(onDate("numerology","2026-11-12",profile,{lang:"zh-TW"}),
  {status:"loading",reason:"lunar"});
 const full=onDate("numerology","2026-11-12",profile,{lang:"zh-TW",lunar:fakeSolar});
 assert.ok(full.almanac&&full.almanac.yi.length);
 assert.deepEqual(onDate("numerology","2026-11-12",profile,{lang:"zh-TW",lunar:fakeSolar,almanac:"optional"}),full);
});

test("D6 Gemini is opt-in, quota errors do not count, uses allowlisted data",async()=>{
 memory.clear();
 const ai=loadTs("web-spa/src/fortune/dailyAi.ts",["generateDailyAi","dailyAiPrompt","DAILY_AI_OPTIONS"],
 {findExistingAiForKind:(date,kind)=>{const entries=store.readDailyCache()[date]||{};
  const found=Object.entries(entries).find(([k,v])=>k.startsWith(kind+":")&&v.ai);
  return found?{profileHash:found[0].slice(kind.length+1),ai:found[1].ai}:null;},
  readCachedDaily:store.readCachedDaily,saveCachedDaily:store.saveCachedDaily});
 const card=getCard(onDate("numerology","2026-10-27")),hash=pure.dailyProfileHash(profile);
 let calls=0,prompt="",config;
 const invoke=async(p,c)=>{calls++;prompt=p;config=c;return "A gentle reflective paragraph."};
 assert.equal((await ai.generateDailyAi(card,hash,"English",invoke)).status,"ready");
 assert.equal((await ai.generateDailyAi(card,hash,"English",invoke)).status,"ready");assert.equal(calls,1);
 assert.equal(config.maxOutputTokens,1024);assert.equal(config.thinking,"low");assert.equal(config.requireComplete,true);
 assert.equal(config.preferLive,false);assert.equal(config.timeoutMs,30000);
 assert.doesNotMatch(prompt,/birthDate|birthTime|latitude|longitude|utcOffset|timeZoneId|1985-07-06/);
 const other=getCard(onDate("numerology","2026-10-27",{...profile,birthDate:"1990-03-03"}));
 assert.equal((await ai.generateDailyAi(other,pure.dailyProfileHash({birthDate:"1990-03-03"}),"English",invoke)).status,"used");
 assert.equal(calls,1);
 memory.clear();
 const longResult=await ai.generateDailyAi(card,hash,"English",async()=>"# "+"a".repeat(350));
 assert.equal(longResult.text.length,120);
 assert.equal(store.readCachedDaily(card.date,card.kind,hash).ai.length,120);
 memory.clear();
 const quota=await ai.generateDailyAi(card,hash,"English",async()=>{throw Error("429 quota exhausted")});
 assert.equal(quota.status,"quota");assert.equal(store.readCachedDaily(card.date,card.kind,hash),null);
});

test("D7 share function only accepts a DailyCard and excludes private input",()=>{
 const source=read("web-spa/src/fortune/shareCard.ts");
 const daily=source.slice(source.indexOf("export type DailyShareLabels"));
 assert.match(daily,/buildDailyShareFile\(card:import\("\.\/dailyCard"\)\.DailyCard,labels:DailyShareLabels\)/);
 assert.match(daily,/canvas\.width=1080;canvas\.height=1350/);
 assert.doesNotMatch(daily,/birthDate|birthTime|latitude|longitude|utcOffset|timeZoneId/);
 assert.doesNotMatch(daily,/card\.basis|\.dayMaster|\.dayPillar|\.yearPillar/);
 assert.match(daily,/labels\.doLabel/);
 assert.match(daily,/labels\.avoidLabel/);
 assert.match(daily,/labels\.disclaimer/);
 assert.match(daily,/labels\.luckyColor/);
 assert.doesNotMatch(daily,/fillText\("DO"|fillText\("NOTICE"/);
});
test("D8 eleven complete locale catalogs with three variants per bazi category",()=>{
 const langs=["zh-TW","en","ja","es","pt-BR","id","ko","fr","de","vi","th"];
 const catalogs=langs.map(code=>JSON.parse(read("web-spa/src/i18n/locales/"+code+"/fortuneDaily.json")));
 const keys=x=>Object.entries(x).flatMap(([key,v])=>typeof v==="string"?[key]:keys(v).map(y=>key+"."+y)).sort();
 for(const catalog of catalogs){
  assert.deepEqual(keys(catalog),keys(catalogs[0]));
  for(const category of ["peers","expression","resources","responsibility","learning"]){
   assert.equal(Object.keys(catalog.templates[category]).length,3);
   const rows=Object.values(catalog.templates[category]);
   assert.equal(new Set(rows.map(x=>x.headline)).size,3);
   for(const field of ["headline","theme","do0","do1","avoid"]){
    assert.equal(new Set(rows.map(x=>x[field])).size,3,category+" "+field);
   }
   const unique=new Set(rows.flatMap(x=>[x.headline,x.theme,x.do0,x.do1,x.avoid]));
   assert.ok(unique.size>=12,category+" needs >=12 distinct sentences among 15");
   assert.equal(new Set(rows.flatMap(x=>[x.do0,x.do1,x.avoid])).size,9);
  }
  assert.equal(Object.keys(catalog.cards).length,22);
  assert.equal(typeof catalog.streak_one,"string");
  assert.equal(typeof catalog.streak_other,"string");
  assert.ok(catalog.streak_one.includes("{{count}}"));
  assert.ok(catalog.streak_other.includes("{{count}}"));
  assert.ok(catalog.colorSummary.includes("{{color}}"));
  assert.ok(catalog.basis.keyword.includes("{{keyword}}"));
  assert.equal("streak" in catalog,false);
  assert.doesNotMatch(JSON.stringify(catalog.templates),/成功率|運勢分數|luckyScore|大凶|必定/);
 }
 const en=catalogs[1];
 assert.doesNotMatch(JSON.stringify(en.templates),/resources fits|resources reveals|pace through responsibility/i);
 assert.notEqual(en.streak_one,en.streak_other);
 assert.equal(catalogs[0].doLabel,"試試");
 assert.equal(catalogs[2].doLabel,"試してみる");
 const cardSource=read("web-spa/src/fortune/dailyCard.ts");
 assert.doesNotMatch(cardSource,/copy\.theme\s*\+\s*["'] · /);
 const strip=read("web-spa/src/fortune/FortuneDailyStrip.tsx");
 assert.match(strip,/t\("colorSummary",\{color:card\.luckyColor\.name\}\)/);
 assert.doesNotMatch(strip,/luckyColor"\)}：/);
 const index=read("web-spa/src/i18n/index.ts");
 assert.match(index,/fortuneReport,fortuneDaily/);
 assert.doesNotMatch(index,/namespaceNames=\[[^\]]*fortuneDaily/);
});

test("D9 daily discovery is a real daily action, not an automatic page-view streak",()=>{
 memory.clear();
 const hash=pure.dailyProfileHash(profile);
 assert.equal(store.readDailyCompletionStreak().streak,0);
 assert.equal(store.isDailyCompleted("2026-11-08","numerology",hash),false);
 assert.equal(store.completeDailyExploration("2026-11-08","numerology",hash).streak,1);
 assert.equal(store.isDailyCompleted("2026-11-08","numerology",hash),true);
 assert.equal(store.completeDailyExploration("2026-11-08","numerology",hash).streak,1);
 assert.equal(store.recentDailyExplorations("2026-11-08","numerology",hash).at(-1).completed,true);
 assert.equal(store.recentDailyExplorations("2026-11-08","bazi",hash).at(-1).completed,false);
 const ui=read("web-spa/src/fortune/FortuneDailyCard.tsx");
 assert.match(ui,/setRevealed\(true\)/);
 assert.match(ui,/completeDailyExploration\(date,kind,profileHash\)/);
 assert.doesNotMatch(ui,/markDailySeen\(date\)/);
});
test("D10 daily flip and illustrated share respect assets and accessibility",()=>{
 const css=read("web-spa/src/fortune/dailyCard.css");
 assert.match(css,/rotateY\(180deg\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 const num=getCard(onDate("numerology","2026-11-08"));
 assert.match(num.artSrc,/^\/fortune\/identity\/art\/tarot-\d+\.webp$/);
 const baziCard=getCard(onDate("bazi","2026-11-08",profile,{bazi,lunar:fakeSolar}));
 assert.equal(baziCard.artSrc,"/fortune/identity/art/bazi-geng.webp");
 const share=read("web-spa/src/fortune/shareCard.ts");
 assert.match(share,/dailyArt\(card\.artSrc\)/);
 const langs=["zh-TW","en","ja","es","pt-BR","id","ko","fr","de","vi","th"];
 for(const lang of langs){
  const doc=JSON.parse(read("web-spa/src/i18n/locales/"+lang+"/fortuneDaily.json"));
  for(const key of ["flipCard","markComplete","completed","moreDetails","recentDays"])assert.ok(doc[key]);
 }
});
 
test("D11 direct Fortune URL keeps stable hooks across lazy locale and saved chart hydration",()=>{
 const source=read("web-spa/src/fortune/FortuneDailyCard.tsx");
 const component=source.slice(source.indexOf("export function FortuneDailyCard("));
 const firstReturn=component.indexOf("if(!clientReady||!ready)return");
 assert.ok(firstReturn>0,"initial Fortune SSR and client hydration need the same loading placeholder");
 assert.match(component,/const clientReady=useClientReady\(\)/);
 assert.match(component,/if\(!clientReady\|\|!ready\|\|!profile\?\.birthDate\)return null/,"daily chart generation must wait for hydration");
 const hooks=[...component.matchAll(/\buse(?:Effect|Memo|Ref|State|ClientReady|RouteNamespace|LocalDay)\s*\(/g)];
 assert.ok(hooks.length>=15,"expected daily card hook calls to be covered");
 for(const hook of hooks){
  assert.ok(hook.index<firstReturn,"Hook "+hook[0]+" must not be conditional on namespace/profile readiness");
 }
 assert.match(component,/if\(!clientReady\|\|!ready\|\|!profile\?\.birthDate\)return;\s*if\(revealed\)/,
  "focus effect must remain mounted even when profile or locale is unavailable");
 const home=read("web-spa/src/fortune/HomePage.tsx");
 assert.match(home,/<FortuneDailyCard chartHash=\{chartHash\}\/>/,"saved chart must open a prominent, matching daily card");
 assert.match(home,/!hasDaily&&<details className="fortune-journey-daily">/,
  "old collapsible presentation remains only for a visitor without a saved chart");
});
