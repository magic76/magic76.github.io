const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const bubble=read("web-spa/src/pages/HomeLiveBubble.tsx"),css=read("web-spa/src/pages/homeLiveBubble.css");
test("home corner is a chart-aware content entry, not a Live/microphone prompt",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx");
 assert.match(home,/import \{HomeLiveBubble\} from "\.\/HomeLiveBubble"/);
 assert.match(home,/<HomeLiveBubble\/>/);
 assert.doesNotMatch(home,/HomeMysteryGift/);
 assert.match(bubble,/createPortal\(/);
 assert.match(bubble,/setPortalHost\(document\.body\)/);
 assert.match(bubble,/className="crew-live-bubble-trigger"/);
 assert.match(bubble,/hasStoredChart\(\)/);
 assert.match(bubble,/"\/teacher\/shorts"/);
 assert.match(bubble,/"\/fortune\?daily=1"/);
 for(const forbidden of [/ZOE_LIVE/,/entry=bubble/,/useGuestTrialQuota/,/geminiKey/,/microphone/,/home_live_bubble_(?:view|click)/,/warmLive/,/zoePortrait/])assert.doesNotMatch(bubble,forbidden);
});
test("SSG and chart deep link remain safe, with lazy daily logic",()=>{
 assert.match(bubble,/if\(!ready\|\|!portalHost\|\|!chartResolved\)return null/);
 assert.match(bubble,/useClientReady\(\)/);
 assert.match(bubble,/import\("\.\/personalDailyLine"\)/);
 assert.match(bubble,/personalDailyLine\(i18n\.language\)/);
 assert.match(bubble,/\/\^\[a-f0-9\]\{64\}\$\//);
 assert.match(bubble,/"\/fortune\?daily=1&chart="\+line\.hash\+"&kind="\+line\.kind/);
 assert.match(bubble,/\.catch\(\(\)=>\{/);
 assert.match(bubble,/"storage"/);
 assert.match(read("web-spa/src/pages/DailyTopicCards.tsx"),/import \{hasStoredChart\} from "\.\/storedChart"/);
 assert.match(read("web-spa/src/pages/storedChart.ts"),/crew_fortune_profile_v2/);
});
test("content entry preserves click analytics, mobile/notice safety and reduced motion",()=>{
 assert.match(bubble,/trackUsageEvent\("home_entry_click",storedChart\?"fortune":"shorts"\)/);
 assert.match(css,/\.crew-home-live-bubble\{position:fixed/);
 assert.match(css,/\.crew-live-bubble-trigger\{pointer-events:auto;[^}]*min-height:76px/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/font-size:12px/);
 assert.match(css,/@media\(max-width:767px\)\{\.crew-home-live-bubble\{display:none!important\}\}/);
 assert.match(css,/@media\(min-width:768px\) and \(max-width:1099px\)/);
 assert.match(css,/body:has\(\.crew-update-notice\) \.crew-home-live-bubble\{display:none\}/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(bubble,/setTimeout\(|IntersectionObserver|home_live_bubble_view/);
 const live=read("web-spa/src/friends/FriendLivePage.tsx");
 for(const name of ["home_live_bubble_connected","home_live_bubble_conversation"]){
  assert.ok(live.includes('trackUsageEvent("'+name+'"'));
  for(const file of ["web-spa/src/analytics/usage.ts","functions/api/usage/event.ts","web-spa/src/analytics/UsageDashboardPage.tsx"])
   assert.ok(read(file).includes(name),file+" missing "+name);
 }
 assert.match(live,/params\.get\("entry"\)==="bubble"/);
});
test("eleven languages have localized accessible labels",()=>{
 for(const lang of ["zh-TW","en","ja","es","pt-BR","id","ko","fr","de","vi","th"]){
  const home=JSON.parse(read("web-spa/src/i18n/locales/"+lang+"/home.json"));
  for(const key of ["heading","fortune","shorts"])
   assert.ok(typeof home.quickEntry?.[key]==="string"&&home.quickEntry[key].trim(),lang+": "+key);
  for(const key of ["title","subtitle"])
   assert.ok(typeof home.mobileHero?.[key]==="string"&&home.mobileHero[key].trim(),lang+": "+key);
 }
});
