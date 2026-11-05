const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
test("home surprise is floating instead of adding a content block",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx"),gift=read("web-spa/src/pages/HomeMysteryGift.tsx"),css=read("web-spa/src/pages/homeMysteryGift.css");
 assert.match(home,/import \{HomeMysteryGift\} from "\.\/HomeMysteryGift"/);
 assert.match(home,/<HomeMysteryGift\/>/);
 assert.match(css,/\.crew-mystery-gift\{position:fixed/);
 assert.match(css,/var\(--nav-h,68px\) \+ env\(safe-area-inset-bottom/);
 assert.match(css,/body:has\(\.crew-update-notice\) \.crew-mystery-gift:not\(:has\(\.crew-gift-panel\)\)\{display:none\}/);
 assert.match(css,/\.crew-mystery-gift:has\(\.crew-gift-panel\)\{z-index:90\}/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(gift,/role="dialog"/);
 // The app shell has a persistent transform animation; fixed children must portal to body.
 assert.match(gift,/createPortal\(/);
 assert.match(gift,/setPortalHost\(document\.body\)/);
 assert.match(gift,/portalHost\?createPortal\(/);
 assert.match(gift,/minimizedRef/);
 assert.match(gift,/className="crew-gift-world-portrait"/);
 assert.match(gift,/document\.body\.style\.overflow="hidden"/);
 assert.match(gift,/event.key==="Escape"/);
 assert.match(gift,/\.filter\(item=>item.id!==previous\)/);
 for(const dest of ["/friend/live?id=zoe","/games/1a2b","/games/reversi","/souls","/teacher/course/travel"])assert.ok(gift.includes(dest));
});
test("all home catalogs and analytics have gift funnel keys",()=>{
 for(const lang of ["zh-TW","en","ja","es","pt-BR","id","ko","fr","de","vi","th"]){
  const home=JSON.parse(read("web-spa/src/i18n/locales/"+lang+"/home.json"));
  for(const key of ["title","teaser","open","reopen","reveal","start","again","close","minimize","restore","friendDescription","playDescription","soulsDescription","learnDescription"])assert.ok(home.gift?.[key],lang+" gift."+key);
 }
 for(const file of ["web-spa/src/analytics/usage.ts","functions/api/usage/event.ts","web-spa/src/analytics/UsageDashboardPage.tsx"]){
  const source=read(file);
  for(const event of ["home_gift_view","home_gift_open","home_gift_result","home_gift_go","home_gift_minimize"])assert.ok(source.includes(event),file+" missing "+event);
 }
 assert.match(read("web-spa/src/pages/HomeMysteryGift.tsx"),/trackUsageEvent\("home_entry_click",gift.kind\)/);
 assert.match(read("web-spa/src/analytics/usage.ts"),/event\.startsWith\("home_gift_"\)\?300:2000/);
});


test("mystery gift opens a destination portal without adding navigation layers",()=>{
 const gift=read("web-spa/src/pages/HomeMysteryGift.tsx");
 const css=read("web-spa/src/pages/homeMysteryGift.css");
 assert.match(gift,/function GiftBoxArt\(/);
 assert.match(gift,/function GiftWorld\(/);
 assert.match(gift,/crew-gift-world-\"\+gift\.kind/);
 assert.doesNotMatch(gift,/CrewDotArt|crew-gift-dot-present|crew-gift-world-guide/);
 assert.match(gift,/crew-gift-world-portrait/);
 assert.match(gift,/<GiftWorld gift=\{gift\}\/>/);
 assert.match(gift,/to=\{gift\.to\}/);
 assert.match(gift,/onClick=\{unwrap\}/);
 assert.match(gift,/trackUsageEvent\("home_gift_go",gift\.kind\)/);
 for(const kind of ["friend","play","souls","learn"]){
  assert.match(gift,new RegExp('gift.kind==="'+kind+'"'));
  assert.match(css,new RegExp('\\.crew-gift-world-'+kind));
 }
 assert.match(css,/\.crew-gift-minimized\{[^}]*width:44px;height:44px/);
 assert.match(css,/@media\(max-width:359px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.crew-gift-opening-box\{display:none\}/);
 assert.match(css,/@keyframes crew-gift-box-to-portal/);
});

test("the gift FAB attracts attention without adding a mascot or blocking the bottom nav",()=>{
 const gift=read("web-spa/src/pages/HomeMysteryGift.tsx"),css=read("web-spa/src/pages/homeMysteryGift.css");
 assert.equal((gift.match(/<GiftBoxArt\/>/g)||[]).length,2,"gift box is shown in normal and minimized triggers");
 assert.equal((gift.match(/<GiftBoxArt opened\/>/g)||[]).length,1,"opening art remains in the reveal transition");
 assert.doesNotMatch(gift,/CrewDotArt/);
 assert.match(css,/\.crew-gift-fab::before\{[^}]*animation:crew-gift-invite-glow/);
 assert.match(css,/\.crew-gift-fab::after\{[^}]*animation:crew-gift-invite-star/);
 assert.match(css,/\.crew-gift-fab \.crew-gift-art\{[^}]*animation:crew-gift-invite-wiggle/);
 assert.match(css,/\.crew-gift-minimized\{[^}]*width:44px;height:44px/);
 assert.match(css,/\.crew-gift-fab::before,\.crew-gift-fab::after,\.crew-gift-fab \.crew-gift-art,[^}]*animation:none!important/);
 assert.match(css,/body:has\(\.crew-update-notice\) \.crew-mystery-gift:not\(:has\(\.crew-gift-panel\)\)\{display:none\}/);
});
test("friend scene reserves space and portrait sits right, never on the CTA",()=>{
 const gift=read("web-spa/src/pages/HomeMysteryGift.tsx"),css=read("web-spa/src/pages/homeMysteryGift.css");
 assert.match(gift,/className=\{"crew-gift-world crew-gift-world-"\+gift\.kind\}/);
 assert.match(gift,/className="crew-gift-world-portrait" src=\{gift\.portrait\}/);
 assert.doesNotMatch(gift,/className="crew-gift-world-friend" src=/);
 assert.match(css,/\.crew-gift-world\{[^}]*position:relative;[^}]*overflow:hidden;contain:paint/);
 assert.match(css,/\.crew-gift-world-portrait\{[^}]*right:14px;left:auto;bottom:10px/);
 assert.match(css,/\.crew-gift-world-game,\.crew-gift-world-soul,\.crew-gift-world-book\{[^}]*left:50%;right:auto/);
 assert.doesNotMatch(css,/\.crew-gift-world-friend,\.crew-gift-world-game/);
 assert.match(css,/\.crew-gift-panel \.crew-gift-world\{flex:none;min-height:0\}/);
 assert.match(css,/\.crew-gift-panel \.crew-gift-visit\{position:relative;z-index:1\}/);
 assert.match(css,/@media\(max-width:359px\)\{\.crew-gift-world\{height:136px\}\.crew-gift-world-portrait\{/);
 assert.match(css,/\.crew-gift-opening-box\{display:none\}/);
});
