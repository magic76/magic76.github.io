const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
function dailyModel(){
 const code=stripTypeScriptTypes(read("web-spa/src/pages/dailyReturn.ts"),{mode:"strip"}).replace(/^export /gm,"");
 return Function(code+"\nreturn {DAILY_LAST_VIEW_KEY,localDailyDate,readDailyViewDate,rememberDailyView,hasNewDailyFortune};")();
}

test("#36 last-view is a valid local date, never a completion streak",()=>{
 const previous=global.localStorage,memory=new Map();
 global.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v))};
 try{
  const api=dailyModel();
  assert.equal(api.DAILY_LAST_VIEW_KEY,"crew_fortune_daily_last_seen_v1");
  assert.equal(api.localDailyDate(new Date(2026,10,16,23,59,59)),"2026-11-16");
  assert.equal(api.readDailyViewDate(),null);
  assert.equal(api.hasNewDailyFortune("2026-11-16"),false);
  api.rememberDailyView("2026-11-15");
  assert.equal(api.readDailyViewDate(),"2026-11-15");
  assert.equal(api.hasNewDailyFortune("2026-11-16"),true);
  assert.equal(api.hasNewDailyFortune("2026-11-15"),false);
  assert.equal(api.hasNewDailyFortune("2026-11-14"),false);
  api.rememberDailyView("2026-11-16");
  assert.equal(api.hasNewDailyFortune("2026-11-16"),false);
  for(const bad of ["", "2026-2-04", "2026-02-30", "tomorrow", "2026-13-01", "2026-11-16T01:00:00Z"]){
   memory.set(api.DAILY_LAST_VIEW_KEY,bad);
   assert.equal(api.readDailyViewDate(),null,bad);
   assert.equal(api.hasNewDailyFortune("2026-11-17"),false,bad);
  }
  api.rememberDailyView("2026-02-30");assert.equal(memory.get(api.DAILY_LAST_VIEW_KEY),"2026-11-16T01:00:00Z");
  global.localStorage={getItem(){throw Error("denied")},setItem(){throw Error("denied")}};
  assert.equal(api.readDailyViewDate(),null);assert.doesNotThrow(()=>api.rememberDailyView("2026-11-16"));
  assert.equal(api.hasNewDailyFortune("2026-11-17"),false);
 }finally{global.localStorage=previous;}
});

test("#36 daily card records only a rendered full card; homepage remains SSG-safe and lazy",()=>{
 const card=read("web-spa/src/fortune/FortuneDailyCard.tsx"),home=read("web-spa/src/pages/DailyTopicCards.tsx");
 assert.match(card,/card&&\!\("status" in card\)\)rememberDailyView\(date\)/);
 assert.doesNotMatch(card,/markDailySeen\(date\)/);
 assert.doesNotMatch(home,/daily-quote-updated|daily-quote-action--updated/);
 assert.match(home,/to=\{fortuneHref\}/);
 assert.match(home,/visibilitychange/);
 assert.doesNotMatch(home,/import .*fortune\/(?:dailyCard|dailyStore)|import .*CrewInstallEntry/);
 assert.doesNotMatch(home,/useState\(\(\)=>hasNewDailyFortune/);
 assert.match(card,/searchParams\.get\("zoe"\)!=="1"&&<FortuneReturnTomorrow card=\{full\}/);
 assert.match(read("web-spa/src/fortune/FortuneZoeReading.tsx"),/<FortuneReturnTomorrow card=\{card\}\/\>/);
});

test("#36 sharing uses only the public URL and has PNG, text, clipboard and selection fallbacks",async()=>{
 const share=read("web-spa/src/fortune/shareCard.ts");
 const suffix=share.slice(share.indexOf("/** Only a public landing URL"));
 assert.match(suffix,/https:\/\/www\.3sssi\.com\/fortune\?daily=1/);
 assert.doesNotMatch(suffix,/chart=|birthDate|birthTime|latitude|longitude|profileHash/);
 assert.match(suffix,/buildDailyShareFile\(card,labels\)/);
 assert.match(suffix,/navigator\.clipboard\?\.writeText/);
 assert.match(suffix,/field\.select\(\)/);
 assert.match(suffix,/document\.execCommand\("copy"\)/);
 assert.match(suffix,/AbortError/);
 const code=stripTypeScriptTypes(suffix,{mode:"strip"}).replace(/^export /gm,"");
 const get=Function("buildDailyShareFile",code+"\nreturn {shareDailyReturn,DAILY_PUBLIC_SHARE_URL};");
 const fakeCard={headline:"Nice day",theme:"Take one step"},calls=[];
 const oldNavigator=global.navigator,oldDocument=global.document;
 try{
  Object.defineProperty(global,"navigator",{configurable:true,value:{share:async p=>calls.push(p),canShare:()=>true}});
  const api=get(async()=>({name:"card.png"}));
  assert.equal(await api.shareDailyReturn(fakeCard,{}),"shared");
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,api.DAILY_PUBLIC_SHARE_URL);
  assert.equal(calls[0].files[0].name,"card.png");
  calls.length=0;
  Object.defineProperty(global,"navigator",{configurable:true,value:{canShare:()=>false,share:async p=>calls.push(p)}});
  assert.equal(await api.shareDailyReturn(fakeCard,{}),"shared");
  assert.equal(calls[0].url,api.DAILY_PUBLIC_SHARE_URL);
  assert.equal(calls[0].files,undefined);
  let copied="";
  Object.defineProperty(global,"navigator",{configurable:true,value:{clipboard:{writeText:async x=>{copied=x}}}});
  assert.equal(await api.shareDailyReturn(fakeCard,{}),"copied");
  assert.equal(copied,api.DAILY_PUBLIC_SHARE_URL);
  let selection=false;
  Object.defineProperty(global,"navigator",{configurable:true,value:{clipboard:{writeText:async()=>{throw Error("blocked")}}}});
  global.document={body:{appendChild(){}},createElement:()=>({style:{},setAttribute(){},select(){selection=true},remove(){}}),execCommand:()=>true};
  assert.equal(await api.shareDailyReturn(fakeCard,{}),"copied");assert.equal(selection,true);
  Object.defineProperty(global,"navigator",{configurable:true,value:{share:async()=>{const err=new Error("dismissed");err.name="AbortError";throw err}}});
  assert.equal(await api.shareDailyReturn(fakeCard,{}),"cancelled");
 }finally{Object.defineProperty(global,"navigator",{configurable:true,value:oldNavigator});global.document=oldDocument;}
});

test("#36 11 language catalogs have short strings and the home change is one key",()=>{
 const locales=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];
 for(const locale of locales){
  const daily=JSON.parse(read(`web-spa/src/i18n/locales/${locale}/fortuneDaily.json`));
  const home=JSON.parse(read(`web-spa/src/i18n/locales/${locale}/home.json`));
  for(const key of ["title","share","installed","copied","failed"])assert.ok(typeof daily.returnTomorrow[key]==="string"&&daily.returnTomorrow[key].trim(),locale+":"+key);
  assert.equal(Object.keys(daily.returnTomorrow).length,5);
  assert.ok(typeof home.dailyQuote.updated==="string"&&home.dailyQuote.updated.trim(),locale);
 }
});
