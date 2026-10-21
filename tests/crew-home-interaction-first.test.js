const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");

test("Home World begins with working four-mode portal, Shorts, then free games and Key setup",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx");
 const portal=read("web-spa/src/pages/HomePortal.tsx");
 const hero=home.indexOf("<HomePortal/>"),shorts=home.indexOf("<HomeShortsPreview/>");
 const games=home.indexOf('className="crew-home-game-pick"');
 const setup=home.indexOf("{ready&&!configured?");
 assert.ok(hero>=0&&hero<shorts&&shorts<games&&games<setup);
 for(const path of ["/teacher/roles?mode=friends","/games","/teacher","/story"])assert.ok(portal.includes('to:"'+path+'"'),path);
 assert.match(home,/to="\/games\/1a2b"/);
 assert.match(home,/import \{HomeShortsPreview\} from "\.\.\/teacher\/HomeShortsPreview"/);
});

test("Home preserves four products, particle portal, Timeline, briefing and Play Store entry",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx"),portal=read("web-spa/src/pages/HomePortal.tsx");
 for(const product of ["teacher","story","fortune","play"])assert.match(home,new RegExp("crew-home-product crew-home-"+product));
 assert.match(portal,/<PortalParticleField mode=\{mode\}/);
 assert.match(home,/<BriefingPreview\/>/);
 assert.match(home,/crew-home-world-explore-card/);
 assert.match(home,/to="\/timeline"/);
 assert.doesNotMatch(home,/assets\/timeline\/mira-/);
 assert.ok(home.indexOf("<BriefingPreview/>")>home.indexOf("<HomeShortsPreview/>"));
 assert.match(home,/<details className="crew-home-android" open>/);
});

test("Recent game and friend navigation is recorded without message content",()=>{
 const app=read("web-spa/src/App.tsx"),home=read("web-spa/src/pages/HomePage.tsx");
 assert.match(app,/crew_home_last_activity_v1/);
 assert.match(app,/new URLSearchParams\(search\)\.get\("id"\)/);
 assert.match(home,/GAME_NAMES/);
 assert.match(home,/crew_home_last_activity_v1/);
 assert.match(home,/games start a new round/);
 assert.doesNotMatch(app,/localStorage\.setItem\("crew_home_last_activity_v1"[^\n]*(transcript|messages|turns)/i);
});

test("Interaction-first homepage copy is translated",()=>{
 const en=JSON.parse(read("web-spa/src/i18n/locales/en/home.json"));
 const zh=JSON.parse(read("web-spa/src/i18n/locales/zh-TW/home.json"));
 for(const locale of [en,zh]){
  for(const key of ["label","chat","chatDesc","play","playDesc"])assert.ok(locale.actions[key]);
  for(const mode of ["chat","play","learn","story"])assert.ok(locale.portal.modes[mode].label&&locale.portal.modes[mode].hint);
  assert.ok(locale.portal.headingLead&&locale.portal.headingAccent);
  for(const key of ["label","title","desc","cta"])assert.ok(locale.gamePick[key]);
  for(const key of ["play","friend","friendDesc"])assert.ok(locale.recent[key]);
 }
});

