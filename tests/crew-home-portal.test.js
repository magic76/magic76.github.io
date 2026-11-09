const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const read=p=>readFileSync(path.join(__dirname,"..",p),"utf8");
test("Portal keeps the cloud-free live particle design and softly lights the inner field",()=>{
 const visual=read("web-spa/src/pages/PortalParticleField.tsx");
 const css=read("web-spa/src/pages/homePortal.css");
 const field=read("web-spa/src/pages/portalField.mjs");
 assert.doesNotMatch(visual,/crew-portal-core/);
 assert.match(css,/radial-gradient\(ellipse 28% 35%/);
 assert.match(css,/#12101c88 0%,#12101c53 48%/);
 assert.match(field,/const inner = noise\(i \+ count \* 3\) < \.14/);
 assert.match(field,/point\.inner \? \.55 : 1/);
 assert.match(field,/if \(point\.inner\) \{ target\[0\] \*= point\.inset/);
 assert.match(field,/!lowQuality && i % 137 === 0 && point\.size > \.35/);
 assert.doesNotMatch(field,/THREE|new WebGLRenderingContext/);
});

test("Crew homepage keeps one manual tab portal before Shorts and exploration",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx");
 const portal=read("web-spa/src/pages/HomePortal.tsx");
 assert.ok(home.indexOf("<HomePortal shortsFeed={shortsFeed}/>")>=0);
 assert.ok(home.indexOf("<HomeShortsPreview sharedFeed={shortsFeed} sharedStatus={shortsStatus}/>")>home.indexOf("<HomePortal shortsFeed={shortsFeed}/>"));
 assert.ok(home.indexOf("<HomeShortsPreview sharedFeed={shortsFeed} sharedStatus={shortsStatus}/>")<home.indexOf('className="crew-home-search-summary"'));
 assert.match(portal,/const ZOE="\/friend\/live\?id=zoe"/);
 for(const target of ["/teacher/live?lesson=daily_u1_l1","/fortune/reading?mode=tarot","/games/1a2b"])assert.ok(portal.includes('to:"'+target+'"'),target);
 assert.match(portal,/to=\{target\}/);
 assert.match(portal,/const target=mode==="chat"\?destination:mode==="learn"\?teacherDestination:/);
 assert.match(portal,/mode==="play"\?"\/games\/"\+gameId:current\.to/);
 assert.match(portal,/role="tablist"/);
 assert.match(portal,/role="tab"/);
 assert.match(portal,/role="tabpanel"/);
 assert.match(portal,/<PortalParticleField mode=\{mode\}/);
 assert.doesNotMatch(portal,/data-portal-tile|crew-portal-picks|crew-portal-game-link|setTeacherProfile/);
});
test("Crew World Shorts still use the real feed and their story/chat paths",()=>{
 const shorts=read("web-spa/src/teacher/HomeShortsPreview.tsx");
 assert.match(shorts,/fetchShortsFeed\(/);
 assert.match(shorts,/shortsChatUrl\(post,/);
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
 const kv=home.indexOf("<HomePortal shortsFeed={shortsFeed}/>");
 const recent=home.indexOf('className="crew-home-continue"');
 const shorts=home.indexOf("<HomeShortsPreview sharedFeed={shortsFeed} sharedStatus={shortsStatus}/>");
 assert.ok(kv>=0&&kv<recent&&recent<shorts);
 assert.doesNotMatch(home,/HomeQuickCarousel|crew-home-launchpad/);
 assert.match(home,/recent\.to/);
 assert.doesNotMatch(css,/crew-home-carousel|crew-home-quick-actions/);
 assert.match(css,/\.crew-home-world \.crew-home-continue/);
});

test("Crew World tabs select manually without rotation or a pause control",()=>{
 const portal=read("web-spa/src/pages/HomePortal.tsx");
 const css=read("web-spa/src/pages/homePortal.css");
 assert.match(portal,/data-mode=\{mode\}/);
 assert.match(portal,/useState<PortalMode>\("chat"\)/);
 assert.match(portal,/trial\.resolved&&trial\.enabled&&trial\.remaining===0/);
 assert.match(portal,/setMode/);
 assert.doesNotMatch(portal,/setInterval|5000|crew-portal-motion|crew-portal-hint/);
 assert.doesNotMatch(css,/crew-portal-tab-progress|crew-portal-hint|crew-portal-motion/);
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
 assert.match(field,/createPortalField\(canvas,host,state\.mode/);
 assert.match(field,/setMode\(mode\)/);
 assert.match(field,/field\.setPaused\(state\.paused\)/);
 assert.match(field,/\[mode,enabled\]/);
 assert.match(field,/\[paused,enabled\]/);
 assert.match(field,/if\(!enabled\|\|!canvas\|\|!host\)return/);
 assert.doesNotMatch(css,/@keyframes crew-world-copy-in\{[^}]*filter:blur/);
 assert.match(css,/@media\(max-width:700px\)/);
});


test("Four semantic tabs switch copy and one immediate CTA with a keyboard roving focus",()=>{
 const portal=read("web-spa/src/pages/HomePortal.tsx");
 assert.match(portal,/useState<PortalMode>\("chat"\)/);
 assert.match(portal,/aria-label=\{t\("world.tilesLabel"\)\}/);
 assert.match(portal,/data-mode=\{[^}]+\}/);
 for(const mode of ["chat","learn","fortune","play"])assert.ok(portal.includes('id:"'+mode+'"'),mode);
 assert.match(portal,/<button[^>]*type="button"/);
 for(const attribute of ["aria-selected","aria-controls","tabIndex","aria-labelledby"])assert.ok(portal.includes(attribute),attribute);
 for(const key of ["ArrowLeft","ArrowRight","Home","End"])assert.ok(portal.includes('"'+key+'"'),key);
 assert.equal((portal.match(/className="crew-portal-cta"/g)||[]).length,1);
 assert.match(portal,/useNavigate/);
 assert.doesNotMatch(portal,/aria-disabled|setTimeout\([^)]*launch/);
 assert.match(portal,/world\.modes\./);
});

test("All eleven locales name the four tabs, translate their copy and retain trial keys",()=>{
 for(const lang of ["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"]){
  const world=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/home.json`)).world;
  assert.ok(typeof world.tilesLabel==="string"&&world.tilesLabel.trim(),lang+":tilesLabel");
  for(const mode of ["chat","teacher","fortune","play"])
   for(const key of ["name","sub"])assert.ok(typeof world.tiles?.[mode]?.[key]==="string"&&world.tiles[mode][key].trim(),lang+":"+mode+":"+key);
  for(const mode of ["chat","learn","fortune","play"])
   for(const key of ["lead","before","accent","after","description","cta"])assert.equal(typeof world.modes?.[mode]?.[key],"string",lang+":"+mode+":"+key);
  assert.ok(world.intro?.trim(),lang+":intro");
  for(const key of ["chatHeading","chatSubtitle","chatStart","chatWithZoe","chatExhausted","quickPicks","noVoice"])assert.ok(world[key],lang+":"+key);
 }
 const zh=JSON.parse(read("web-spa/src/i18n/locales/zh-TW/home.json")).world.tiles;
 assert.deepEqual(zh,{chat:{name:"聊天",sub:"和 Zoe 聊聊"},teacher:{name:"老師",sub:"練外語"},fortune:{name:"算命",sub:"今日運勢"},play:{name:"遊戲",sub:"1A2B"}});
});


test("Home hero balances the first screen and reserves no bottom nav on desktop",()=>{
 const css=read("web-spa/src/pages/homePortal.css");
 assert.match(css,/display:grid;place-items:center/);
 assert.match(css,/100svh - 58px - var\(--nav-h\) - env\(safe-area-inset-bottom\)/);
 assert.match(css,/@media\(min-width:1100px\)\{\.crew-home-portal\{min-height:calc\(100vh - 58px\);min-height:calc\(100svh - 58px\)\}\}/);
 assert.match(css,/\.crew-portal-tab\{[^}]*min-height:(?:4[4-9]|[5-9][0-9])px/);
 assert.doesNotMatch(css,/padding-top:54px/);
});

test("Home stage layout is selected by CSS before hydration without reordering the invitation",()=>{
 const portal=read("web-spa/src/pages/HomePortal.tsx");
 const css=read("web-spa/src/pages/homePortal.css");
 const order=['className="crew-portal-intro"','className="crew-portal-kicker"',"<h1>",'className="crew-portal-description"','className="crew-portal-cta"','className="crew-portal-status-slot"','className="crew-portal-tabs"'].map(token=>portal.indexOf(token));
 assert.ok(order.every((offset,index)=>offset>=0&&(index===0||offset>order[index-1])),"Intro, one kicker, title, description, CTA, remaining slot and tabs retain DOM order");
 assert.equal((portal.match(/className="crew-portal-kicker"/g)||[]).length,1,"Do not duplicate the stage label");
 assert.match(css,/\.crew-portal-content\{position:relative;/);
 assert.doesNotMatch(css,/\.crew-portal-content\{[^}]*position:absolute/);
 assert.match(css,/@media\(min-width:1100px\),\(min-width:760px\) and \(orientation:landscape\) and \(min-height:501px\)/);
 for(const token of ["--portal-stage-x:.70","--portal-stage-y:.50","--portal-stage-split:1","place-items:center start","width:min(48vw,640px)","text-align:left","margin:28px 0 0"])
  assert.ok(css.includes(token),"Split layout token: "+token);
 assert.match(css,/\.crew-portal-kicker\{[^}]*position:absolute;[^}]*var\(--portal-stage-x\)[^}]*pointer-events:none/);
 assert.match(css,/\.crew-portal-fallback\{[^}]*var\(--portal-stage-x\)[^}]*var\(--portal-stage-y\)/,"SSR fallback uses the same stage center");
 assert.doesNotMatch(portal,/getBoundingClientRect|window\.innerWidth/,"Hydration must not decide the copy layout");
});

test("Portrait phones enlarge the ring and short landscape removes only the height floor",()=>{
 const css=read("web-spa/src/pages/homePortal.css");
 assert.match(css,/@media\(max-width:599px\)\{\.crew-home-portal\{[^}]*--portal-stage-y:\.47;[^}]*--portal-stage-scale-w:\.60;[^}]*--portal-stage-tall:1\.62/);
 const compact=css.slice(css.indexOf("@media(orientation:landscape) and (max-height:500px) and (min-width:560px)"));
 assert.ok(compact.startsWith("@media(orientation:landscape) and (max-height:500px) and (min-width:560px)"));
 assert.match(compact,/min-height:calc\(100svh - 58px - var\(--nav-h\) - env\(safe-area-inset-bottom\)\)/);
 assert.doesNotMatch(compact,/min-height:max\(/,"Compact hero cannot retain a portrait height floor");
 for(const token of ["--portal-stage-scale-w:.25","--portal-stage-scale-h:.62","width:52vw","padding:10px 0","font-size:26px;line-height:1.25;margin:0 0 12px",".crew-portal-intro,.crew-portal-description{display:none}",".crew-portal-status-slot{min-height:0}","margin:10px 0 0"])
  assert.ok(compact.includes(token),"Compact layout token: "+token);
 assert.doesNotMatch(compact,/crew-portal-remaining\{[^}]*display:none/,"Resolved remaining-trial status stays visible");
});
