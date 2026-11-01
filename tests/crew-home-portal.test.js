const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const read=p=>readFileSync(path.join(__dirname,"..",p),"utf8");
test("Crew homepage keeps a single chat portal before Shorts and exploration",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx");
 const portal=read("web-spa/src/pages/HomePortal.tsx");
 assert.ok(home.indexOf("<HomePortal/>")>=0);
 assert.ok(home.indexOf("<HomeShortsPreview/>")>home.indexOf("<HomePortal/>"));
 assert.ok(home.indexOf("<HomeShortsPreview/>")<home.indexOf('className="crew-home-search-summary"'));
 assert.match(portal,/const ZOE="\/friend\/live\?id=zoe"/);
 assert.match(portal,/to=\{destination\}/);
 assert.match(portal,/to=\{ZOE\}/);
 assert.match(portal,/to="\/teacher"/);
 assert.match(portal,/to="\/fortune"/);
 assert.equal((portal.match(/data-portal-tile/g)||[]).length,4);
 assert.doesNotMatch(portal,/crew-portal-picks|crew-portal-game-link|setTeacherProfile/);
 assert.match(portal,/to="\/games\/1a2b"/);
 assert.doesNotMatch(portal,/role="tablist"|role="tabpanel"/);
 assert.match(portal,/<PortalParticleField mode="chat"/);
});
test("Crew World Shorts still use the real feed and their story/chat paths",()=>{
 const shorts=read("web-spa/src/teacher/HomeShortsPreview.tsx");
 assert.match(shorts,/fetchShortsFeed\(/);
 assert.match(shorts,/shortsChatUrl\(post,"details"\)/);
 assert.match(shorts,/\/teacher\/shorts\?post=/);
 assert.match(shorts,/maxPosts=3/);
 assert.match(shorts,/\.slice\(0,maxPosts\)/);
 assert.match(shorts,/excludeFriendIds\.includes\(post\.friendId\)/);
});
test("Crew World animated portal respects reduced motion",()=>{
 const css=read("web-spa/src/pages/homePortal.css");
 const canvas=read("web-spa/src/pages/portalField.mjs");
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(canvas,/prefers-reduced-motion: reduce/);
 assert.match(canvas,/saveData/);
 assert.match(canvas,/IntersectionObserver/);
});


test("Crew World does not repeat its KV tabs in a separate quick-start carousel",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx");
 const css=read("web-spa/src/pages/homeWorld.css");
 const kv=home.indexOf("<HomePortal/>");
 const recent=home.indexOf('className="crew-home-continue"');
 const shorts=home.indexOf("<HomeShortsPreview/>");
 assert.ok(kv>=0&&kv<recent&&recent<shorts);
 assert.doesNotMatch(home,/HomeQuickCarousel|crew-home-launchpad/);
 assert.match(home,/recent\.to/);
 assert.doesNotMatch(css,/crew-home-carousel|crew-home-quick-actions/);
 assert.match(css,/\.crew-home-world \.crew-home-continue/);
});

test("Crew World hero stays on chat without rotation, tabs or a pause control",()=>{
 const portal=read("web-spa/src/pages/HomePortal.tsx");
 const css=read("web-spa/src/pages/homePortal.css");
 assert.match(portal,/data-mode="chat"/);
 assert.match(portal,/trial\.resolved&&trial\.enabled&&trial\.remaining===0/);
 assert.doesNotMatch(portal,/setMode|MODES|\},5000\)|role="tablist"|crew-portal-motion/);
 assert.doesNotMatch(css,/crew-portal-tabs|crew-portal-tab-progress|crew-portal-hint|crew-portal-motion/);
});

test("Mobile portal delays Canvas and recurring motion until eligible",()=>{
 const portal=read("web-spa/src/pages/HomePortal.tsx");
 const field=read("web-spa/src/pages/PortalParticleField.tsx");
 const css=read("web-spa/src/pages/homePortal.css");
 assert.match(portal,/useState\(true\); \/\/ Static SSR fallback/);
 assert.match(portal,/requestIdleCallback/);
 assert.match(portal,/IntersectionObserver/);
 assert.match(portal,/visibilitychange/);
 assert.match(portal,/\!canAnimate/);
 assert.match(portal,/enabled=\{fieldEverEnabled\|\|fieldEligible\}/);
 assert.match(portal,/if\(!reducedMotion&&!saveData\)setPaused\(false\)/);
 assert.doesNotMatch(portal,/coarse\.matches/);
 assert.match(portal,/fieldEligible=idleReady&&inViewport&&foreground/);
 assert.match(field,/createPortalField\(canvas,host,state\.focus/);
 assert.match(field,/setMode\(focus\)/);
 assert.match(field,/field\.setPaused\(state\.paused\)/);
 assert.match(field,/\[focus,enabled\]/);
 assert.match(field,/\[paused,enabled\]/);
 assert.match(field,/if\(!enabled\|\|!canvas\|\|!host\)return/);
 assert.doesNotMatch(css,/@keyframes crew-world-copy-in\{[^}]*filter:blur/);
 assert.match(css,/@media\(max-width:700px\)/);
});


test("Four tile links update decorative focus without delaying navigation",()=>{
 const portal=read("web-spa/src/pages/HomePortal.tsx");
 assert.match(portal,/useState<PortalMode>\("chat"\)/);
 assert.match(portal,/aria-label=\{t\("world.tilesLabel"\)\}/);
 assert.match(portal,/focus=\{focusedMode\}/);
 for(const mode of ["chat","learn","fortune","play"]){
  assert.match(portal,new RegExp('data-portal-tile data-mode="'+mode+'"'));
  for(const handler of ["onPointerEnter","onPointerDown","onFocus"])
   assert.ok(portal.includes(handler+'={()=>setFocusedMode("'+mode+'")}'),mode+":"+handler);
 }
 assert.doesNotMatch(portal,/preventDefault|useNavigate|aria-disabled/);
});

test("All eleven locales name the four entry tiles and retain legacy world copy",()=>{
 for(const lang of ["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"]){
  const world=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/home.json`)).world;
  assert.ok(typeof world.tilesLabel==="string"&&world.tilesLabel.trim(),lang+":tilesLabel");
  for(const mode of ["chat","teacher","fortune","play"])
   for(const key of ["name","sub"])assert.ok(typeof world.tiles?.[mode]?.[key]==="string"&&world.tiles[mode][key].trim(),lang+":"+mode+":"+key);
  for(const key of ["chatHeading","chatSubtitle","chatStart","chatWithZoe","chatExhausted","quickPicks","noVoice"])assert.ok(world[key],lang+":"+key);
 }
 const zh=JSON.parse(read("web-spa/src/i18n/locales/zh-TW/home.json")).world.tiles;
 assert.deepEqual(zh,{chat:{name:"聊天",sub:"和 Zoe 聊聊"},teacher:{name:"老師",sub:"練外語"},fortune:{name:"算命",sub:"今日運勢"},play:{name:"遊戲",sub:"1A2B"}});
});
