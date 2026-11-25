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
 ["buildDailyCard","localDateKey","dailyProfileHash","fnv1a","personalCycle","dayStemRelation","dayBranchRelation","traditionalAlmanacText","dailySolarPeriod"]);
const memory=new Map();
global.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),
 removeItem:key=>memory.delete(key)};
const store=loadTs("web-spa/src/fortune/dailyStore.ts",
 ["readDailyCache","readCachedDaily","saveCachedDaily","readDailyKind","readDailyKindChoice","resolveDailyKind","saveDailyKind","readDailyStreak","markDailySeen","pruneDailyCache","DAILY_CACHE_KEY","DAILY_COPY_REVISION","DAILY_STREAK_KEY","isDailyCompleted","completeDailyExploration","recentDailyExplorations","readDailyCompletionStreak"],
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
 memory.clear();assert.equal(store.readDailyKind(),"numerology");assert.equal(store.readDailyKindChoice(),null);
 assert.deepEqual(onDate("bazi","2026-10-27",{birthDate:"1985-07-06"}),{status:"unavailable",reason:"birthTime"});
 store.saveDailyKind("bazi");assert.equal(store.readDailyKind(),"bazi");assert.equal(store.readDailyKindChoice(),"bazi");
 const card=getCard(onDate("numerology","2026-10-27")),hash=pure.dailyProfileHash(profile);
 store.saveCachedDaily(card,hash,undefined,"en");
 assert.deepEqual(store.readCachedDaily(card.date,card.kind,hash).card,card);
 assert.equal(store.DAILY_COPY_REVISION,4);
 assert.equal(store.readCachedDaily(card.date,card.kind,hash).copyRevision,4);
 const raw=JSON.parse(memory.get(store.DAILY_CACHE_KEY));
 raw[card.date][card.kind+":"+hash].copyRevision=3;
 memory.set(store.DAILY_CACHE_KEY,JSON.stringify(raw));
 assert.notEqual(store.readCachedDaily(card.date,card.kind,hash).copyRevision,4,"legacy copy cache cannot match revision 4");
 store.saveCachedDaily(card,hash,undefined,"en");
 assert.equal(store.readCachedDaily(card.date,card.kind,hash).copyRevision,4);
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
 assert.equal(c.kind,"bazi");assert.equal(c.basis.length,5);
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
 const portrait=/\.fortune-daily-portrait\{([^}]+)\}/.exec(css)?.[1]||"";
 const imageCss=/\.fortune-daily-portrait img\{([^}]+)\}/.exec(css)?.[1]||"";
 assert.match(portrait,/border-radius:50%/);
 assert.match(portrait,/overflow:hidden/,"the square artwork must be clipped by its circular container");
 assert.match(imageCss,/object-fit:cover/);
 assert.match(imageCss,/transform:scale\(1\.15\)/);
 assert.match(imageCss,/animation:fortune-daily-float/);
 assert.doesNotMatch(imageCss,/drop-shadow/,"do not draw square artwork shadows past the circle");
 assert.match(portrait,/box-shadow:/,"the outer circular container owns the shadow");
 assert.match(css,/@keyframes fortune-daily-float\{0%,100%\{transform:translateY\(0\) scale\(1\.15\)\}50%\{transform:translateY\(-7px\) scale\(1\.15\)\}\}/,
  "the animation must retain zoom at both rest and float positions");
 assert.match(css,/@media\(max-width:600px\)[^\n]*\.fortune-daily-portrait\{[^}]*width:108px;height:108px/,
  "mobile artwork must be circular, not 136x126 oval");
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)[^\n]*\.fortune-daily-portrait img[^}]*animation:none!important/);
 const artPattern=/^\/fortune\/daily\/art\/daily-(peers|resources|expression|responsibility|learning)-([123])\.webp$/;
 const num=getCard(onDate("numerology","2026-11-08"));
 const baziCard=getCard(onDate("bazi","2026-11-08",profile,{bazi,lunar:fakeSolar}));
 for(const [kind,card,extra] of [["numerology",num,{}],["bazi",baziCard,{bazi,lunar:fakeSolar}]]){
  const match=artPattern.exec(card.artSrc);
  assert.ok(match,kind+" must use a daily themed illustration");
  assert.deepEqual(card,getCard(onDate(kind,"2026-11-08",profile,extra)),kind+" artwork must be deterministic");
  const seed=pure.fnv1a("crew-daily-v1:"+kind+":"+pure.dailyProfileHash(profile)+":2026-11-08");
  assert.equal(Number(match[2]),((seed>>>5)%3)+1,"artwork variant must align with daily copy");
 }
 // The Bazi fixture returns the same ten-god category every day; the artwork must still rotate.
 const week=Array.from({length:7},(_,i)=>"2026-11-"+String(i+8).padStart(2,"0"))
  .map(date=>getCard(onDate("bazi",date,profile,{bazi,lunar:fakeSolar})).artSrc);
 assert.equal(new Set(week.map(src=>artPattern.exec(src)[1])).size,1);
 assert.ok(new Set(week).size>1,"same category should vary across a week");
 for(let i=8;i<22;i++){
  const date="2026-11-"+String(i).padStart(2,"0");
  assert.match(getCard(onDate("numerology",date)).artSrc,artPattern);
  assert.match(getCard(onDate("bazi",date,profile,{bazi,lunar:fakeSolar})).artSrc,artPattern);
 }
 const share=read("web-spa/src/fortune/shareCard.ts");
 assert.match(share,/dailyArt\(card\.artSrc\)/);
 assert.match(share,/daily-\(\?:peers\|resources\|expression\|responsibility\|learning\)-\[123\]/,
  "share artwork allowlist must accept exactly the daily categories and variants");
 assert.doesNotMatch(share.slice(share.indexOf("async function dailyArt"),share.indexOf("export async function buildDailyShareFile")),
  /identity\/art/,"daily sharing must not allow the previous identity images");
 assert.match(share,/Math\.max\(height\/art\.naturalWidth,height\/art\.naturalHeight\)\*1\.15/,
  "shared artwork must use undistorted cover with 15% overscan");
 assert.match(share,/ctx\.arc\(cx,cy,radius,0,Math\.PI\*2\);ctx\.clip\(\)/,
  "shared artwork must be clipped to a true circle");
 assert.match(share,/ctx\.save\(\)/);
 assert.match(share,/ctx\.restore\(\)/);
 const langs=["zh-TW","en","ja","es","pt-BR","id","ko","fr","de","vi","th"];
 for(const lang of langs){
  const doc=JSON.parse(read("web-spa/src/i18n/locales/"+lang+"/fortuneDaily.json"));
  for(const key of ["flipCard","markComplete","completed","moreDetails","recentDays"])assert.ok(doc[key]);
 }
});
 
test("D10b sharing allowlist and centered circular cover rendering use only valid daily artwork",async()=>{
 const {buildDailyShareFile}=loadTs("web-spa/src/fortune/shareCard.ts",["buildDailyShareFile"]);
 const previousImage=global.Image,previousDocument=global.document;
 const requested=[],drawn=[],calls=[];
 const ctx={createLinearGradient:()=>({addColorStop(){}}),fillRect(){},
  beginPath(){calls.push(["beginPath"]);},arc(...args){calls.push(["arc",...args]);},
  save(){calls.push(["save"]);},clip(){calls.push(["clip"]);},restore(){calls.push(["restore"]);},
  fill(){},fillText(){},measureText:()=>({width:0}),
  drawImage(...args){drawn.push(args);calls.push(["drawImage"]);}};
 global.Image=class{naturalWidth=0;naturalHeight=0;
  set src(url){requested.push(url);
   // Square and landscape artwork both cover the same circle without stretching.
   [this.naturalWidth,this.naturalHeight]=requested.length===1?[1000,1000]:[1200,800];
   this.onload();}};
 global.document={createElement:tag=>{assert.equal(tag,"canvas");return {getContext:()=>ctx,
  toBlob:callback=>callback(new Blob(["test"],{type:"image/png"}))};}};
 const labels={doLabel:"Do",avoidLabel:"Avoid",luckyColor:"Color",disclaimer:"Info",kindLabel:"Numerology"};
 try{
  const cards=[getCard(onDate("numerology","2026-11-08")),
   getCard(onDate("bazi","2026-11-08",profile,{bazi,lunar:fakeSolar}))];
  const expected=[[269.25,143.75,540.5,540.5],[134.125,143.75,810.75,540.5]];
  for(const [i,card] of cards.entries()){
   const from=calls.length;
   const file=await buildDailyShareFile(card,labels);
   assert.equal(file.type,"image/png");
   assert.equal(requested.at(-1),card.artSrc);
   const [image,x,y,w,h]=drawn.at(-1);
   for(const [index,coordinate] of [x,y,w,h].entries())
    assert.ok(Math.abs(coordinate-expected[i][index])<1e-9,"15% overscanned art must stay centered and correctly sized");
   assert.ok(Math.abs(w/h-image.naturalWidth/image.naturalHeight)<1e-12,"art must not stretch");
   const operations=calls.slice(from);
   const arc=operations.find(op=>op[0]==="arc"&&op[3]===235);
   assert.deepEqual(arc,["arc",539.5,414,235,0,Math.PI*2],"circle centered in 835x470 frame");
   assert.equal(operations.filter(op=>op[0]==="save").length,1);
   assert.equal(operations.filter(op=>op[0]==="clip").length,1);
   assert.equal(operations.filter(op=>op[0]==="restore").length,1);
   const clip=operations.findIndex(op=>op[0]==="clip");
   const draw=operations.findIndex(op=>op[0]==="drawImage");
   const restore=operations.findIndex(op=>op[0]==="restore");
   assert.ok(clip>0&&draw>clip&&restore>draw,"draw must be inside the circular clipping context");
  }
  for(const invalid of ["/fortune/identity/art/tarot-22.webp",
   "/fortune/daily/art/daily-peers-4.webp","/fortune/daily/art/daily-unknown-2.webp",
   "/fortune/daily/art/../identity/art/tarot-22.webp"]){
   await buildDailyShareFile({...cards[0],artSrc:invalid},labels);
  }
  assert.equal(requested.length,2,"only allowlisted daily art URLs may be loaded");
  assert.equal(drawn.length,2,"invalid daily art must render the existing placeholder");
 }finally{global.Image=previousImage;global.document=previousDocument;}
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

test("D12 daily fortune offers one safe, profile-bound Zoe interpretation route matching home",()=>{
 const source=read("web-spa/src/fortune/FortuneDailyCard.tsx");
 const home=read("web-spa/src/pages/DailyTopicCards.tsx");
 const fullStart=source.indexOf("{full?<>"),fullEnd=source.indexOf('</>:<p role="status"',fullStart);
 assert.ok(fullStart>0&&fullEnd>fullStart,"Zoe link must be in the successful-card branch");
 const full=source.slice(fullStart,fullEnd);
 const links=[...full.matchAll(/<Link className="fortune-daily-zoe"[^>]*>[^<]*<\/Link>/g)];
 assert.equal(links.length,1,"only one Zoe action on a full card");
 const zoe=links[0][0];
 assert.match(full,/\{\/\^\[a-f0-9\]\{64\}\$\/\.test\(profileHash\)&&searchParams\.get\("zoe"\)!=="1"&&<Link className="fortune-daily-zoe"/,
  "the action needs a valid hash and must disappear while Zoe reading is open");
 assert.match(zoe,/to=\{"\/fortune\?daily=1&chart="\+profileHash\+"&kind="\+kind\+"&zoe=1"\}/);
 assert.doesNotMatch(home,/chatHref|dailyQuote\.chatRead|&zoe=1/);
 assert.match(home,/fortuneHref=isPersonal\?"\/fortune\?daily=1&chart="\+personal!\.hash\+"&kind="\+personal!\.kind/);
 assert.match(zoe,/\{t\("dailyQuote\.chatRead",\{ns:"home"\}\)\}/,"reuse the home locale key");
 const sceneEnd=full.indexOf('</div>\n   {',full.indexOf('className="fortune-daily-scene"'));
 const linkAt=full.indexOf('<Link className="fortune-daily-zoe"');
 const weekAt=full.indexOf('className="fortune-daily-week"');
 assert.ok(sceneEnd>=0&&linkAt>sceneEnd&&linkAt<weekAt,"Zoe follows the flipper, before the weekly markers");
 assert.equal(full.slice(0,linkAt).includes('revealed&&<div className="fortune-daily-extras"'),false,
  "Zoe must be available without flipping");
 assert.match(full,/searchParams\.get\("zoe"\)==="1"&&<FortuneZoeReading/);
 assert.ok(full.indexOf('FortuneZoeReading')>linkAt&&full.indexOf('FortuneZoeReading')<weekAt);
 const empty=source.slice(source.indexOf('if(!clientReady||!ready)return'),fullStart);
 assert.doesNotMatch(empty,/\/friend\/live|FortuneZoeReading/);
 assert.doesNotMatch(zoe,/onClick|sendMessage|setDraft|localStorage|fetch\s*\(|trackUsageEvent|useEffect/,
  "navigation only: no send, draft changes, storage writes, API or analytics");
 const css=read("web-spa/src/fortune/dailyCard.css");
 const rule=css.match(/\.fortune-daily-zoe\{([^}]*)\}/);
 assert.ok(rule,"dedicated action styling");
 assert.match(rule[1],/min-height:44px/);
 const font=rule[1].match(/font-size:([\d.]+)px/);
 assert.ok(font&&Number(font[1])>=12,"legible label >=12px");
 assert.match(rule[1],/white-space:normal/);
 assert.match(rule[1],/overflow-wrap:anywhere/);
 assert.match(css,/\.fortune-daily-zoe:focus-visible\{[^}]*outline:/);
});

test("branch interactions affect actual advice and local rules remain deterministic",()=>{
 const base=getCard(onDate("bazi","2026-11-13",profile,{bazi:{...bazi,dayPillar:"庚午",yearPillar:"乙未"},lunar:fakeSolar}));
 const clash=getCard(onDate("bazi","2026-11-13",profile,{bazi:{...bazi,dayPillar:"庚子",yearPillar:"乙未"},lunar:fakeSolar}));
 assert.match(clash.avoid,/templates\.responsibility/);
 assert.match(base.avoid,/templates\.peers/);
 assert.deepEqual(clash,getCard(onDate("bazi","2026-11-13",profile,{bazi:{...bazi,dayPillar:"庚子",yearPillar:"乙未"},lunar:fakeSolar})));
});

test("ten-god titles are distinct and all supported locales provide each title",()=>{
 const gods=["比肩","劫財","食神","傷官","偏財","正財","七殺","正官","偏印","正印"];
 for(const lang of ["zh-TW","en","ja","es","pt-BR","id","fr","de","ko","vi","th"]){
  const catalog=JSON.parse(read("web-spa/src/i18n/locales/"+lang+"/fortuneDaily.json"));
  assert.equal(new Set(gods.map(g=>catalog.godHeadlines[g])).size,10);
  assert.ok(gods.every(g=>typeof catalog.godHeadlines[g]==="string"&&catalog.godHeadlines[g].trim()));
 }
 const seen=new Set();
 for(const stem of "甲乙丙丁戊己庚辛壬癸"){
  const lunar={fromYmd:()=>({getLunar:()=>({getDayInGanZhi:()=>stem+"午"})})};
  seen.add(getCard(onDate("bazi","2026-11-13",profile,{bazi,lunar})).headline);
 }
 assert.equal(seen.size,10);
});

test("solar term month and year change at the documented noon boundary",()=>{
 assert.deepEqual(pure.dailySolarPeriod("2026-02-03"),{year:2025,yearGanZhi:"乙巳",monthGanZhi:"己丑"});
 assert.deepEqual(pure.dailySolarPeriod("2026-02-04"),{year:2026,yearGanZhi:"丙午",monthGanZhi:"庚寅"});
 assert.equal(pure.dailySolarPeriod("2026-11-07").monthGanZhi,"戊戌");
 assert.equal(pure.dailySolarPeriod("2026-11-08").monthGanZhi,"己亥");
 assert.equal(pure.dailySolarPeriod("1999-12-31"),null);
 assert.equal(pure.dailySolarPeriod("2101-01-01"),null);
 assert.equal(pure.dailySolarPeriod("2026-02-30"),null);
 const card=getCard(onDate("bazi","2026-11-13",profile,{bazi:{...bazi,luckPillars:[{startYear:2020,endYear:2029,ganZhi:"戊寅"}]},lunar:fakeSolar}));
 assert.equal(card.basis.length,6);
 assert.ok(card.basis.some(x=>x.startsWith("basis.baziMonth")));
 assert.ok(card.basis.some(x=>x.startsWith("basis.baziAnnual")));
 assert.ok(card.basis.some(x=>x.startsWith("basis.baziLuck")));
});

test("local fortune copy composition produces at least 150 distinct full-card combinations",()=>{
 const variants=new Set();
 const stems="甲乙丙丁戊己庚辛壬癸",branches="子丑寅卯辰巳午未申酉戌亥";
 for(let d=0;d<60;d++){
  const date=new Date(Date.UTC(2026,0,1+d)).toISOString().slice(0,10);
  const lunar={fromYmd:()=>({getLunar:()=>({getDayInGanZhi:()=>stems[d%10]+branches[d%12]})})};
  for(let i=0;i<12;i++){
   const natal={dayMaster:stems[i%10],dayPillar:stems[i%10]+branches[i],yearPillar:"乙丑",monthPillar:"丙寅",timePillar:"丁卯",balancingElements:["木","水"],luckPillars:[{startYear:2020,endYear:2029,ganZhi:"戊寅"}]};
   const card=getCard(onDate("bazi",date,profile,{bazi:natal,lunar}));
   variants.add(JSON.stringify([card.headline,card.theme,card.do,card.avoid]));
  }
 }
 assert.ok(variants.size>=150,"Expected at least 150 distinct complete copy combinations, got "+variants.size);
});

test("daily collectible grows with its content rather than a fixed-height mobile card",()=>{
 const css=read("web-spa/src/fortune/dailyCard.css");
 assert.match(css,/\.fortune-daily-flipper\{[^}]*display:grid/);
 assert.doesNotMatch(css,/\.fortune-daily-flipper\{[^}]*\bheight:\d/);
 assert.match(css,/\.fortune-daily-face\{[^}]*grid-area:1\/1/);
 assert.match(css,/\.fortune-daily-face\[aria-hidden="true"\]\{pointer-events:none/);
 assert.match(css,/\.fortune-daily-back-button\{[^}]*min-height:44px/);
});
