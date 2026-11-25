const {stripTypeScriptTypes}=require("node:module");
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
const base="web-spa/src/pages/";
const bubble=read(base+"HomeLiveBubble.tsx");
const css=read(base+"homeLiveBubble.css");
const daily=read(base+"DailyTopicCards.tsx");
const helper=read(base+"storedChart.ts");
const mobile=read(base+"MobileHomePage.tsx");
const desktop=read(base+"HomePortal.tsx");
const locales=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];

// Exercise the exact lightweight chart test shared with the existing daily card.
function chartDetected(records){
 const store={getItem:key=>Object.hasOwn(records,key)?records[key]:null};
 return vm.runInNewContext(stripTypeScriptTypes(helper,{mode:"strip"}).replace("export function hasStoredChart()","function hasStoredChart()")+"\nhasStoredChart()",{localStorage:store});
}
test("stored charts use same inexpensive local keys as DailyTopicCards",()=>{
 assert.match(daily,/import \{hasStoredChart\} from "\.\/storedChart"/);
 assert.equal(chartDetected({}),false);
 assert.equal(chartDetected({crew_fortune_profile_v2:JSON.stringify({birthDate:"1990-01-02"})}),true);
 assert.equal(chartDetected({crew_fortune_profile_v2:"{invalid",crew_fortune_presets_v1:JSON.stringify([{profile:{birthDate:"1991-02-03"}}])}),true);
 assert.equal(chartDetected({crew_fortune_readings_v2:JSON.stringify([{profile:{birthDate:"1988-02-03"}}])}),true);
 assert.equal(chartDetected({crew_fortune_presets_v1:JSON.stringify([{profile:{x:true}}])}),false);
});
test("chart entry and no-chart Shorts entry never impersonate Live attribution",()=>{
 assert.match(bubble,/const target=storedChart\?fortuneHref:"\/teacher\/shorts"/);
 assert.match(bubble,/setFortuneHref\("\/fortune\?daily=1"\)/);
 assert.match(bubble,/import\("\.\/personalDailyLine"\)/);
 assert.match(bubble,/personalDailyLine\(i18n\.language\)/);
 assert.match(bubble,/"\/fortune\?daily=1&chart="\+line\.hash\+"&kind="\+line\.kind/);
 assert.match(bubble,/\[a-f0-9\]\{64\}/);
 assert.match(bubble,/trackUsageEvent\("home_entry_click",storedChart\?"fortune":"shorts"\)/);
 assert.doesNotMatch(bubble,/home_live_bubble_(?:view|click)|useGuestTrialQuota|geminiKey|entry=bubble|\/friend\/live|\/account#settings-gemini/);
 assert.match(bubble,/if\(!ready\|\|!portalHost\|\|!chartResolved\)return null/);
 assert.match(bubble,/aria-label=\{label\}/);
});
test("no floating shortcut on phones or cramped 768–1099 frame; desktop stays outside content",()=>{
 assert.match(css,/@media\(max-width:767px\)\{\.crew-home-live-bubble\{display:none!important\}\}/);
 assert.match(css,/@media\(min-width:768px\) and \(max-width:1099px\)\{\.crew-home-live-bubble\{display:none\}\}/);
 assert.match(read(base+"homeDesktopLayout.css"),/right:max\(8px,calc\(\(100vw - var\(--crew-desktop-home-frame\)\) \/ 2 - 86px\)\)/);
 assert.match(css,/body:has\(\.crew-update-notice\) \.crew-home-live-bubble\{display:none\}/);
 assert.match(css,/min-height:76px/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/font-size:12px/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/white-space:normal/);
});
test("eleven localized hero/title/quick-entry strings; keep returning-friend path",()=>{
 assert.doesNotMatch(mobile,/copy\("一起聊聊吧！","Let's chat!"\)/);
 assert.match(mobile,/friendResume\?t\("layout2.resumeTitle",\{name:resumeFriend!\.name\}\):t\("mobileHero.title"\)/);
 assert.match(mobile,/t\(friendResume\?"chatChoices.returnPrompt":"chatChoices.prompt"\)/);
 assert.match(desktop,/t\("layout2.title",\{name:friendName\}\)/);
 for(const locale of locales){
  const home=JSON.parse(read(`web-spa/src/i18n/locales/${locale}/home.json`));
  for(const key of ["prompt","returnPrompt","funny","casual","resume","fresh","about"])assert.ok(home.chatChoices[key]?.trim(),locale+key);
  assert.match(home.chatChoices.about,/\{\{topic\}\}/,locale);
  for(const key of ["title","subtitle"])assert.ok(typeof home.mobileHero[key]==="string"&&home.mobileHero[key].trim(),locale+key);
  for(const key of ["heading","fortune","shorts"])assert.ok(typeof home.quickEntry[key]==="string"&&home.quickEntry[key].trim(),locale+key);
  assert.match(home.layout2.title,/\{\{name\}\}/,locale);
  assert.ok(home.layout2.title.length<70,locale+" desktop title too long");
  assert.ok(home.mobileHero.title.length<27,locale+" mobile title too long");
 }
});

test("homepage has one chat action and suggestions are optional inside text chat",()=>{
 const desktopHome=read(base+"DesktopHomePage.tsx");
 const mobileHero=mobile.slice(mobile.indexOf('cmh-slide cmh-zoe'),mobile.indexOf('cmh-slide cmh-slide-friends'));
 const desktopHero=desktopHome.slice(desktopHome.indexOf('className="kdh-zoe-content"'),desktopHome.indexOf('className="kdh-zoe-visual"'));
 for(const hero of [mobileHero,desktopHero]) {
  assert.equal((hero.match(/<Link /g)||[]).length,1);
  assert.doesNotMatch(hero,/HomeChatChoices|home-chat-choices/);
 }
 const conversation=read("web-spa/src/friends/FriendLiveConversation.tsx");
 const composer=read("web-spa/src/friends/FriendUnifiedComposer.tsx");
 assert.match(conversation,/showHomeStarters=fromHome&&!live\.micEnabled&&\(textFirst\|\|active\)&&live\.turns\.length===0/);
 assert.match(conversation,/\.\.\.homeStarters\]\.filter/);
 assert.match(composer,/quick\.map\(value=>.*onClick=\{\(\)=>void send\(value\)\}/);
});
