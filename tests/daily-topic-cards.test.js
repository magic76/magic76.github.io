const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
async function model(){
 const src=stripTypeScriptTypes(read("web-spa/src/pages/dailyTopics.ts"),{mode:"strip"});
 return import("data:text/javascript;charset=utf-8,"+encodeURIComponent(src));
}
const langs=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];
const topicsPath="web-spa/src/pages/";

test("12 allowlisted topics cover all six categories with unique URL-safe IDs and known icons",async()=>{
 const {DAILY_TOPICS,getDailyTopic}=await model();
 assert.ok(DAILY_TOPICS.length>=12);
 assert.deepEqual(new Set(DAILY_TOPICS.map(x=>x.category)),new Set(["shorts","question","roleplay","mood","play","fortune"]));
 assert.equal(new Set(DAILY_TOPICS.map(x=>x.id)).size,DAILY_TOPICS.length);
 const icons=new Set(["home","teacher","story","fortune","play","settings","chat","book","cards","scene","mic","sparkles","plus","history","image"]);
 for(const topic of DAILY_TOPICS){
  assert.match(topic.id,/^[a-z0-9-]+$/);
  assert.ok(icons.has(topic.icon),topic.icon);
  for(const color of [topic.tintA,topic.tintB,topic.ink])assert.match(color,/^#[0-9a-fA-F]{6}$/);
  assert.equal(getDailyTopic(topic.id),topic);
 }
 for(const invalid of ["photo story","../photo-story","<script>","",null,"__proto__","undefined"])
  assert.equal(getDailyTopic(invalid),undefined);
});

test("calendar-local picks stay deterministic, vary daily, and cover the full pool",async()=>{
 const {pickDailyTopics}=await model();
 const days=Array.from({length:14},(_,i)=>new Date(2026,10,12+i,12,0));
 const picks=days.map(d=>pickDailyTopics(d));
 for(let i=0;i<days.length;i++){
  const ids=picks[i].map(topic=>topic.id);
  assert.equal(ids.length,3);assert.equal(new Set(ids).size,3);
  assert.equal(new Set(picks[i].map(x=>x.category)).size,3);
  assert.deepEqual(pickDailyTopics(new Date(days[i].getFullYear(),days[i].getMonth(),days[i].getDate(),23,59)).map(x=>x.id),ids);
  if(i)assert.notDeepEqual(ids,picks[i-1].map(topic=>topic.id));
 }
 assert.ok(new Set(picks.flat().map(x=>x.id)).size>=10);
});

test("all 11 locales have translated card headings, titles, hooks and English practice sentences",async()=>{
 const {DAILY_TOPICS}=await model();
 const enHome=JSON.parse(read("web-spa/src/i18n/locales/en/home.json"));
 const enFriends=JSON.parse(read("web-spa/src/i18n/locales/en/friends.json"));
 for(const locale of langs){
  const home=JSON.parse(read(`web-spa/src/i18n/locales/${locale}/home.json`));
  const friends=JSON.parse(read(`web-spa/src/i18n/locales/${locale}/friends.json`));
  assert.deepEqual(Object.keys(home.dailyTopics),Object.keys(enHome.dailyTopics));
  assert.deepEqual(Object.keys(home.dailyTopics.items).sort(),Object.keys(enHome.dailyTopics.items).sort());
  assert.deepEqual(Object.keys(friends.textStarters.topics).sort(),Object.keys(enFriends.textStarters.topics).sort());
  for(const key of ["title","note"])assert.ok(typeof home.dailyTopics[key]==="string"&&home.dailyTopics[key].trim(),locale+" "+key);
  for(const topic of DAILY_TOPICS){
   for(const key of ["title","hook"]){
    const value=home.dailyTopics.items[topic.id]?.[key];
    assert.ok(typeof value==="string"&&value.trim(),locale+" "+topic.id+" "+key);
    assert.deepEqual(Object.keys(home.dailyTopics.items[topic.id]),Object.keys(enHome.dailyTopics.items[topic.id]));
   }
   const starter=friends.textStarters.topics[topic.id];
   assert.ok(typeof starter==="string"&&starter.trim());
   assert.deepEqual(starter.match(/\{\{[^}]+\}\}/g),["{{name}}"]);
   assert.equal(starter,enFriends.textStarters.topics[topic.id],"use existing learner-English starter convention");
  }
 }
 assert.notEqual(JSON.parse(read("web-spa/src/i18n/locales/zh-TW/home.json")).dailyTopics.title,enHome.dailyTopics.title);
});

test("SSR placeholders, client-local midnight refresh and no extra user steps",()=>{
 const cards=read(topicsPath+"DailyTopicCards.tsx");
 assert.match(cards,/useEffect\(\(\)=>\{/);
 assert.match(cards,/useState<DailyTopic\[\]>\(\[\]\)/);
 assert.match(cards,/new Date\(now\.getFullYear\(\),now\.getMonth\(\),now\.getDate\(\)\+1\)/);
 assert.match(cards,/visibilitychange/);
 assert.match(cards,/daily-topic-placeholder/);
 assert.match(cards,/topics\.length===3\?topics\.map/);
 assert.match(cards,/<Link key=\{topic\.id\}/);
 assert.match(cards,/chat=text&topic=/);
 assert.match(cards,/trackUsageEvent\("home_entry_click","friend"\)/);
 assert.doesNotMatch(cards,/localStorage|fetch\(|<button|<input|window\.location/);
 const mobile=read(topicsPath+"MobileHomePage.tsx");
 const desktop=read(topicsPath+"HomePage.tsx");
 assert.ok(mobile.indexOf('<DailyTopicCards variant="mobile"/>')<mobile.indexOf('<section className="cmh-apps"'));
 assert.ok(mobile.indexOf('<DailyTopicCards variant="mobile"/>')>mobile.indexOf('className="cmh-allowance-slot"'));
 assert.match(desktop,/className="crew-home-world-inner">\s*<DailyTopicCards variant="desktop"\/>/);
});

test("topic allowlist never passes free text, unknown leaves firstStarter undefined; Shorts priority and session intact",()=>{
 const friend=read("web-spa/src/friends/FriendLivePage.tsx");
 assert.match(friend,/getDailyTopic\(params\.get\("topic"\)\)/);
 assert.match(friend,/!shortsPost&&friend\.id==="zoe"/);
 assert.match(friend,/dailyTopic\?t\("textStarters\.topics\."\+dailyTopic\.id,\{name:friend\.name\}\):undefined/);
 assert.match(friend,/firstStarter=\{selectedQuestion\|\|\(shortsHook\?shortsHookLabel\(shortsHook,english\):undefined\)\|\|dailyTopicStarter\}/);
 assert.match(friend,/sessionScope=\{"friend:"\+friend\.id\+\(shortsPost\?":"\+shortsPost\.id:""\)\}/);
 assert.doesNotMatch(read(topicsPath+"dailyTopics.ts"),/decodeURIComponent|location\.search|eval\(/);
});

test("mobile and desktop frost, CSS accessibility and layout guards",()=>{
 const css=read(topicsPath+"dailyTopicCards.css");
 assert.match(css,/-webkit-backdrop-filter:/);
 assert.match(css,/backdrop-filter:/);
 assert.match(css,/@supports not \(backdrop-filter:/);
 assert.match(css,/--crew-frost-bg-fallback/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/:active/);
 assert.match(css,/repeat\(3,minmax\(0,1fr\)\)/);
 assert.doesNotMatch(css,/min-height:184px|min-height:120px/);
 assert.match(css,/min-height:var\(--daily-topic-min-height,160px\)/);
 assert.match(css,/html:lang\(zh\)[^\n]*--daily-topic-min-height:108px/);
 assert.match(css,/html:lang\(ja\)[^\n]*--daily-topic-min-height:124px/);
 assert.match(css,/html:lang\(en\)[^\n]*--daily-topic-min-height:142px/);
 assert.match(css,/\.daily-topics--desktop \.daily-topic-card\{min-height:80px/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 for(const match of css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g))assert.ok(Number(match[1])>=12);
});
