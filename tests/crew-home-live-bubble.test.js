const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
test("the home right corner is Zoe Live, not a mystery box",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx");
 const bubble=read("web-spa/src/pages/HomeLiveBubble.tsx");
 const css=read("web-spa/src/pages/homeLiveBubble.css");
 assert.match(home,/import \{HomeLiveBubble\} from "\.\/HomeLiveBubble"/);
 assert.match(home,/<HomeLiveBubble\/>/);
 assert.doesNotMatch(home,/HomeMysteryGift/);
 assert.match(bubble,/\/friend\/live\?id=zoe&from=home&entry=bubble/);
 assert.match(bubble,/createPortal\(/);
 assert.match(bubble,/setPortalHost\(document\.body\)/);
 assert.match(bubble,/portalHost\?createPortal\(/);
 assert.match(bubble,/className="crew-live-bubble-trigger"/);
 assert.match(bubble,/zoePortrait/);
 assert.doesNotMatch(bubble,/GiftBoxArt|drawGift|GIFTS|role="dialog"/);
 assert.match(css,/\.crew-home-live-bubble\{position:fixed/);
 assert.match(css,/var\(--nav-h,68px\) \+ env\(safe-area-inset-bottom/);
 assert.match(css,/min-height:64px/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/body:has\(\.crew-update-notice\) \.crew-home-live-bubble\{display:none\}/);
});
test("only one timed invitation appears after Hero scroll, without blocking clicks",()=>{
 const bubble=read("web-spa/src/pages/HomeLiveBubble.tsx");
 const css=read("web-spa/src/pages/homeLiveBubble.css");
 assert.match(bubble,/querySelector<HTMLElement>\("\.crew-home-portal"\)/);
 assert.match(bubble,/IntersectionObserver/);
 assert.match(bubble,/if\(heroVisible\)\{setShowInvite\(false\);return\}/);
 assert.match(bubble,/if\(invited\.current\)return/);
 assert.match(bubble,/setTimeout\(\(\)=>setShowInvite\(false\),6500\)/);
 assert.match(css,/pointer-events:none/);
 assert.match(css,/\.crew-live-bubble-trigger\{pointer-events:auto/);
 assert.match(bubble,/trial\.remaining===0/);
 assert.match(bubble,/\/account#settings-gemini/);
 assert.match(bubble,/onClick=\{visit\}/);
 assert.match(bubble,/<Icon name=\{needsSetup\?"settings":"mic"\}\/>/);
});
test("Live bubble analytics and attribution are safely allowlisted",()=>{
 const bubble=read("web-spa/src/pages/HomeLiveBubble.tsx");
 const live=read("web-spa/src/friends/FriendLivePage.tsx");
 for(const name of ["home_live_bubble_view","home_live_bubble_click","home_live_bubble_connected","home_live_bubble_conversation"]){
  const source=name.endsWith("view")||name.endsWith("click")?bubble:live;
  assert.ok(source.includes('trackUsageEvent("'+name+'"'),"missing instrumentation: "+name);
  for(const file of ["web-spa/src/analytics/usage.ts","functions/api/usage/event.ts","web-spa/src/analytics/UsageDashboardPage.tsx"]){
   assert.ok(read(file).includes(name),file+" missing "+name);
  }
 }
 assert.match(live,/params\.get\("entry"\)==="bubble"/);
 assert.match(live,/live\.turns\.some\(turn=>Boolean\(turn\.input\?\.trim\(\)&&turn\.output\?\.trim\(\)\)\)/);
 assert.match(bubble,/trackUsageEvent\("home_entry_click",needsSetup\?"settings":"friend"\)/);
});
test("Live bubble copy is available in all 11 supported site languages",()=>{
 for(const lang of ["zh-TW","en","ja","es","pt-BR","id","ko","fr","de","vi","th"]){
  const home=JSON.parse(read("web-spa/src/i18n/locales/"+lang+"/home.json"));
  for(const key of ["invite","start","setup"])assert.ok(home.liveBubble?.[key],lang+" missing "+key);
 }
});
