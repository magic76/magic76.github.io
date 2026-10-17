const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");

test("Homepage introduces a direct path to friends and free offline games before setup",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx");
 const actions=home.indexOf('className="crew-home-quick-actions"');
 const setup=home.indexOf('{ready&&!configured?');
 const games=home.indexOf('className="crew-home-game-pick"');
 const shorts=home.indexOf('<HomeShortsPreview/>');
 assert.ok(actions>=0&&actions<games&&games<shorts&&shorts<setup);
 assert.match(home,/to="\/teacher\/roles\?mode=friends"/);
 assert.match(home,/to="\/games"/);
 assert.match(home,/to="\/games\/1a2b"/);
 assert.match(home,/import \{HomeShortsPreview\} from "\.\.\/teacher\/HomeShortsPreview"/);
});

test("Home keeps original four gateways, animation, briefing and app entry",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx");
 for(const product of ["teacher","story","fortune","play"])assert.match(home,new RegExp('crew-home-product crew-home-'+product));
 assert.match(home,/<HomeAtmosphere activeProduct=\{activeProduct\}\/>/);
 assert.match(home,/<BriefingPreview\/>/);
 assert.ok(home.indexOf('<BriefingPreview/>')>home.indexOf('<HomeShortsPreview/>'));
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
  for(const key of ["label","title","desc","cta"])assert.ok(locale.gamePick[key]);
  for(const key of ["play","friend","friendDesc"])assert.ok(locale.recent[key]);
 }
});
