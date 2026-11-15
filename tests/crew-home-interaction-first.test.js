const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");

test("Home World prioritizes first-run access before Shorts and daily games",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx");
 const portal=read("web-spa/src/pages/HomePortal.tsx");
 const hero=home.indexOf("<HomePortal shortsFeed={shortsFeed}/>"),start=home.indexOf('className="crew-home-start"');
 const shorts=home.indexOf("<HomeShortsPreview sharedFeed={shortsFeed} sharedStatus={shortsStatus}/>"),games=home.indexOf('className="crew-home-game-pick"');
 assert.ok(hero>=0&&hero<start&&start<shorts&&shorts<games);
 assert.match(portal,/const ZOE="\/friend\/live\?id=zoe"/);
 const rail=read("web-spa/src/pages/HomeModeRail.tsx");
 for(const path of ["/teacher/live?lesson=daily_u1_l1","/fortune/reading?mode=tarot","/games/1a2b"])assert.ok(rail.includes('to:"'+path+'"'),path);
 assert.match(home,/to=\{"\/games\/"\+featuredGame\}/);
 assert.match(home,/DAILY_GAMES=\["1a2b","connect4","reversi"\]/);
 assert.match(home,/taipeiDay%DAILY_GAMES\.length/);
 assert.match(home,/import \{HomeShortsPreview\} from "\.\.\/teacher\/HomeShortsPreview"/);
});

test("Home preserves portal, Timeline, briefing and collapsed Play Store without redundant cards",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx"),portal=read("web-spa/src/pages/HomePortal.tsx");
 assert.doesNotMatch(home,/crew-home-product-grid|crew-home-products/);
 assert.match(portal,/<PortalParticleField mode=\{mode\}/);
 assert.doesNotMatch(home,/<BriefingPreview\/>/);
 assert.match(home,/crew-home-world-explore-card/);
 assert.match(home,/to="\/timeline"/);
 assert.doesNotMatch(home,/assets\/timeline\/mira-/);
 assert.ok(home.indexOf("<HomeShortsPreview sharedFeed={shortsFeed} sharedStatus={shortsStatus}/>")>home.indexOf("<HomePortal shortsFeed={shortsFeed}/>"));
 assert.match(home,/<details className="crew-home-android">/);
});

test("Recent game and friend navigation is recorded without message content",()=>{
 const app=read("web-spa/src/App.tsx"),home=read("web-spa/src/pages/HomePage.tsx");
 assert.match(app,/crew_home_last_activity_v1/);
 assert.match(app,/new URLSearchParams\(search\)\.get\("id"\)/);
 assert.match(home,/GAME_IDS/);
 assert.match(home,/home:playHub\.games\./);
 const en=JSON.parse(read("web-spa/src/i18n/locales/en/home.json"));
 assert.ok(en.playHub.games["1a2b"].title);
 assert.match(home,/crew_home_last_activity_v1/);
 assert.match(home,/readUnfinishedNumberRound\(\)/);
 assert.match(home,/readLatestFriendResume\(\)/);
 assert.match(home,/&from=home&chat=text/);
 assert.match(home,/resume-1a2b/);
 assert.match(home,/recents\.length\|\|creatureProgress\?<section className="crew-home-continue"/);
 assert.ok(home.indexOf('<HomePortal shortsFeed={shortsFeed}/>')<home.indexOf('className="crew-home-continue"'));
 assert.doesNotMatch(home,/localStorage\.setItem\(LAST_ACTIVITY_KEY[^\n]*(transcript|messages|turns)/i);
 assert.doesNotMatch(app,/localStorage\.setItem\("crew_home_last_activity_v1"[^\n]*(transcript|messages|turns)/i);
});

test("Interaction-first homepage copy is translated",()=>{
 const en=JSON.parse(read("web-spa/src/i18n/locales/en/home.json"));
 const zh=JSON.parse(read("web-spa/src/i18n/locales/zh-TW/home.json"));
 for(const locale of [en,zh]){
  for(const key of ["label","chat","chatDesc","play","playDesc"])assert.ok(locale.actions[key]);
  for(const key of ["chatHeading","chatSubtitle","chatStart","chatWithZoe","chatExhausted","quickPicks","noVoice"])assert.ok(locale.world[key]);
  assert.ok(locale.world.modes.learn.description);
  assert.equal(locale.portal.modes,undefined);
  assert.ok(locale.portal.headingLead&&locale.portal.headingAccent);
  for(const key of ["label","title","desc","cta"])assert.ok(locale.gamePick[key]);
  for(const key of ["play","friend","friendDesc"])assert.ok(locale.recent[key]);
  for(const key of ["friend","lastLine","game","gameDesc"])assert.equal(typeof locale.resume[key],"string");
 }
});


test("1A2B resumes only a validated unfinished local round; finishing or restarting clears it",()=>{
 const game=read("web-spa/src/games/NumberGamePage.tsx");
 const helper=read("web-spa/src/games/unfinishedNumberRound.ts");
 assert.match(game,/readUnfinishedNumberRound\(\)/);
 assert.match(game,/resume\?\.secret/);
 assert.match(game,/resume\?\.history/);
 assert.match(game,/saveUnfinishedNumberRound\(\{mode,digits,dailyDate,secret,history,at:Date\.now\(\)\}\)/);
 assert.match(game,/if\(finished\)\{clearUnfinishedNumberRound\(\);return\}/);
 assert.match(game,/const discardResume=\(\)=>\{clearUnfinishedNumberRound\(\);setResumed\(null\)\}/);
 assert.match(helper,/crew_1a2b_unfinished_v1/);
 assert.doesNotMatch(helper,/crew_1a2b_record_v1_/);
});
