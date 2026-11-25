const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
async function model(){
 const code=stripTypeScriptTypes(read("web-spa/src/pages/dailyQuotes.ts"),{mode:"strip"});
 return import("data:text/javascript;charset=utf-8,"+encodeURIComponent(code));
}
const langs=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];
const root="web-spa/src/pages/";

test("30 distinct URL-safe IDs, strict allowlist (including prototype and traversal probes)",async()=>{
 const {DAILY_QUOTE_IDS,getDailyQuote}=await model();
 assert.ok(DAILY_QUOTE_IDS.length>=30);
 assert.equal(new Set(DAILY_QUOTE_IDS).size,DAILY_QUOTE_IDS.length);
 for(const id of DAILY_QUOTE_IDS){
  assert.match(id,/^q\d{2,}$/);
  assert.deepEqual(getDailyQuote(id),{id});
 }
 for(const bad of [null,"","__proto__","constructor","../x","q00","q31","<script>","q01%00"," q01 ","q01/q02"])
  assert.equal(getDailyQuote(bad),undefined,String(bad));
});

test("local calendar picks stay constant through midnight and cover 30 consecutive days",async()=>{
 const {pickDailyQuote}=await model();
 const picks=[];
 for(let day=0;day<30;day++){
  const morning=new Date(2026,10,12+day,0,1),late=new Date(2026,10,12+day,23,59);
  assert.equal(pickDailyQuote(morning).id,pickDailyQuote(late).id);
  picks.push(pickDailyQuote(morning).id);
  if(day)assert.notEqual(picks[day],picks[day-1]);
 }
 assert.equal(new Set(picks).size,30);
});

test("11 localized quote catalogs contain all 30 nonblank short thoughts; UI labels and prompt match",async()=>{
 const {DAILY_QUOTE_IDS}=await model();
 const en=JSON.parse(read("web-spa/src/i18n/locales/en/dailyQuote.json"));
 for(const lang of langs){
  const quotes=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/dailyQuote.json`));
  const home=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/home.json`));
  const friends=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/friends.json`));
  assert.deepEqual(Object.keys(quotes).sort(),Object.keys(en).sort(),lang);
  assert.deepEqual(Object.keys(quotes).sort(),[...DAILY_QUOTE_IDS].sort(),lang);
  for(const id of DAILY_QUOTE_IDS){
   assert.ok(typeof quotes[id]==="string"&&quotes[id].trim(),lang+" "+id);
   assert.ok(quotes[id].length<=125,lang+" "+id+" should be short");
   assert.doesNotMatch(quotes[id],/\{\{|\}\}/,lang+" "+id);
  }
  assert.deepEqual(Object.keys(home.dailyQuote).sort(),["basisBazi","basisNumerology","chat","chatRead","chooseChart","fortune","fortuneFull","kind","markSelf","me","personalTitle","setupChart","setupHint","title","unnamedChart","updated"]);
  assert.deepEqual(Object.keys(home.dailyQuote.kind).sort(),["bazi","tarot","vedic"]);
  for(const text of Object.values(home.dailyQuote.kind))assert.ok(typeof text==="string"&&text.trim());
  for(const key of ["title","fortune","chat","chatRead","fortuneFull","personalTitle","chooseChart","me","markSelf","setupChart","setupHint","basisBazi","basisNumerology","unnamedChart"])assert.ok(home.dailyQuote[key]?.trim(),lang+" "+key);
  assert.ok(friends.dailyQuoteStarter?.trim(),lang);
  assert.ok(friends.dailyFortuneStarter?.trim(),lang);
  assert.doesNotMatch(friends.dailyFortuneStarter,/\{\{|\}\}/,lang);
  assert.deepEqual(friends.dailyQuoteStarter.match(/\{\{[^}]+\}\}/g),["{{quote}}"]);
  assert.equal(home.dailyTopics,undefined,"old homepage titles must be removed");
  assert.ok(friends.textStarters.topics["photo-story"],"cached old topic links must still work");
 }
 assert.notEqual(JSON.parse(read("web-spa/src/i18n/locales/zh-TW/dailyQuote.json")).q01,en.q01);
 const zh=JSON.parse(read("web-spa/src/i18n/locales/zh-TW/home.json")).dailyQuote;
 assert.equal(zh.fortuneFull,"看完整運勢");
 assert.equal(zh.chatRead,"請 Zoe 解運勢");
 assert.equal(zh.setupChart,"設定我的命盤，每天看專屬運勢");
 assert.equal(zh.setupHint,"填生日和出生時間，完成後每天看專屬運勢");
 for(const lang of langs){
  const copy=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/home.json`)).dailyQuote;
  assert.doesNotMatch(copy.setupChart+" "+copy.setupHint,/\{\{|\}\}|Zoe/i,lang+" no-chat setup");
  assert.ok(copy.setupChart.length>=10&&copy.setupHint.length>=10,lang+" meaningful setup copy");
 }
});

test("SSG placeholder, local midnight + visibility refresh; personalized Zoe CTA and generic fortune setup",()=>{
 const cards=read(root+"DailyTopicCards.tsx");
 const loader=read(root+"quoteCatalog.ts");
 assert.match(cards,/useState<TodayQuote\|null>\(null\)/);
 assert.match(cards,/useEffect\(\(\)=>\{/);
 assert.match(cards,/new Date\(now\.getFullYear\(\),now\.getMonth\(\),now\.getDate\(\)\+1\)/);
 assert.match(cards,/visibilitychange/);
 assert.match(cards,/daily-quote-placeholder/);
 assert.match(cards,/pickDailyQuote\(now\)/);
 assert.match(cards,/fortuneHref=isPersonal\?"\/fortune\?daily=1&chart="/);
 assert.match(cards,/kind="\+personal!/);
 assert.match(cards,/:"\/fortune\/reading\?mode=bazi&from=daily"/);
 assert.doesNotMatch(cards,/chat=text&quote=daily&chart=/);
 assert.match(cards,/to="\/fortune\/reading\?mode=bazi&from=daily" onClick=\{\(\)=>trackUsageEvent\("home_entry_click","fortune"\)\}/);
 assert.match(cards,/t\("dailyQuote.setupChart"\)/);
 assert.match(cards,/!isPersonal&&!needsChartSelection&&<p className="daily-quote-benefit">\{t\("dailyQuote.setupHint"\)\}/);
 assert.match(cards,/className="daily-quote-actions"/);
 assert.doesNotMatch(cards,/chatHref|dailyQuote\.chatRead|&zoe=1|daily-quote-date|<time\b|__self__|dailyProfileLabel/);
 assert.match(cards,/label:dailyProfileName\(chart.hash,/);
 assert.match(cards,/<option key=\{chart.hash\} value=\{chart.hash\}>\{chart.label\}<\/option>/);
 assert.match(cards,/dailyQuote\.basisBazi/);
 assert.match(cards,/dailyQuote\.basisNumerology/);
 assert.doesNotMatch(cards,/t\("dailyQuote.chat"\)/,"no-chart branch must not advertise Zoe");
 assert.doesNotMatch(cards,/chat=text&quote="\+quote!/,"generic daily quote must not link to Zoe on homepage");
 assert.match(cards,/trackUsageEvent\("home_entry_click","fortune"\)/);
 assert.equal((cards.match(/className="daily-quote-card"/g)||[]).length,1);
 assert.match(loader,/import\.meta\.glob\("\.\.\/i18n\/locales\/\*\/dailyQuote\.json"/);
 assert.match(loader,/getDailyQuote\(id\)/);
 assert.doesNotMatch(cards,/fetch\(|window\.location/);
 assert.match(cards,/import\("\.\/personalDailyLine"\)/);
 assert.match(cards,/import \{hasStoredChart\} from "\.\/storedChart"/);
 assert.match(read(root+"storedChart.ts"),/crew_fortune_profile_v2/);
 const mobile=read(root+"MobileHomePage.tsx"),desktop=read(root+"HomePage.tsx");
 assert.doesNotMatch(mobile,/cmh-allowance-slot/);
 assert.ok(mobile.indexOf('<DailyTopicCards variant="mobile"/>')<mobile.indexOf('<section className="cmh-apps"'));
 assert.match(desktop,/className="crew-home-world-inner">\s*<DailyTopicCards variant="desktop"\/>/);
});

test("quote starter is allowlisted, same-language, opt-in and Shorts retains priority",()=>{
 const friend=read("web-spa/src/friends/FriendLiveConversation.tsx");
 const chat=read("web-spa/src/live/TextChatPanel.tsx");
 const starters=read("web-spa/src/live/TextChatStarters.tsx");
 assert.match(friend,/getDailyQuote\(params\.get\("quote"\)\)/);
 assert.match(friend,/!shortsPost&&friend\.id==="zoe"/);
 assert.match(friend,/loadQuoteText\(locale\.language,selectedQuote\.id\)/);
 assert.match(friend,/t\("dailyQuoteStarter",\{quote:quoteText\.text\}\)/);
 assert.match(friend,/starters=\{\[gameRoundStarter\(/);
 assert.match(friend,/<FriendUnifiedComposer live=\{live\}/);
 assert.match(chat,/historyReady&&messages\.length>0&&\(showStarterWithHistory\|\|isGameRoundLink\(\)\)&&firstStarter/);
 assert.match(chat,/firstOnly\/>/);
 assert.match(starters,/!firstOnly&&!starters&&friendStarterTopics\(speaker\)/);
 assert.match(chat,/onPick=\{sentence=>void sendMessage\(sentence\)\}/);
 assert.match(chat,/sessionScope\.startsWith\("friend:"\)/);
 assert.match(friend,/getDailyTopic\(params\.get\("topic"\)\)/);
 assert.match(friend,/params\.get\("quote"\)==="daily"/);
 assert.match(friend,/\^\[a-f0-9\]\{64\}\$/);
 assert.match(read("web-spa/src/friends/useFriendDailyFortuneContext.ts"),/import\("\.\.\/pages\/personalDailyLine"\)/);
 assert.match(friend,/dailyFortuneStarter=dailyFortune\?t\("dailyFortuneStarter"\):undefined/);
 assert.match(friend,/dailyLookupPending/);
 assert.match(friend,/dailyFortune\?"\\n"\+dailyFortune.context/);
 assert.match(friend,/dailyFortune\?"\\n"\+dailyFortune\.context/);
 assert.match(read("web-spa/src/friends/useFriendDailyFortuneContext.ts"),/Promise.all\(\[import\("..\/pages\/personalDailyLine"\),import\("..\/pages\/dailyFortuneReader"\)\]\)/);
 assert.doesNotMatch(friend,/personalQuoteStarter/);
 assert.doesNotMatch(friend,/setDraft\(dailyQuoteStarter\)|sendMessage\(dailyQuoteStarter\)/);
});

test("frosted responsive styling, 44px taps, focus and reduced motion",()=>{
 const css=read(root+"dailyTopicCards.css");
 for(const required of ["--crew-frost-bg","--crew-frost-border","--crew-frost-blur","--crew-frost-bg-fallback","-webkit-backdrop-filter:","backdrop-filter:","@supports not (backdrop-filter:",":focus-visible",":active","prefers-reduced-motion:reduce","min-height:44px","daily-quote--desktop","daily-quote--mobile","grid-template-columns:minmax(0,1fr)"])
  assert.ok(css.includes(required),required);
 assert.doesNotMatch(css,/grid-template-columns:repeat\(3/);
 for(const [,size] of css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g))assert.ok(Number(size)>=12,"under 12px font "+size);
 const resumeCss=read("web-spa/src/live/quoteTextStarter.css");
 assert.match(resumeCss,/\.friend-text-stage \.crew-quote-resume-starters\{order:2/);
 assert.match(resumeCss,/min-height:44px/);
});

function loadPureTs(file,names,dependencies={}){
 const src=stripTypeScriptTypes(read(file),{mode:"strip"})
  .replace(/^import[^\n]*;\s*$/gm,"").replace(/^export\s+/gm,"");
 return Function(...Object.keys(dependencies),src+"\nreturn {"+names.join(",")+"};")(...Object.values(dependencies));
}

test("saved profile selection deduplicates all three sources, self/default/override and rejects unknown hashes",()=>{
 const {dailyProfileHash}=loadPureTs("web-spa/src/fortune/dailyCard.ts",["dailyProfileHash"]);
 const helper=loadPureTs("web-spa/src/fortune/dailyProfileSelection.ts",
  ["readDailyProfiles","chooseDailyProfile","readDailyPreference","saveDailyProfileChoice","dailyProfileLabel","HOME_DAILY_CHART_KEY"],{dailyProfileHash});
 const memory=new Map();
 const before=global.localStorage;
 global.localStorage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,String(value))};
 try{
  const a={birthDate:"1985-07-06",birthTime:"04:10",gender:"1"};
  const b={birthDate:"1995-01-20",birthTime:"08:40",gender:"2"};
  const c={birthDate:"1999-02-12",birthTime:"",gender:"1"};
  const ah=dailyProfileHash(a),bh=dailyProfileHash(b),ch=dailyProfileHash(c);
  memory.set("crew_fortune_profile_v2",JSON.stringify(a));
  memory.set("crew_fortune_presets_v1",JSON.stringify([
   {mode:"vedic",profile:b,updatedAt:"2026-11-12T18:00:00Z"},
   {mode:"bazi",profile:a,updatedAt:"2026-11-12T17:00:00Z"}]));
  memory.set("crew_fortune_readings_v2",JSON.stringify([{mode:"tarot",profile:c},{mode:"vedic",profile:b}]));
  let charts=helper.readDailyProfiles();
  assert.deepEqual(charts.map(x=>x.hash),[ah,bh,ch]);
  assert.equal(charts[0].mode,"bazi","mode is recovered from duplicate presets for primary");
  assert.equal(helper.chooseDailyProfile(charts).hash,ah,"recent active profile wins initially");
  assert.equal(helper.chooseDailyProfile(charts,"bogus"),undefined);
  assert.equal(helper.chooseDailyProfile(charts,"a".repeat(64)),undefined);
  assert.equal(helper.chooseDailyProfile(charts,bh).hash,bh,"exact local hash is allowed");
  helper.saveDailyProfileChoice(bh,true);
  assert.equal(helper.readDailyPreference().selfHash,bh);
  assert.equal(helper.chooseDailyProfile(charts).hash,bh,"self wins the default");
  helper.saveDailyProfileChoice(ah);
  assert.equal(helper.chooseDailyProfile(charts).hash,ah,"explicit choice persists even with a self mark");
  assert.equal(helper.readDailyPreference().selectedHash,ah);
  assert.ok(helper.dailyProfileLabel(charts[1],"ja","インド占星術").includes("インド占星術"));
  memory.set("crew_fortune_profile_v2","{broken json");
  charts=helper.readDailyProfiles();
  assert.deepEqual(charts.map(x=>x.hash),[bh,ah,ch],"other sources remain usable if primary is corrupt");
  memory.clear();
  memory.set("crew_fortune_readings_v2",JSON.stringify([{profile:c}]));
  assert.equal(helper.chooseDailyProfile(helper.readDailyProfiles()).hash,ch,"history alone is enough");
  memory.set("crew_fortune_profile_v2",JSON.stringify({birthDate:"2026-02-31"}));
  assert.equal(helper.readDailyProfiles().length,1,"invalid dates are ignored");
 }finally{global.localStorage=before;}
});

test("personalized line uses the same fortuneDaily translations, algorithm and optional almanac for all 11 locales",async()=>{
 const daily=loadPureTs("web-spa/src/fortune/dailyCard.ts",["dailyProfileHash","buildDailyCard","localDateKey"]);
 const profile={birthDate:"1985-07-06",birthTime:"04:10",gender:"1"};
 const hash=daily.dailyProfileHash(profile);
 const data={hash,profile,mode:"bazi"};
 const i18n={t:(key,options)=>{
  const bundle=JSON.parse(read(`web-spa/src/i18n/locales/${options.lng}/fortuneDaily.json`));
  const value=key.split(".").reduce((node,part)=>node?.[part],bundle);
  if(typeof value!=="string")throw Error("Missing translation "+key+" "+options.lng);
  return value.replace(/\{\{(\w+)\}\}/g,(_,name)=>String(options[name]??""));
 }};
 const builder=loadPureTs("web-spa/src/pages/personalDailyLine.ts",["personalDailyLine"],{
  i18n,loadUiNamespace:async()=>{},buildDailyCard:daily.buildDailyCard,localDateKey:daily.localDateKey,
  readDailyKindChoice:()=>null,resolveDailyKind:(mode,time,choice)=>choice||(mode==="bazi"&&time?"bazi":"numerology"),
  readCachedDaily:()=>null,readSavedBaziResult:()=>null,DAILY_COPY_REVISION:3,DAILY_SOLAR:{},
  readDailyProfiles:()=>[data],chooseDailyProfile:(charts,wanted)=>charts.find(chart=>chart.hash===wanted)
 });
 for(const language of langs){
  const first=await builder.personalDailyLine(language,"2026-11-12",hash);
  const again=await builder.personalDailyLine(language,"2026-11-12",hash);
  assert.equal(first.text,again.text,language);
  assert.equal(first.kind,"numerology");
  assert.ok(first.text.length>=6&&first.text.length<175,language);
  const tomorrow=await builder.personalDailyLine(language,"2026-11-13",hash);
  assert.notEqual(first.text,tomorrow.text,"daily copy changes " +language);
 }
 const optional=daily.buildDailyCard({kind:"numerology",profile,localDate:"2026-11-12",lang:"zh-TW",
  almanac:"optional",translate:(key)=>key});
 assert.ok(optional.theme,"home must not wait for the Solar global");
 assert.equal(Object.hasOwn(optional,"almanac"),false);
 assert.deepEqual(daily.buildDailyCard({kind:"numerology",profile,localDate:"2026-11-12",lang:"zh-TW",translate:key=>key}),
  {status:"loading",reason:"lunar"},"Fortune's default almanac remains required");
 const home=read(root+"DailyTopicCards.tsx"),fortune=read("web-spa/src/fortune/HomePage.tsx");
 assert.match(home,/fortuneHref=isPersonal\?"\/fortune\?daily=1&chart="/);
 assert.match(fortune,/dailyIntent=searchParams\.get\("daily"\)==="1"/);
 assert.match(fortune,/<FortuneDailyCard chartHash=\{chartHash\}\/>/);
 assert.doesNotMatch(home,/^import.*(dailyCard|FortuneDailyCard|fortuneDaily|dailyAi|ensureFortuneServices)/m);
});

test("personal chart selection remains compact and the exact /en and /ja desktop path uses route locale",()=>{
 const css=read(root+"dailyTopicCards.css"),home=read(root+"DailyTopicCards.tsx");
 assert.match(css,/\.daily-quote-heading\{display:flex/);
 assert.match(css,/\.daily-quote-chart\{[^}]*min-height:44px/);
 assert.match(css,/\.daily-quote--desktop \.daily-quote-chart/);
 assert.match(css,/@media\(max-width:380px\)/);
 assert.match(home,/useTranslation\("home"\)/);
 assert.match(home,/const language=i18n\.language/);
 assert.match(home,/to=\{fortuneHref\}/);
 assert.match(home,/to="\/fortune\/reading\?mode=bazi&from=daily"/);
 const routeI18n=read("web-spa/src/i18n/index.ts");
 assert.match(routeI18n,/resolveInitialUiLocale/);
 assert.match(routeI18n,/normalizeUiLocale/);
 assert.match(routeI18n,/import enHome from/);
 assert.doesNotMatch(home,/isAutomatedLocaleVisitor|preferredPublicLocaleDestination/);
});

test("daily profiles: nickname, remove, restore, explicit self and no wrong-person fallback",()=>{
 const {dailyProfileHash}=loadPureTs("web-spa/src/fortune/dailyCard.ts",["dailyProfileHash"]);
 const h=loadPureTs("web-spa/src/fortune/dailyProfileSelection.ts",["readDailyProfiles","chooseDailyProfile","readDailyPreference","saveDailyProfileChoice","dailyProfileLabel","readDailyChartMeta","saveDailyChartMeta","dailyProfileName"],{dailyProfileHash});
 const memory=new Map(),before=global.localStorage;
 global.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,String(v))};
 try{
  const a={birthDate:"1990-03-04",birthTime:"07:30",gender:"1"},b={birthDate:"2000-03-04",gender:"2"};
  const ah=dailyProfileHash(a),bh=dailyProfileHash(b);
  const readings=JSON.stringify([{profile:a,mode:"bazi"},{profile:b,mode:"tarot"}]);
  memory.set("crew_fortune_readings_v2",readings);
  h.saveDailyProfileChoice(ah,true);
  assert.equal(h.saveDailyChartMeta(ah,{nickname:"  Me  "}),true);
  assert.equal(h.readDailyChartMeta(ah).nickname,"Me");
  assert.equal(h.dailyProfileName(ah,"Myself"),"Me");
  assert.equal(h.dailyProfileName(bh,"Chart 2"),"Chart 2");
  assert.match(h.dailyProfileLabel(h.readDailyProfiles()[0],"en","BaZi"),/^Me ·/);
  assert.equal(h.saveDailyChartMeta("a".repeat(64),{nickname:"bad"}),false);
  memory.set("crew_fortune_profile_v2",JSON.stringify(b));
  assert.equal(h.chooseDailyProfile(h.readDailyProfiles()).hash,ah);
  assert.equal(h.saveDailyChartMeta(ah,{hidden:true}),true);
  assert.equal(h.chooseDailyProfile(h.readDailyProfiles()),undefined,"removed self must not become a relative");
  assert.equal(h.readDailyProfiles(true).length,2);
  assert.equal(memory.get("crew_fortune_readings_v2"),readings);
  h.saveDailyProfileChoice(bh);
  assert.equal(h.chooseDailyProfile(h.readDailyProfiles()).hash,bh);
  h.saveDailyChartMeta(ah,{hidden:false});
  assert.equal(h.readDailyProfiles().length,2);
  assert.equal(h.chooseDailyProfile(h.readDailyProfiles()).hash,bh);
  h.saveDailyProfileChoice(ah,true);
  assert.equal(h.chooseDailyProfile(h.readDailyProfiles()).hash,ah);
 }finally{global.localStorage=before;}
});

test("daily fortune selector floats independently of heading and text uses 4px vertical rhythm",()=>{
 const home=read(root+"DailyTopicCards.tsx"),css=read(root+"dailyTopicCards.css");
 const body=home.slice(home.indexOf('<div className="daily-quote-body">'),home.indexOf('<div className="daily-quote-actions">'));
 assert.ok(body.indexOf('<select className="daily-quote-chart"')<body.indexOf('<div className="daily-quote-heading">'));
 assert.match(css,/\.daily-quote-body\{[^}]*display:flow-root/);
 assert.match(css,/\.daily-quote-chart\{[^}]*float:right;[^}]*min-height:44px/);
 assert.match(css,/\.daily-quote-body > :not\(\.daily-quote-chart\) \+ :not\(\.daily-quote-chart\)\{margin-block-start:4px\}/);
 assert.match(css,/\.daily-quote--mobile \.daily-quote-card\{[^}]*gap:4px/);
 assert.doesNotMatch(css,/\.daily-quote-heading\{[^}]*min-height/);
 assert.match(css,/\.daily-quote-headline\{display:block/);
});
