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
  assert.deepEqual(Object.keys(home.dailyQuote).sort(),["chat","fortune","title"]);
  for(const key of ["title","fortune","chat"])assert.ok(home.dailyQuote[key]?.trim(),lang+" "+key);
  assert.ok(friends.dailyQuoteStarter?.trim(),lang);
  assert.deepEqual(friends.dailyQuoteStarter.match(/\{\{[^}]+\}\}/g),["{{quote}}"]);
  assert.equal(home.dailyTopics,undefined,"old homepage titles must be removed");
  assert.ok(friends.textStarters.topics["photo-story"],"cached old topic links must still work");
 }
 assert.notEqual(JSON.parse(read("web-spa/src/i18n/locales/zh-TW/dailyQuote.json")).q01,en.q01);
});

test("SSG placeholder, local midnight + visibility refresh; one card and both tracked links",()=>{
 const cards=read(root+"DailyTopicCards.tsx");
 const loader=read(root+"quoteCatalog.ts");
 assert.match(cards,/useState<TodayQuote\|null>\(null\)/);
 assert.match(cards,/useEffect\(\(\)=>\{/);
 assert.match(cards,/new Date\(now\.getFullYear\(\),now\.getMonth\(\),now\.getDate\(\)\+1\)/);
 assert.match(cards,/visibilitychange/);
 assert.match(cards,/daily-quote-placeholder/);
 assert.match(cards,/pickDailyQuote\(now\)/);
 assert.match(cards,/to="\/fortune"/);
 assert.match(cards,/chat=text&quote=/);
 assert.match(cards,/trackUsageEvent\("home_entry_click","fortune"\)/);
 assert.match(cards,/trackUsageEvent\("home_entry_click","friend"\)/);
 assert.equal((cards.match(/className="daily-quote-card"/g)||[]).length,1);
 assert.match(loader,/import\.meta\.glob\("\.\.\/i18n\/locales\/\*\/dailyQuote\.json"/);
 assert.match(loader,/getDailyQuote\(id\)/);
 assert.doesNotMatch(cards,/fetch\(|localStorage|window\.location/);
 const mobile=read(root+"MobileHomePage.tsx"),desktop=read(root+"HomePage.tsx");
 assert.ok(mobile.indexOf('<DailyTopicCards variant="mobile"/>')>mobile.indexOf('className="cmh-allowance-slot"'));
 assert.ok(mobile.indexOf('<DailyTopicCards variant="mobile"/>')<mobile.indexOf('<section className="cmh-apps"'));
 assert.match(desktop,/className="crew-home-world-inner">\s*<DailyTopicCards variant="desktop"\/>/);
});

test("quote starter is allowlisted, same-language, opt-in and Shorts retains priority",()=>{
 const friend=read("web-spa/src/friends/FriendLivePage.tsx");
 const chat=read("web-spa/src/live/TextChatPanel.tsx");
 const starters=read("web-spa/src/live/TextChatStarters.tsx");
 assert.match(friend,/getDailyQuote\(params\.get\("quote"\)\)/);
 assert.match(friend,/!shortsPost&&friend\.id==="zoe"/);
 assert.match(friend,/loadQuoteText\(locale\.language,selectedQuote\.id\)/);
 assert.match(friend,/t\("dailyQuoteStarter",\{quote:quoteText\.text\}\)/);
 assert.match(friend,/firstStarter=\{selectedQuestion\|\|\(shortsHook\?shortsHookLabel\(shortsHook,english\):undefined\)\|\|dailyQuoteStarter\|\|dailyTopicStarter\}/);
 assert.match(friend,/showStarterWithHistory=\{Boolean\(dailyQuoteStarter\)\}/);
 assert.match(chat,/historyReady&&messages\.length>0&&showStarterWithHistory&&firstStarter/);
 assert.match(chat,/firstOnly\/>/);
 assert.match(starters,/!firstOnly&&\(\["cafe","intro","smalltalk"\]/);
 assert.match(chat,/onPick=\{sentence=>void sendMessage\(sentence\)\}/);
 assert.match(chat,/sessionScope\.startsWith\("friend:"\)/);
 assert.match(friend,/getDailyTopic\(params\.get\("topic"\)\)/);
 assert.doesNotMatch(friend,/setDraft\(dailyQuoteStarter\)|sendMessage\(dailyQuoteStarter\)/);
});

test("frosted responsive styling, 44px taps, focus and reduced motion",()=>{
 const css=read(root+"dailyTopicCards.css");
 for(const required of ["--crew-frost-bg","--crew-frost-border","--crew-frost-blur","--crew-frost-bg-fallback","-webkit-backdrop-filter:","backdrop-filter:","@supports not (backdrop-filter:",":focus-visible",":active","prefers-reduced-motion:reduce","min-height:44px","daily-quote--desktop","daily-quote--mobile","grid-template-columns:repeat(2,minmax(0,1fr))"])
  assert.ok(css.includes(required),required);
 assert.doesNotMatch(css,/grid-template-columns:repeat\(3/);
 for(const [,size] of css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g))assert.ok(Number(size)>=12,"under 12px font "+size);
 const resumeCss=read("web-spa/src/live/quoteTextStarter.css");
 assert.match(resumeCss,/\.friend-text-stage \.crew-quote-resume-starters\{order:2/);
 assert.match(resumeCss,/min-height:44px/);
});
